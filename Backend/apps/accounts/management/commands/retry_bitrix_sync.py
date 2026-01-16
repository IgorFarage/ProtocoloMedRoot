import logging
import time
from django.core.management.base import BaseCommand
from apps.financial.models import Transaction
from apps.accounts.services import BitrixService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Retries failed Bitrix synchronizations for approved transactions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email do usuário para forçar sincronização (recuperação manual)',
        )

    def handle(self, *args, **options):
        email_target = options.get('email')
        
        self.stdout.write("🛡️ Iniciando ProtocoloMed Auto-Healer (Bitrix Sync)...")
        
        # Base Query
        transactions = Transaction.objects.filter(
            status=Transaction.Status.APPROVED
        )

        if email_target:
            self.stdout.write(f"🎯 Modo Manual: Forçando sync para {email_target}")
            transactions = transactions.filter(user__email=email_target).order_by('-created_at')[:5] # Pega as ultimas 5
        else:
            # Modo Automático (apenas falhas)
            transactions = transactions.exclude(bitrix_sync_status='synced')

        count = transactions.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("✅ Nenhuma transação encontrada para os critérios."))
            return

        self.stdout.write(f"⚠️ Encontradas {count} transações para processar.")

        success_count = 0
        
        for transaction in transactions:
            self.stdout.write(f"🔄 Processando Transação ID {transaction.id} ({transaction.user.email})...")
            
            try:
                # Usa a nova sincronização completa
                results = BitrixService.sync_transaction_full(transaction)
                
                if results['deal_id']:
                    success_count += 1
                    msg = f"   ✅ Sucesso! Deal {results['deal_id']}."
                    if results['contact_created']: msg += " (Lead Criado)"
                    if results['contact_updated']: msg += " (Contato Atualizado)"
                    if results['address_updated']: msg += " (Endereço Atualizado)"
                    self.stdout.write(self.style.SUCCESS(msg))
                else:
                    errors = ", ".join(results.get('errors', []))
                    self.stdout.write(self.style.ERROR(f"   ❌ Falha: {errors}"))

                # Delay gentil para não estourar Rate Limit
                time.sleep(1)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ Erro Crítico: {e}"))

        self.stdout.write(self.style.SUCCESS(f"🏁 Processamento concluído. {success_count}/{count} processados com sucesso."))
