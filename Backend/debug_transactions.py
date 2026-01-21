
import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.financial.models import Transaction

def check_user_transactions(email):
    try:
        user = User.objects.get(email=email)
        print(f"👤 User: {user.email}")
        print(f"📋 Current Plan: {user.current_plan}")
        print("-" * 40)
        
        transactions = Transaction.objects.filter(user=user).order_by('-created_at')
        if not transactions.exists():
            print("❌ Nenhuma transação encontrada.")
            return

        print(f"💰 Transações ({transactions.count()}):")
        for t in transactions:
            print(f"[{t.created_at.strftime('%d/%m %H:%M:%S')}] ID: {t.id} | Plan: {t.plan_type} | Amt: {t.amount} | Status: {t.status} | Bitrix Sync: {t.bitrix_sync_status}")
            meta = t.mp_metadata or {}
            products = meta.get('original_products', [])
            print(f"   📦 Produtos: {len(products)} itens")
            for p in products:
                print(f"      - {p.get('name')} ({p.get('id')})")
            print("-" * 20)

    except User.DoesNotExist:
        print(f"❌ Usuário {email} não encontrado.")

if __name__ == "__main__":
    check_user_transactions('plano41@teste.com')
