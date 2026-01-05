import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

# Use um ID de produto que você SABE que tem foto no Bitrix (Ex: Finasterida Cápsula)
# Olhe no seu Bitrix o ID desse produto e coloque abaixo:
PRODUCT_ID_TESTE = 222  

WEBHOOK_URL = os.getenv('BITRIX_WEBHOOK_URL')

def testar_download():
    if not WEBHOOK_URL:
        print("❌ BITRIX_WEBHOOK_URL não configurado.")
        return

    print(f"🔍 Testando download para Produto ID: {PRODUCT_ID_TESTE}")
    print(f"🔗 Base URL: {WEBHOOK_URL}")

    # 1. Tentar pegar a URL da imagem via API
    try:
        url_api = f"{WEBHOOK_URL}/crm.product.get.json?id={PRODUCT_ID_TESTE}"
        res = requests.get(url_api)
        data = res.json()
        
        product = data.get('result', {})
        if not product:
            print("❌ Produto não encontrado ou sem permissão de CRM.")
            return

        print(f"✅ Produto encontrado: {product.get('NAME')}")
        
        # Tenta achar a imagem
        img_info = product.get('DETAIL_PICTURE') or product.get('PREVIEW_PICTURE')
        
        if not img_info:
            print("❌ Este produto não tem imagem cadastrada no campo 'Imagem Detalhada' ou 'Prévia'.")
            # Tenta via galeria (método alternativo)
            print("   Tentando via Galeria (catalog.productImage.list)...")
            res_gal = requests.post(f"{WEBHOOK_URL}/catalog.productImage.list.json", json={"productId": PRODUCT_ID_TESTE})
            imgs = res_gal.json().get('result', {}).get('productImages', [])
            if imgs:
                img_info = imgs[0]
                print("   ✅ Imagem achada na galeria!")
            else:
                print("   ❌ Nenhuma imagem achada na galeria também.")
                return

        # Pega a URL de download
        download_path = img_info.get('detailUrl') or img_info.get('downloadUrl')
        print(f"🔗 URL bruta vinda do Bitrix: {download_path}")

        if not download_path:
            print("❌ Objeto de imagem existe, mas sem URL de download.")
            return

        # Monta URL absoluta se vier relativa
        if download_path.startswith('/'):
            domain = WEBHOOK_URL.split('/rest/')[0]
            full_url = f"{domain}{download_path}"
        else:
            full_url = download_path

        print(f"🌍 URL Final para baixar: {full_url}")

        # 2. Tentar Baixar
        print("⬇️ Tentando baixar bytes...")
        headers = {
            'User-Agent': 'Mozilla/5.0'
        }
        
        # Tenta baixar
        r = requests.get(full_url, headers=headers)
        
        print(f"📡 Status Code do Download: {r.status_code}")
        
        if r.status_code == 200:
            print(f"✅ SUCESSO! Baixado {len(r.content)} bytes.")
            print("O problema no seu código principal deve ser o 'try/except pass' escondendo erros.")
        elif r.status_code == 403:
            print("❌ ERRO 403 (Proibido).")
            print("MOTIVO: O Bitrix bloqueou o download anônimo.")
            print("SOLUÇÃO: Precisamos usar o método 'disk.file.get' ou adicionar permissão de 'Drive' no Webhook.")
        elif r.status_code == 404:
            print("❌ ERRO 404 (Não encontrado). A URL está quebrada.")
        else:
            print(f"❌ Erro desconhecido: {r.text}")

    except Exception as e:
        print(f"💥 Erro CRÍTICO no script: {e}")

testar_download()