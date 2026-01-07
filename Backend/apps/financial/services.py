import mercadopago
import os
import json

class FinancialService:
    def __init__(self):
        token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
        if not token:
            print("⚠️ AVISO: MERCADO_PAGO_ACCESS_TOKEN não configurado no .env")
        self.sdk = mercadopago.SDK(token)

    def process_direct_payment(self, payment_data):
        """
        Envia o pagamento para o Mercado Pago.
        """
        try:
            # REMOVIDO: Configuração manual de Idempotência que causava erro no PIX
            # O SDK já gerencia isso ou não é estritamente necessário para este fluxo agora.
            
            # Chamada Simples ao SDK
            payment_response = self.sdk.payment().create(payment_data)
            
            # Verifica se houve resposta válida
            if "response" in payment_response:
                response_content = payment_response["response"]
                status = response_content.get("status")
                
                # Se deu erro (400/401/etc), o status não será 'approved' nem 'pending'
                # Mas o MP retorna 200/201 com status 'rejected' ou retorna 400 na requisição
                if payment_response.get("status") == 400:
                    print(f"❌ Erro 400 do Mercado Pago. Detalhes: {json.dumps(response_content, indent=2)}")
                
                return response_content
            
            print("❌ Erro Crítico MP (Sem response):", payment_response)
            return None

        except Exception as e:
            print(f"❌ Exceção no SDK Mercado Pago: {e}")
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