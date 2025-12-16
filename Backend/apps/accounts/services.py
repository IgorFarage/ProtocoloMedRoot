import os
import requests
import json

class BitrixService:
    @staticmethod
    def create_lead(user, answers):
        # Busca a base da URL (ex: https://sua_conta.bitrix24.com.br/rest/1/token/)
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        
        if not base_url:
            print("ERRO: BITRIX_WEBHOOK_URL não encontrada no .env")
            return None

        # Garante que a URL termina com barra para concatenar o método
        if not base_url.endswith('/'):
            base_url += '/'
        
        endpoint = f"{base_url}crm.lead.add.json"
        
        # Prepara os campos para o Bitrix
        payload = {
            "fields": {
                "TITLE": f"Novo Lead - {user.full_name}",
                "NAME": user.full_name,
                "EMAIL": [{"VALUE": user.email, "VALUE_TYPE": "WORK"}],
                "STATUS_ID": "NEW",
                "OPENED": "Y",
                "SOURCE_ID": "WEB",
                "COMMENTS": f"Respostas do Questionário: {json.dumps(answers, ensure_ascii=False)}"
            },
            "params": {"REGISTER_SONET_EVENT": "Y"}
        }
        
        try:
            response = requests.post(endpoint, json=payload, timeout=10)
            result = response.json()
            
            if response.status_code == 200 and 'result' in result:
                print(f"Sucesso Bitrix! Lead ID: {result['result']}")
                return result['result']
            else:
                print(f"Erro na API do Bitrix: {result.get('error_description', 'Erro desconhecido')}")
                return None
        except Exception as e:
            print(f"Falha na conexão com Bitrix: {str(e)}")
            return None