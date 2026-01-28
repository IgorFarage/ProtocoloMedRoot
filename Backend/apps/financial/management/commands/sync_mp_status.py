import logging
import time
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.financial.models import Transaction
from apps.store.services import SubscriptionService
from apps.accounts.services import BitrixService
from apps.financial.services import AsaasService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza status do Mercado Pago para Transações Pendentes (Recuperador de Webhook Perdido)'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Apenas simula a verificação')
        parser.add_argument('--hours', type=int, default=24, help='Olhar transações das últimas X horas (Default: 24)')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        hours = options['hours']
        
        self.stdout.write("🛡️ Iniciando Robô de Reconciliação (Asaas + Mercado Pago)...")
        
        # 1. Filtra Transações Pendentes Recentes
        limit_date = timezone.now() - timedelta(hours=hours)
        
        # Pega pendentes que tenham ALGUM ID externo
        from django.db.models import Q
        pending_transactions = Transaction.objects.filter(
            status=Transaction.Status.PENDING,
            created_at__gte=limit_date
        ).filter(
            Q(mercado_pago_id__isnull=False) | Q(asaas_payment_id__isnull=False)
        )

        count = pending_transactions.count()
        self.stdout.write(f"🔍 Encontradas {count} transações pendentes nas últimas {hours}h.")

        if count == 0:
            return

        asaas_service = AsaasService()
        recovered_count = 0

        for transaction in pending_transactions:
            user_email = transaction.user.email
            self.stdout.write(f"   🔄 Verificando Transação {transaction.id} ({user_email})...")

            try:
                real_status = None
                payment_json = {}

                # --- STRATEGY: ASAAS ---
                if transaction.asaas_payment_id:
                    self.stdout.write(f"      [Asaas] ID: {transaction.asaas_payment_id}")
                    # Buscar no Asaas (Endpoint: payments/{id})
                    resp = asaas_service._request("GET", f"payments/{transaction.asaas_payment_id}")
                    if resp and 'id' in resp:
                        status_asaas = resp.get('status')
                        payment_json = resp
                        # Map Asaas Status -> Local (Centralized)
                        real_status = AsaasService.map_status(status_asaas)
                        
                        # Fix: map_status might return 'pending' for 'PENDING', which is not a "final" status for recovery purposes
                        # unless we want to confirm it is pending.
                        # But the logic below checks `if real_status == 'approved'`.
                        # 'OVERDUE' -> REJECTED.
                        
                    else:
                         self.stdout.write(self.style.WARNING("      ⚠️ Asaas ID não encontrado na API."))


                # --- STRATEGY: MERCADO PAGO (LEGACY) ---
                elif transaction.mercado_pago_id:
                    self.stdout.write(f"      [MP] ID: {transaction.mercado_pago_id}")
                    import mercadopago
                    sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
                    payment_response = sdk.payment().get(int(transaction.mercado_pago_id))
                    
                    if payment_response["status"] == 200:
                        payment_data = payment_response["response"]
                        status_mp = payment_data.get("status")
                        payment_json = payment_data
                        
                        if status_mp in ['approved', 'authorized']:
                            real_status = 'approved'
                        elif status_mp in ['cancelled', 'rejected']:
                            real_status = 'rejected'
                
                # --- DECISION ---
                # Check for Approved (String or Enum)
                if str(real_status) == str(Transaction.Status.APPROVED):
                    self.stdout.write(self.style.SUCCESS(f"      ✅ ACHOU! Status Real: {real_status}"))
                    
                    if dry_run: continue

                    # UPDATE LOCAL
                    transaction.status = Transaction.Status.APPROVED
                    transaction.save()
                    
                    # ATIVA ASSINATURA
                    SubscriptionService.activate_subscription_from_transaction(transaction)
                    self.stdout.write("      📦 Assinatura Ativada.")

                    # BITRIX SYNC
                    if transaction.bitrix_sync_status != 'synced':
                        self.stdout.write("      🚀 Disparando Sync Bitrix...")
                        # Tenta recuperar produtos do snapshot ou fallback
                        products_list = []
                        if transaction.mp_metadata and isinstance(transaction.mp_metadata, dict):
                            products_list = transaction.mp_metadata.get('original_products', [])
                        
                        # Fallback
                        if not products_list:
                            from apps.accounts.models import UserQuestionnaire
                            last_q = UserQuestionnaire.objects.filter(user=transaction.user).order_by('-created_at').first()
                            if last_q:
                                protocol = BitrixService.generate_protocol(last_q.answers)
                                products_list = protocol.get('products', [])
                        
                        # Prepare Deal Payload
                        p_id = transaction.asaas_payment_id or transaction.mercado_pago_id
                        
                        deal_id = BitrixService.prepare_deal_payment(
                            user=transaction.user,
                            products_list=products_list,
                            plan_title=f"ProtocoloMed - {transaction.plan_type}",
                            total_amount=float(transaction.amount),
                            answers=None,
                            payment_data={
                                "status": "approved",
                                "id": p_id,
                                "asaas_payment_id": transaction.asaas_payment_id,
                                "mercado_pago_id": transaction.mercado_pago_id
                            }
                        )
                        
                        if deal_id:
                            transaction.bitrix_deal_id = str(deal_id)
                            transaction.bitrix_sync_status = 'synced'
                            transaction.save()
                            self.stdout.write("      ✅ Bitrix Sincronizado.")
                    
                    recovered_count += 1

                elif str(real_status) == str(Transaction.Status.REJECTED) or str(real_status) == str(Transaction.Status.CANCELLED):
                    if not dry_run:
                        transaction.status = real_status # Salva o status exato devolvido (REJECTED/CANCELLED)
                        transaction.save()
                    self.stdout.write(f"      ❌ Rejeitado/Cancelado na Origem ({real_status}).")

                else:
                    self.stdout.write(f"      💤 Ainda Pendente. Status Real: {real_status} (Asaas: {status_asaas if 'status_asaas' in locals() else '?'})")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Erro ao processar: {e}"))
            
            # Rate limit friendly
            time.sleep(0.5)

        self.stdout.write(self.style.SUCCESS(f"🏁 Fim. Recuperados: {recovered_count}/{count}"))
