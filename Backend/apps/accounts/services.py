import os
import requests
import json

class BitrixService:
    @staticmethod
    def _get_base_url():
        url = os.getenv('BITRIX_WEBHOOK_URL')
        if not url: return None
        return url if url.endswith('/') else f"{url}/"

    @staticmethod
    def create_lead(user, answers):
        # ... (Mantenha seu método create_lead igual, não vamos mexer nele agora) ...
        # Se quiser, cole o código do create_lead anterior aqui.
        base_url = BitrixService._get_base_url()
        if not base_url: return None
        
        endpoint = f"{base_url}crm.lead.add.json"
        respostas_texto = ""
        if answers:
            for k, v in answers.items():
                respostas_texto += f"{k}: {v}\n"

        payload = {
            "fields": {
                "TITLE": f"Novo Lead - {user.full_name}",
                "NAME": user.full_name,
                "EMAIL": [{"VALUE": user.email, "VALUE_TYPE": "WORK"}],
                "STATUS_ID": "NEW",
                "OPENED": "Y",
                "COMMENTS": f"--- ANAMNESE ---\n{respostas_texto}"
            },
            "params": {"REGISTER_SONET_EVENT": "Y"}
        }
        try:
            response = requests.post(endpoint, json=payload, timeout=10)
            result = response.json()
            if 'result' in result: return result['result']
        except: return None

    @staticmethod
    def process_subscription(user, address_data, products, total_value):
        base_url = BitrixService._get_base_url()
        if not base_url or not user.id_bitrix:
            print("Erro: Falta configuração ou ID Bitrix.")
            return False

        print(f"--- ATUALIZANDO LEAD {user.id_bitrix} COM PRODUTOS ---")

        # 1. Montar Endereço
        full_address = f"{address_data.get('street')}, {address_data.get('number')}"
        if address_data.get('neighborhood'): full_address += f" - {address_data.get('neighborhood')}"
        if address_data.get('complement'): full_address += f" ({address_data.get('complement')})"
        
        # 2. Converter seus produtos para o formato de "Rows" do Bitrix
        # O Bitrix espera um array de objetos com PRODUCT_NAME, PRICE, QUANTITY
        bitrix_rows = []
        for p in products:
            bitrix_rows.append({
                "PRODUCT_NAME": p.get('name', 'Produto'),
                "PRICE": float(p.get('price', 0)),
                "QUANTITY": 1,
                "MEASURE_CODE": 1, # Unidade (peça/unidade)
                "CURRENCY_ID": "BRL"
            })

        try:
            # CHAMADA A: Atualizar Endereço e Comentários (crm.lead.update)
            # Nota: Não enviamos OPPORTUNITY aqui, pois os produtos vão calcular isso sozinhos
            update_payload = {
                "id": user.id_bitrix,
                "fields": {
                    "ADDRESS": full_address,
                    "ADDRESS_CITY": address_data.get('city'),
                    "ADDRESS_POSTAL_CODE": address_data.get('cep'),
                    "ADDRESS_PROVINCE": address_data.get('state'),
                    "COMMENTS": f"Endereço de Entrega Atualizado: {full_address}"
                }
            }
            r_update = requests.post(f"{base_url}crm.lead.update.json", json=update_payload)
            print(f"Update Campos: {r_update.json()}")

            # CHAMADA B: Definir Linhas de Produto (crm.lead.productrows.set)
            # Isso é o que faz o valor (R$) aparecer de verdade!
            products_payload = {
                "id": user.id_bitrix,
                "rows": bitrix_rows
            }
            print(f"Enviando Produtos: {json.dumps(products_payload, indent=2)}")
            
            r_products = requests.post(f"{base_url}crm.lead.productrows.set.json", json=products_payload)
            print(f"Update Produtos: {r_products.json()}")

            if r_products.status_code == 200 and r_products.json().get('result') is True:
                return True
            
            return False

        except Exception as e:
            print(f"EXCEÇÃO: {e}")
            return False