
import os
import django
import sys
import requests
import json

# Setup Django Environment
sys.path.append('/home/ubuntu/Projetos/ProtocoloMedRoot/Backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User
from apps.accounts.config import BitrixConfig

from apps.accounts.services import BitrixService

def debug_last_users(limit=5):
    print(f"🔍 DEBUG: Analisando os últimos {limit} usuários via BitrixService...")
    users = User.objects.all().order_by('-last_login')[:limit]
    
    for user in users:
        print(f"\n👤 Usuário: {user.email} (ID Local: {user.id})")
        print(f"   - ID Bitrix: {user.id_bitrix}")
        print(f"   - Plano Antes: {user.current_plan}")
        
        if not user.id_bitrix:
            print("   ⚠️ Sem ID Bitrix vinculado.")
            continue

        try:
            # CHAMADA REAL DO SERVIÇO
            detected_plan = BitrixService.check_and_update_user_plan(user)
            
            user.refresh_from_db()
            print(f"   🎯 Plano Detectado pelo Serviço: {detected_plan}")
            print(f"   cd Plano Depois (DB): {user.current_plan}")
            
            if user.current_plan == detected_plan and detected_plan != 'none':
                 print("   ✅ SUCESSO: O serviço atualizou o plano corretamente.")
            elif user.current_plan == detected_plan:
                 print("   ℹ️ Neutro: O plano continua o mesmo.")
            else:
                 print("   ❌ FALHA: O serviço retornou um valor mas o DB difere (ou falha ao salvar).")

        except Exception as e:
            print(f"   ❌ Erro ao executar BitrixService: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_last_users()
