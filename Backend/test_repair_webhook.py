
import os
import sys
import django
from unittest.mock import MagicMock, patch

sys.path.append('/home/ubuntu/Projetos/ProtocoloMedRoot/Backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.services import BitrixService

# Mock Deal ID (plano25 - Deal 446)
DEAL_ID = "446"

def test_webhook_repair():
    print("🧪 Teste de Webhook Bidirecional (Simulação)")
    
    # Payload que o Bitrix enviaria
    payload = {
        'event': 'ONCRMDEALUPDATE',
        'data[FIELDS][ID]': DEAL_ID
    }
    
    # Mock do _safe_request para retornar um Deal "Zerado/Errado"
    # Assim o script deve perceber a inconsistência com a transação local e corrigir
    
    real_safe_request = BitrixService._safe_request
    
    def side_effect(method, endpoint, **kwargs):
        # Se for pedir o Deal 446, devolvemos dados "errados" para forçar o repair
        if endpoint == 'crm.deal.get.json' and kwargs.get('params', {}).get('id') == DEAL_ID:
            print("   🎭 Mocking Bitrix: Retornando Deal Zerado (Opportunity=0)")
            return {
                'result': {
                    'ID': DEAL_ID,
                    'TITLE': 'Deal de Teste Mockado',
                    'OPPORTUNITY': 0, # ERRO: Deveria ser 56.83
                    'CONTACT_ID': '350', # ID válido do plano25
                    'UF_CRM_1767290000': 'Pendente', # ERRO: Deveria ser Aprovado
                    'STAGE_ID': 'NEW'
                }
            }
        
        # Se for o update/repair, logamos que foi chamado
        if endpoint == 'crm.deal.productrows.set.json':
            print("   ✅ CALL DETECTADO: crm.deal.productrows.set (Restaurando Produtos!)")
            # Retorna sucesso fake
            return {'result': True}

        if endpoint == 'crm.deal.update.json':
            print(f"   ✅ CALL DETECTADO: crm.deal.update (Restaurando Campos!)")
            return {'result': True}
            
        # Para outras chamadas (ex: lead.get), poderiamos deixar passar ou mockar. 
        # Vamos deixar passar para calls de leitura simples ou usar mock
        return {'result': {}}

    with patch.object(BitrixService, '_safe_request', side_effect=side_effect):
        print("   🚀 Chamando process_incoming_webhook...")
        processed = BitrixService.process_incoming_webhook(payload)
        
        if processed:
            print("   ✅ Resultado: Webhook processado (Repair acionado).")
        else:
            print("   ❌ Falha: Webhook não processou ou não acionou repair.")

if __name__ == "__main__":
    test_webhook_repair()
