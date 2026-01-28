import logging
import time
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.financial.models import Transaction
from apps.store.services import SubscriptionService
from apps.accounts.services import BitrixService
from apps.financial.services import FinancialService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza status do Mercado Pago para Transações Pendentes (Recuperador de Webhook Perdido)'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Apenas simula a verificação')
        parser.add_argument('--hours', type=int, default=24, help='Olhar transações das últimas X horas (Default: 24)')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        hours = options['hours']
        
        self.stdout.write("🛡️ Iniciando Robô de Reconciliação (Mercado Pago)...")
        
        # 1. Filtra Transações Pendentes Recentes
        limit_date = timezone.now() - timedelta(hours=hours)
        pending_transactions = Transaction.objects.filter(
            status=Transaction.Status.PENDING,
            created_at__gte=limit_date,
            mercado_pago_id__isnull=False
        ).exclude(mercado_pago_id='')

        count = pending_transactions.count()
        self.stdout.write(f"🔍 Encontradas {count} transações pendentes nas últimas {hours}h.")

        if count == 0:
            return

        financial_service = FinancialService()
        recovered_count = 0

        for transaction in pending_transactions:
            mp_id = transaction.mercado_pago_id
            user_email = transaction.user.email
            
            self.stdout.write(f"   🔄 Verificando MP ID {mp_id} ({user_email})...")

            try:
                # Consulta API do MP
                # Nota: FinancialService deve ter método get_payment ou usamos SDK direto aqui
                # Vamos instanciar SDK direto para garantir ou usar método se existir
                import mercadopago
                sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
                payment_response = sdk.payment().get(int(mp_id))
                
                if payment_response["status"] != 200:
                    self.stdout.write(self.style.WARNING(f"      ⚠️ Erro API MP: {payment_response['status']}"))
                    continue

                payment_data = payment_response["response"]
                status_mp = payment_data.get("status")
                
                # Check discrepancy
                if status_mp in ['approved', 'authorized']:
                    self.stdout.write(self.style.SUCCESS(f"      ✅ ACHOU! Status Real: {status_mp} (Local estava Pendente)"))
                    
                    if dry_run:
                        continue

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

                        deal_id = BitrixService.prepare_deal_payment(
                            user=transaction.user,
                            products_list=products_list,
                            plan_title=f"ProtocoloMed - {transaction.plan_type}",
                            total_amount=float(transaction.amount),
                            answers=None,
                            payment_data=payment_data
                        )
                        
                        if deal_id:
                            transaction.bitrix_deal_id = str(deal_id)
                            transaction.bitrix_sync_status = 'synced'
                            transaction.save()
                            self.stdout.write("      ✅ Bitrix Sincronizado.")
                    
                    recovered_count += 1

                elif status_mp in ['cancelled', 'rejected']:
                    if not dry_run:
                        transaction.status = Transaction.Status.REJECTED
                        transaction.save()
                    self.stdout.write(f"      ❌ Cancelado no MP. Atualizado localmente.")

                else:
                    self.stdout.write(f"      💤 Ainda Pendente no MP ({status_mp}).")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Erro ao processar: {e}"))
            
            # Rate limit friendly
            time.sleep(0.5)

        self.stdout.write(self.style.SUCCESS(f"🏁 Fim. Recuperados: {recovered_count}/{count}"))
