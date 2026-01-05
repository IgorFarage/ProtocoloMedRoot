import mercadopago
import os
from django.conf import settings

class FinancialService:
    def __init__(self):
        # Garante que o SDK seja iniciado com o ACCESS_TOKEN do .env
        self.sdk = mercadopago.SDK(os.getenv("MERCADO_PAGO_ACCESS_TOKEN"))

    def create_subscription(self, title, price, user_email, external_reference, frequency=1):
        # ... (mantenha seu código de assinatura aqui como já estava) ...
        # Apenas para referência, não apague o que já existe.
        pass 

    # --- ADICIONE ESTE NOVO MÉTODO ---
    def process_direct_payment(self, payment_data):
        """
        Processa pagamento transparente via Cartão usando o SDK.
        """
        try:
            # O método .create() do SDK faz o POST para a API de pagamentos
            request_options = mercadopago.config.RequestOptions()
            request_options.custom_headers = {
                'x-idempotency-key': payment_data.get('external_reference')
            }
            
            payment_response = self.sdk.payment().create(payment_data, request_options)
            
            if payment_response["status"] == 201 or payment_response["status"] == 200:
                return payment_response["response"]
            else:
                print("❌ Erro MP:", payment_response)
                return {
                    "status": "rejected",
                    "status_detail": payment_response.get("response", {}).get("message", "Erro desconhecido")
                }
        except Exception as e:
            print(f"❌ Exceção no SDK: {e}")
            return None