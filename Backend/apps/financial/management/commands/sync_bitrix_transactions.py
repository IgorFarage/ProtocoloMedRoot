from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction as db_transaction
from apps.financial.models import Transaction
from apps.accounts.services import BitrixService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza Batch de transações com Bitrix (Scalable Pattern).'

    def handle(self, *args, **options):
        if not BitrixService:
            self.stdout.write(self.style.ERROR("BitrixService não disponível."))
            return

        # 1. Busca Snipers (Micro-Batch + Lock)
        # Pega apenas 50 registros que precisam de atenção e BLOQUEIA eles para ninguém mais mexer.
        with db_transaction.atomic():
            transactions_qs = Transaction.objects.filter(
                bitrix_sync_status__in=['pending', 'failed'],
                bitrix_sync_attempts__lt=10,
                status=Transaction.Status.APPROVED 
            ).select_related('user').select_for_update(skip_locked=True).order_by('created_at')[:50]
            
            transactions = list(transactions_qs)

        if not transactions:
            self.stdout.write("Nenhuma transação pendente neste batch.")
            return

        self.stdout.write(f"🚀 Batch Iniciado: {len(transactions)} transações...")

        for transaction in transactions:
            self.stdout.write(f"👉 ID {transaction.id} ({transaction.user.email})...")
            
            # Incrementa tentativas imediatamente
            transaction.bitrix_sync_attempts += 1
            transaction.last_sync_attempt = timezone.now()
            transaction.save(update_fields=['bitrix_sync_attempts', 'last_sync_attempt'])

            try:
                # 2. Recuperar Contexto
                meta = transaction.mp_metadata if isinstance(transaction.mp_metadata, dict) else {}
                address_data = meta.get("snapshot_address", {})
                phone = meta.get("snapshot_phone", "")
                cpf = meta.get("snapshot_cpf", "")
                original_products = meta.get("original_products", [])
                user = transaction.user

                # 3. Auto-Cura (Self-Healing) do Contato
                if not user.id_bitrix:
                    self.stdout.write("   👤 Criando Lead (Recuperação)...")
                    lead_id = BitrixService.create_lead(user, meta.get("questionnaire_snapshot"), address_data)
                    if lead_id:
                        user.id_bitrix = str(lead_id)
                        user.save(update_fields=['id_bitrix'])
                    else:
                        raise Exception("Falha crítica: Sem ID Bitrix.")

                # Atualiza dados para garantir aceite do Deal
                if cpf or phone:
                    BitrixService.update_contact_data(user.id_bitrix, cpf=cpf, phone=phone)
                if address_data:
                    BitrixService.update_contact_address(user.id_bitrix, address_data)

                # 4. Preparar Produtos
                from apps.accounts.config import BitrixConfig
                all_plan_ids = BitrixConfig.PLAN_IDS.values()
                final_products = [p for p in original_products if int(p.get('id', 0)) not in all_plan_ids]
                
                if hasattr(BitrixService, 'get_plan_details'):
                   plan_item = BitrixService.get_plan_details(transaction.plan_type)
                   if plan_item: final_products.append(plan_item)

                # 5. Envio do Deal (Forçando Status Aprovado)
                real_status = 'approved' if transaction.status == Transaction.Status.APPROVED else 'pending'
                mp_id = transaction.mercado_pago_id or meta.get("payment_response", {}).get('id')
                
                payment_info = {
                    "id": mp_id,
                    "date_created": str(transaction.created_at),
                    "status": real_status
                }

                deal_id = BitrixService.prepare_deal_payment(
                    user, final_products, f"ProtocoloMed - {transaction.plan_type}",
                    float(transaction.amount), meta.get("questionnaire_snapshot"), payment_data=payment_info
                )

                if deal_id:
                    transaction.bitrix_deal_id = str(deal_id)
                    transaction.bitrix_sync_status = 'synced'
                    self.stdout.write(self.style.SUCCESS(f"   ✅ SUCESSO! Deal: {deal_id}"))
                else:
                    raise Exception("Bitrix retornou None para Deal ID.")

            except Exception as e:
                transaction.bitrix_sync_status = 'failed'
                self.stdout.write(self.style.ERROR(f"   ❌ Erro: {str(e)}"))
            
            transaction.save(update_fields=['bitrix_sync_status', 'bitrix_deal_id'])
