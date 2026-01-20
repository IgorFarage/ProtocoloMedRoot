
import os
import sys
import django
import json

sys.path.append('/home/ubuntu/Projetos/ProtocoloMedRoot/Backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.services import BitrixService

def inspect_deal(deal_id):
    print(f"🔍 Buscando detalhes do Deal {deal_id}...")
    deal = BitrixService._safe_request('GET', 'crm.deal.get.json', params={'id': deal_id})
    if deal and 'result' in deal:
        res = deal['result']
        print(f"✅ Deal encontrado: {res['TITLE']}")
        print(f"💰 Opportunity: {res['OPPORTUNITY']}")
        print(f"📊 Stage: {res['STAGE_ID']}")
    
    products = BitrixService._safe_request('GET', 'crm.deal.productrows.get.json', params={'id': deal_id})
    if products and 'result' in products:
        print(f"💊 Produtos ({len(products['result'])}):")
        for p in products['result']:
            print(f"   - {p['PRODUCT_NAME']} (R$ {p['PRICE']})")
    else:
        print("❌ Nenhum produto encontrado.")

if __name__ == "__main__":
    inspect_deal(446)
