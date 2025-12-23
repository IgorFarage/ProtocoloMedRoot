import mercadopago
import requests
import os
from django.conf import settings

class FinancialService:
    def __init__(self):
        self.mp_sdk = mercadopago.SDK(os.getenv('MERCADO_PAGO_ACCESS_TOKEN'))
        self.bitrix_url = os.getenv('BITRIX_WEBHOOK_URL')
        if self.bitrix_url and not self.bitrix_url.endswith('/'):
            self.bitrix_url += '/'

    def get_plan_from_bitrix(self, plan_slug):
        """
        Busca preço e nome do plano no Bitrix (Seção 35).
        IDs Fixos: Standard (262), Plus (264).
        """
        # Mapeamento Slug -> ID do Bitrix
        # CONFIRA SE 262 É STANDARD E 264 É PLUS NO SEU CRM
        PLAN_MAP = {
            'standard': 262,
            'plus': 264
        }
        
        bitrix_id = PLAN_MAP.get(plan_slug)
        if not bitrix_id: return None

        try:
            # Busca produto específico pelo ID
            response = requests.post(
                f"{self.bitrix_url}crm.product.list.json",
                json={
                    "filter": {"ID": bitrix_id},
                    "select": ["ID", "NAME", "PRICE", "DESCRIPTION"] 
                },
                timeout=5
            )
            data = response.json()
            
            if "result" in data and len(data["result"]) > 0:
                product = data["result"][0]
                return {
                    "name": product.get("NAME"),
                    "price": float(product.get("PRICE") or 0),
                    "description": product.get("DESCRIPTION", "")
                }
        except Exception as e:
            print(f"Erro ao buscar plano no Bitrix: {e}")
            return None
        
        return None

    def create_preference(self, transaction, user_email, user_name, plan_name):
        """
        Gera o link de pagamento no Mercado Pago.
        """
        back_urls = {
            "success": "http://localhost:5173/pagamento/sucesso",
            "failure": "http://localhost:5173/pagamento/erro",
            "pending": "http://localhost:5173/pagamento/pendente"
        }

        preference_data = {
            "items": [
                {
                    "id": transaction.plan_type,
                    "title": f"Assinatura - {plan_name}", # Nome vindo do Bitrix
                    "quantity": 1,
                    "currency_id": "BRL",
                    "unit_price": float(transaction.amount)
                }
            ],
            "payer": {
                "email": user_email,
                "name": user_name
            },
            "back_urls": back_urls,
            "auto_return": "approved",
            "external_reference": str(transaction.external_reference),
            "statement_descriptor": "MEDROOT",
        }

        try:
            pref = self.mp_sdk.preference().create(preference_data)
            return pref["response"].get("sandbox_init_point") # Mude para init_point em produção
        except Exception as e:
            print(f"Erro MP: {e}")
            return None