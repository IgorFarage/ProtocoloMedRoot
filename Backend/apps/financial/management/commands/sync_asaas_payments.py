
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.financial.models import Transaction, Coupon
from apps.financial.services import AsaasService
from apps.store.services import SubscriptionService
from apps.medical.models import Appointments
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza pagamentos pendentes com Asaas (Redundância de Webhook)'

    def handle(self, *args, **options):
        self.stdout.write("🔄 Iniciando sincronização de pagamentos Asaas...")
        
        # 1. Definir Janela de Tempo (2min atrás até 24h atrás)
        # 2min de grace period para dar chance ao webhook chegar primeiro
        now = timezone.now()
        time_threshold = now - timedelta(minutes=2)
        time_limit = now - timedelta(hours=24)
        
        pending_txs = Transaction.objects.filter(
            status=Transaction.Status.PENDING,
            created_at__lte=time_threshold,
            created_at__gte=time_limit
        ).exclude(asaas_payment_id__isnull=True).exclude(asaas_payment_id='')
        
        count = pending_txs.count()
        self.stdout.write(f"🔎 Encontradas {count} transações pendentes para verificação.")

        asaas = AsaasService()
        updated = 0
        cancelled = 0

        for tx in pending_txs:
            try:
                self.stdout.write(f"   Checking {tx.external_reference} (ID: {tx.asaas_payment_id})...", ending='')
                
                # [PIX EXPIRATION LOGIC - 10 MIN]
                if tx.payment_type == Transaction.PaymentType.PIX and tx.status == Transaction.Status.PENDING:
                    expiration_time = tx.created_at + timedelta(minutes=10)
                    if timezone.now() > expiration_time:
                         self.stdout.write(f" ⏳ Pix Expirado (>10min). Cancelando no Asaas...", ending='')
                         if asaas.cancel_payment(tx.asaas_payment_id):
                              tx.status = Transaction.Status.CANCELLED
                              tx.save()
                              self._handle_cancellation(tx) # Libera Slot
                              cancelled += 1
                              self.stdout.write(" 🚫 Cancelado com sucesso.")
                              continue # Skip status check
                         else:
                              self.stdout.write(" ⚠️ Falha ao cancelar (já inexistente?).")

                new_status, response = asaas.check_payment_status(tx.asaas_payment_id)
                
                if not new_status:
                    self.stdout.write(" ❌ Erro API")
                    continue
                
                if new_status != tx.status:
                    old_status = tx.status
                    tx.status = new_status
                    tx.save()
                    self.stdout.write(f" ✅ ALTERADO: {old_status} -> {new_status}")
                    updated += 1
                    
                    # LOGIC: Approved
                    if new_status == Transaction.Status.APPROVED:
                        self._handle_approval(tx)
                    
                    # LOGIC: Rejected/Refunded
                    elif new_status in [Transaction.Status.REJECTED, Transaction.Status.REFUNDED, Transaction.Status.CANCELLED]:
                         self._handle_cancellation(tx)

                else:
                    self.stdout.write(f" 💤 Sem mudança ({new_status})")
                    
                    # LOGIC: Check Pix Expiry (Overdue)
                    # Se Asaas retornar OVERDUE, o map_status já converteu para REJECTED acima.
                    # Mas e se o map_status retornar PENDING mas a data de vencimento já passou muito?
                    # O Asaas geralmente muda para OVERDUE automaticamente.
                    pass

            except Exception as e:
                self.stdout.write(f" ❌ Erro Interno: {e}")

        self.stdout.write(f"🏁 Sincronização concluída. Atualizados: {updated}. Cancelados: {cancelled}.")

    def _handle_approval(self, tx):
        """
        Reaproveita lógica de ativação (duplicada da View de Webhook, idealmente mover para Service)
        """
        try:
            # 1. Ativar Assinatura (se houver)
            SubscriptionService.activate_subscription_from_transaction(tx)
            
            # 2. Confirmar Agendamento (se houver)
            if tx.mp_metadata and 'appointment_id' in tx.mp_metadata:
                appt_id = tx.mp_metadata['appointment_id']
                try:
                    appt = Appointments.objects.get(id=appt_id)
                    if appt.status == 'waiting_payment':
                        appt.status = 'scheduled'
                        appt.save()
                        logger.info(f"      ✅ Appointment {appt_id} confirmed by Watcher.")
                except Appointments.DoesNotExist:
                    pass
            
            # 3. Incrementar Cupom (Se ainda não foi) -> A view já incrementa no Create, 
            # mas se estivesse Pending, ok. Se falhasse, estornaria?
            # Por simplicidade, assumimos que o create inicial já contou.
            
            # 4. Sync Bitrix (Tentar novamente se falhou)
            if tx.bitrix_sync_status != 'synced':
                 # Tentar sync...
                 pass

        except Exception as e:
            logger.error(f"Erro ao processar aprovação no Watcher: {e}")

    def _handle_cancellation(self, tx):
        """
        Libera slots se o pagamento expirou/cancelou
        """
        try:
            # 1. Cancelar Agendamento
            if tx.mp_metadata and 'appointment_id' in tx.mp_metadata:
                appt_id = tx.mp_metadata['appointment_id']
                try:
                    appt = Appointments.objects.get(id=appt_id)
                    if appt.status == 'waiting_payment':
                        appt.status = 'cancelled' # Libera o slot? Depende da lógica de services.py check (filter scheduled only)
                        # Sim, services.py filtra status='scheduled' para bloqueio. 'cancelled' é livre.
                        appt.save()
                        logger.info(f"      🚫 Appointment {appt_id} cancelled by Watcher (Payment Rejected).")
                except Appointments.DoesNotExist:
                    pass
        except Exception as e:
            logger.error(f"Erro ao processar cancelamento no Watcher: {e}")
