import mercadopago
import os
import json
import logging

logger = logging.getLogger(__name__)

class FinancialService:
    def __init__(self):
        token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
        if not token:
            print("⚠️ AVISO: MERCADO_PAGO_ACCESS_TOKEN não configurado no .env")
        self.sdk = mercadopago.SDK(token)
        print(f"🔑 SDK Iniciado com Token: {token[:10]}... (Verifique se é TEST-...)")

    def process_direct_payment(self, payment_data):
        """
        Envia o pagamento (one-time) para o Mercado Pago.
        """
        try:
            print(f"🚀 Enviando Payload MP (Pagamento Único): {json.dumps(payment_data, indent=2)}")
            payment_response = self.sdk.payment().create(payment_data)
            print(f"📥 Resposta MP: {json.dumps(payment_response, indent=2)}")
            
            if "response" in payment_response:
                response_content = payment_response["response"]
                
                if payment_response.get("status") == 400:
                    print(f"❌ Erro 400 do Mercado Pago. Detalhes: {json.dumps(response_content, indent=2)}")
                
                return response_content
            
            print(f"❌ Erro Crítico MP (Sem response): {payment_response}")
            return None

        except Exception as e:
            print(f"❌ Exceção no SDK Mercado Pago: {e}")
            return None

    def get_or_create_customer(self, email, first_name=None, last_name=None, cpf=None):
        """
        Busca um cliente por e-mail ou cria um novo com dados completos.
        """
        try:
            print(f"🔎 Buscando Customer por email: {email}")
            search = self.sdk.customer().search({"email": email})
            
            if search.get("status") == 200 and search["response"]["results"]:
                customer = search["response"]["results"][0]
                print(f"✅ Customer Encontrado: {customer['id']}")
                return customer
            
            print(f"🆕 Criando Novo Customer para: {email}")
            customer_data = {"email": email}
            if first_name:
                customer_data["first_name"] = first_name
            if last_name:
                customer_data["last_name"] = last_name
            if cpf:
                 customer_data["identification"] = {"type": "CPF", "number": cpf}

            new_customer = self.sdk.customer().create(customer_data)
            
            if new_customer.get("status") == 201:
                print(f"✅ Customer Criado: {new_customer['response']['id']}")
                return new_customer["response"]
            
            print(f"❌ Erro ao criar customer: {new_customer}")
            return None
        except Exception as e:
            print(f"❌ Exceção get_or_create_customer: {e}")
            return None

    def save_card(self, customer_id, token, payment_method_id=None):
        """
        Salva o cartão no Customer para uso em assinaturas.
        """
        try:
            logging.info(f"💾 Salvando Cartão {token} no Customer {customer_id}")
            payload = {"token": token}
            # Simples version for Sandbox stability
            # if payment_method_id:
            #    payload["payment_method_id"] = payment_method_id
                
            card = self.sdk.card().create(customer_id, payload)
            
            if card.get("status") == 200 or card.get("status") == 201:
                print(f"✅ Cartão Salvo ID: {card['response']['id']}")
                return card["response"]
            
            print(f"❌ Erro ao salvar cartão: {card}")
            return None
        except Exception as e:
            print(f"❌ Exceção save_card: {e}")
            return None

    def create_subscription(self, subscription_data):
        """
        Cria uma assinatura (Preapproval) sem plano no Mercado Pago.
        """
        try:
            print(f"🚀 Enviando Payload Assinatura MP: {json.dumps(subscription_data, indent=2)}")
            # Garantir status authorized
            subscription_data["status"] = "authorized"
            
            response = self.sdk.preapproval().create(subscription_data)
            print(f"📥 Resposta Assinatura MP: {json.dumps(response, indent=2)}")

            if "response" in response:
                return response["response"]
            
            if response.get("status") == 400 or response.get("status") == 404:
                 print(f"❌ Erro MP Assinatura: {json.dumps(response, indent=2)}")
            
            return None

        except Exception as e:
            print(f"❌ Exceção ao criar Assinatura: {e}")
            return None

    def get_payment_info(self, payment_id):
        """
        Busca detalhes de uma transação pelo ID (usado no Webhook).
        """
        try:
            payment_response = self.sdk.payment().get(payment_id)
            if "response" in payment_response:
                return payment_response["response"]
            return None
        except Exception as e:
            print(f"❌ Erro ao buscar pagamento {payment_id}: {e}")
            return None
