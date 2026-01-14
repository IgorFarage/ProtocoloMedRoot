
import os
import requests
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração
BASE_URL = "https://subectodermic-cyperaceous-rebekah.ngrok-free.dev/api/accounts/webhooks/bitrix/"
SECRET_TOKEN = os.getenv("BITRIX_APP_TOKEN_SECRET")

if not SECRET_TOKEN:
    print("❌ Erro: BITRIX_APP_TOKEN_SECRET não encontrado no .env")
    exit(1)

# Payload Simulado (Formato Bitrix - x-www-form-urlencoded)
# Bitrix envia chaves planas como 'auth[application_token]'
payload = {
    "event": "ONCRMDEALUPDATE",
    "data[FIELDS][ID]": "360",
    "auth[application_token]": SECRET_TOKEN
}

print(f"🚀 Enviando Webhook de Teste para: {BASE_URL}")
print(f"🔑 Token Usado: {SECRET_TOKEN[:5]}...")

try:
    # IMPORTANTE: Usar data=payload para enviar como form-encoded, não json=payload
    response = requests.post(BASE_URL, data=payload)
    
    print(f"📥 Status Code: {response.status_code}")
    print(f"📄 Resposta: {response.text}")

    if response.status_code == 200:
        print("✅ Sucesso! Webhook aceito pelo Backend.")
    elif response.status_code == 403:
        print("⛔ Erro 403: Token rejeitado. Verifique se o BITRIX_APP_TOKEN_SECRET coincide.")
    else:
        print("⚠️ Outro Status. Verifique os logs do Django.")

except Exception as e:
    print(f"❌ Erro de Conexão: {e}")
