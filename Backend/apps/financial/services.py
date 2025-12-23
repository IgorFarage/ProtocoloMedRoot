import mercadopago
import os
import datetime

class FinancialService:
    def __init__(self):
        token = os.getenv('MERCADO_PAGO_ACCESS_TOKEN')
        if not token:
            print("⚠️ AVISO: MERCADOPAGO_ACCESS_TOKEN não encontrado no .env")
        self.sdk = mercadopago.SDK(token)

    def create_subscription(self, title, price, user_email, external_reference, frequency=1):
        """
        Gera um link de ASSINATURA (Recorrente) no Mercado Pago.
        frequency: 1 (Mensal) ou 3 (Trimestral)
        """
        # URL de retorno (Frontend)
        back_url = "http://localhost:5173/pagamento/sucesso"

        # Dados da Assinatura (Preapproval)
        subscription_data = {
            "reason": title,
            "external_reference": str(external_reference),
            "payer_email": user_email,
            "auto_recurring": {
                "frequency": frequency,
                "frequency_type": "months",
                "transaction_amount": float(price),
                "currency_id": "BRL"
            },
            "back_url": back_url,
            "status": "authorized"
        }

        try:
            # Cria a assinatura (endpoint /preapproval)
            response = self.sdk.preapproval().create(subscription_data)
            response_data = response.get("response", {})
            
            # O link para o usuário assinar é o 'init_point'
            return response_data.get("init_point") 
        except Exception as e:
            print(f"Erro ao criar assinatura MP: {e}")
            return None