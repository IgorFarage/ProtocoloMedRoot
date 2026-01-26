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

    def execute_transparent_subscription(self, user_data: dict, subscription_config: dict, token: str) -> dict:
        """
        Cria uma assinatura (Preapproval) com VÍNCULO EXPLÍCITO DE PAYER.
        Fluxo: Customer -> Save Card -> Preapproval (payload com payer.id).
        """
        try:
            # 1. Obter ou Criar Cliente
            cpf_val = user_data.get('cpf') or user_data.get('identification', {}).get('number')
            
            customer = self.get_or_create_customer(
                email=user_data['email'],
                first_name=user_data.get('first_name'),
                last_name=user_data.get('last_name'),
                cpf=cpf_val
            )
            if not customer:
                return {"error": "Falha ao gerenciar Customer no MP"}
            
            customer_id = customer['id']
            
            # 2. Salvar Cartão (CRÍTICO)
            card = self.save_card(customer_id, token)
            
            if not card or 'id' not in card:
                 print(f"❌ Falha crítica: Cartão não foi salvo. Resposta save_card: {card}")
                 return {"error": "Não foi possível salvar o cartão. Verifique os dados."}

            card_id = card['id']
            print(f"✅ Cartão Salvo com Sucesso! ID: {card_id}")

            # 3. Criar Assinatura (Preapproval)
            import datetime
            start_date = (datetime.datetime.now() + datetime.timedelta(minutes=1)).isoformat() + "Z"
            
            amount = subscription_config.get('transaction_amount') or subscription_config.get('amount')
            
            preapproval_payload = {
                "back_url": "https://protocolomed.com.br/payment-success",
                "reason": subscription_config.get("reason", "Assinatura"),
                "external_reference": subscription_config.get("external_reference"),
                "auto_recurring": {
                    "frequency": 1, 
                    "frequency_type": "months",
                    "start_date": start_date,
                    "transaction_amount": float(amount),
                    "currency_id": "BRL"
                },
                # VÍNCULO EXPLÍCITO: OBRIGATÓRIO PARA SANDBOX + CARD_ID
                "payer": {
                    "id": customer_id,
                    "email": user_data.get("email")
                },
                "card_token_id": token,     # ID do cartão salvo (ex: 17694...)
                "status": "authorized" 
            }

            print(f"🚀 Enviando Payload Assinatura MP (Com Payer ID): {json.dumps(preapproval_payload, indent=2)}")
            
            response = self.sdk.preapproval().create(preapproval_payload)
            response_content = response.get("response", {})
            status = response.get("status")

            if status == 201:
                print(f"✅ Assinatura Criada: {response_content.get('id')}")
                return response_content
            
            error_msg = response_content.get("message", "Erro na criação da assinatura")
            print(f"❌ Erro MP Assinatura (Status {status}): {json.dumps(response_content, indent=2)}")
            
            return {"error": error_msg, "details": response_content}

        except Exception as e:
            print(f"❌ Erro Crítico execute_transparent_subscription: {e}")
            return {"error": str(e)}

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
    def process_payment_approval(self, payment_id: str, transaction_obj):
        """
        Valida o pagamento e ativa a assinatura/pedido via Store Service.
        """
        from apps.store.services import SubscriptionService
        
        # 1. Update Transaction Status
        transaction_obj.status = transaction_obj.Status.APPROVED
        transaction_obj.mercado_pago_id = payment_id
        transaction_obj.save()
        
        # 2. Trigger Store/Subscription Logic
        try:
            SubscriptionService.activate_subscription_from_transaction(transaction_obj)
            logger.info(f"✅ Assinatura ativada para Transaction {transaction_obj.id}")
        except Exception as e:
            logger.error(f"❌ Erro ao ativar assinatura para Transaction {transaction_obj.id}: {e}")
            # Não falhamos o request inteiro, mas logamos o erro crítico de consistência
        
        return True
