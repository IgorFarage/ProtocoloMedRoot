
import os
import sys
import django
import json

# Setup Django Environment
sys.path.append('/home/ubuntu/Projetos/ProtocoloMedRoot/Backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.services import BitrixService

def inspect_deal(deal_id):
    print(f"🔍 Buscando detalhes do Deal {deal_id}...")
    
    # 1. Get Deal Details
    deal = BitrixService._safe_request('GET', 'crm.deal.get.json', params={'id': deal_id})
    if not deal or 'result' not in deal:
        print(f"❌ Deal {deal_id} não encontrado ou erro na API.")
        return

    print("\n📦 Dados do Deal:")
    print(json.dumps(deal['result'], indent=2, ensure_ascii=False))

    # 2. Get Product Rows
    products = BitrixService._safe_request('GET', 'crm.deal.productrows.get.json', params={'id': deal_id})
    if products and 'result' in products:
        print("\n💊 Produtos no Deal:")
        print(json.dumps(products['result'], indent=2, ensure_ascii=False))
    else:
        print("\n⚠️ Nenhum produto encontrado neste Deal.")

if __name__ == "__main__":
    inspect_deal(448)
