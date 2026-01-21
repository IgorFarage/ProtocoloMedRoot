
from django.core.management.base import BaseCommand
from apps.financial.models import Transaction
from apps.accounts.models import User

class Command(BaseCommand):
    help = 'Verifica o status de sincronização dos dados locais com o Bitrix'

    def handle(self, *args, **options):
        self.stdout.write("🔍 Iniciando Verificação de Sincronização Local...")
        
        # 1. Transações Aprovadas mas não marcadas como Synced
        pending_sync = Transaction.objects.filter(
            status=Transaction.Status.APPROVED
        ).exclude(bitrix_sync_status='synced')

        count_pending = pending_sync.count()
        
        self.stdout.write(f"\n📊 Transações Aprovadas Pendentes de Sync: {count_pending}")
        if count_pending > 0:
            for t in pending_sync:
                self.stdout.write(f"   ❌ [ID: {t.id}] User: {t.user.email} | Status: {t.bitrix_sync_status}")

        # 2. Transações marcadas como Synced, mas sem Deal ID (Inconsistência)
        inconsistent = Transaction.objects.filter(
            status=Transaction.Status.APPROVED,
            bitrix_sync_status='synced',
            bitrix_deal_id__isnull=True
        )
        
        count_inconsistent = inconsistent.count()
        self.stdout.write(f"\n⚠️ Transações 'Synced' sem Deal ID: {count_inconsistent}")
        for t in inconsistent:
             self.stdout.write(f"   ⚠️ [ID: {t.id}] User: {t.user.email}")

        # 3. Usuários sem ID Bitrix (mas com transação aprovada)
        # Isso indica que falhou na criação do Lead/Contato
        users_needing_bitrix = User.objects.filter(
            transactions__status=Transaction.Status.APPROVED,
            id_bitrix__isnull=True
        ).distinct()
        
        count_users = users_needing_bitrix.count()
        self.stdout.write(f"\n👤 Usuários com Compra mas sem ID Bitrix: {count_users}")
        for u in users_needing_bitrix:
            self.stdout.write(f"   👤 {u.email} (Plan: {u.current_plan})")

        self.stdout.write("\n🏁 Verificação Concluída.")
