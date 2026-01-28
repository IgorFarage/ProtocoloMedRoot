import requests
import json
import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal
from django.conf import settings
from .models import Coupon, Transaction

logger = logging.getLogger(__name__)

class AsaasService:
    def __init__(self):
        self.api_key = settings.ASAAS_API_KEY
        self.base_url = settings.ASAAS_API_URL
        
        if not self.api_key:
            logger.warning("⚠️ ASAAS_API_KEY não configurada!")

        self.headers = {
            "access_token": self.api_key,
            "Content-Type": "application/json",
            "User-Agent": "ProtocoloMed-Backend/1.0"
        }

    STATUS_MAPPING = {
        'PENDING': Transaction.Status.PENDING,
        'AWAITING_RISK_ANALYSIS': Transaction.Status.PENDING,
        'CONFIRMED': Transaction.Status.APPROVED,
        'RECEIVED': Transaction.Status.APPROVED,
        'RECEIVED_IN_CASH': Transaction.Status.APPROVED,
        'OVERDUE': Transaction.Status.REJECTED,
        'REFUNDED': Transaction.Status.REFUNDED,
        'REFUND_REQUESTED': Transaction.Status.REFUNDED,
        'CHARGEBACK_REQUESTED': Transaction.Status.REJECTED,
        'CHARGEBACK_DISPUTE': Transaction.Status.REJECTED,
        'AWAITING_CHARGEBACK_REVERSAL': Transaction.Status.PENDING,
        'DUNNING_REQUESTED': Transaction.Status.PENDING,
        'DUNNING_RECEIVED': Transaction.Status.APPROVED,
        'PAYMENT_CONFIRMED': Transaction.Status.APPROVED,
        'PAYMENT_RECEIVED': Transaction.Status.APPROVED,
        'PAYMENT_RECEIVED_IN_CASH': Transaction.Status.APPROVED,
        'PAYMENT_OVERDUE': Transaction.Status.REJECTED,
        'PAYMENT_REFUNDED': Transaction.Status.REFUNDED,
        'PAYMENT_CHARGEBACK_REQUESTED': Transaction.Status.REJECTED
    }

    @staticmethod
    def map_status(asaas_status):
        return AsaasService.STATUS_MAPPING.get(asaas_status, Transaction.Status.PENDING)

    def _request(self, method, endpoint, payload=None):
        """
        Wrapper centralizado para logs sanitizados e tratamento de erros.
        """
        url = f"{self.base_url}/{endpoint}"
        
        # LOG SANITIZADO (PCI-DSS)
        safe_payload = None
        if payload:
            safe_payload = payload.copy()
            if "creditCard" in safe_payload:
                safe_payload["creditCard"] = "***SANITIZED***"
            if "creditCardHolderInfo" in safe_payload:
                 safe_payload["creditCardHolderInfo"] = "***SANITIZED***"

        logger.info(f"🚀 Asaas Request [{method}] {url} - Payload: {json.dumps(safe_payload)}")
        # Debugging the auth/redirect issue
        masked_key = self.api_key[:10] + "..." if self.api_key else "None"
        print(f"DEBUG: Calling {url} | Key starts with: {masked_key}")

        try:
            # [FIX] allow_redirects=False to see if we are being redirected to login
            response = requests.request(method, url, headers=self.headers, json=payload, timeout=30, allow_redirects=False)
            
            if response.is_redirect:
                print(f"DEBUG: Redirected to {response.headers.get('Location')}")
                logger.error(f"❌ Asaas Redirects to: {response.headers.get('Location')}")
                return {"error": True, "details": "Redirected", "location": response.headers.get('Location')}

            response.raise_for_status()
            try:
                data = response.json()
            except ValueError: # requests.json() raises ValueError (or JSONDecodeError) on failure
                logger.error(f"❌ Asaas Non-JSON Response: {response.text}")
                return {"error": True, "details": "Invalid JSON from Asaas", "raw": response.text}

            # Logger response (cuidado com dados sensíveis no retorno também, embora Asaas geralmente retorne mascarado)
            logger.info(f"📥 Asaas Response [{response.status_code}]: {data.get('id', 'OK') if isinstance(data, dict) else 'List/Other'}") 
            return data
        except requests.exceptions.HTTPError as e:
            error_content = e.response.text
            logger.error(f"❌ Asaas HTTP Error {e.response.status_code}: {error_content}")
            try:
                return {"error": True, "details": e.response.json()}
            except:
                return {"error": True, "details": error_content}
        except Exception as e:
            logger.exception(f"❌ Asaas Critical Error: {str(e)}")
            return {"error": True, "details": str(e)}

    def get_or_create_customer(self, user_data):
        """
        Busca cliente no Asaas pelo CPF ou Email. Se não existir, cria.
        user_data: {name, email, cpf, phone, ...}
        """
        # 1. Search by CPF
        cpf = user_data.get('cpf', '').replace('.', '').replace('-', '')
        search_res = self._request("GET", f"customers?cpfCnpj={cpf}")
        
        if search_res and 'data' in search_res and len(search_res['data']) > 0:
            return search_res['data'][0]['id']

        # 2. Search by Email (Fallback)
        email = user_data.get('email')
        search_res_email = self._request("GET", f"customers?email={email}")
        
        if search_res_email and 'data' in search_res_email and len(search_res_email['data']) > 0:
             return search_res_email['data'][0]['id']

        # 3. Create
        payload = {
            "name": user_data.get('name'),
            "email": email,
            "cpfCnpj": cpf,
            "mobilePhone": user_data.get('phone'),
            "notificationDisabled": True # Nós cuidamos das notificações
        }
        create_res = self._request("POST", "customers", payload)
        
        if 'id' in create_res:
            return create_res['id']
        return None

    def create_payment(self, customer_id, billing_type, value, due_date=None, card_data=None, description="Pedido ProtocoloMed"):
        """
        Cria uma cobrança avulsa (Pix ou Cartão).
        billing_type: "PIX" ou "CREDIT_CARD"
        """
        payload = {
            "customer": customer_id,
            "billingType": billing_type,
            "value": float(value),
            "dueDate": due_date or (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "description": description
        }

        if billing_type == "CREDIT_CARD" and card_data:
            payload["creditCard"] = {
                "holderName": card_data.get("holderName"),
                "number": card_data.get("number"),
                "expiryMonth": card_data.get("expiryMonth"),
                "expiryYear": card_data.get("expiryYear"),
                "ccv": card_data.get("ccv")
            }
            payload["creditCardHolderInfo"] = card_data.get("holderInfo", {})

        response = self._request("POST", "payments", payload)
        
        # [PIX ENRICHMENT] Se for Pix, busca o Payload e QR Code
        if billing_type == "PIX" and response and "id" in response:
            try:
                pix_data = self._request("GET", f"payments/{response['id']}/pixQrCode")
                if pix_data:
                     response.update(pix_data) # Merge 'encodedImage', 'payload', 'expirationDate'
            except Exception as e:
                logger.error(f"❌ Erro ao buscar QRCode Pix Asaas: {e}")
                
        return response

    def create_subscription(self, customer_id, value, cycle_months, card_data, description="Assinatura ProtocoloMed"):
        """
        Cria uma assinatura no Asaas.
        cycle_months: 1 (Mensal) ou 3 (Trimestral)
        """
        cycle_map = {1: "MONTHLY", 3: "QUARTERLY"}
        
        payload = {
            "customer": customer_id,
            "billingType": "CREDIT_CARD",
            "value": float(value),
            "cycle": cycle_map.get(cycle_months, "MONTHLY"),
            "description": description,
            "creditCard": {
                "holderName": card_data.get("holderName"),
                "number": card_data.get("number"),
                "expiryMonth": card_data.get("expiryMonth"),
                "expiryYear": card_data.get("expiryYear"),
                "ccv": card_data.get("ccv")
            },
            "creditCardHolderInfo": card_data.get("holderInfo", {})
        }

        return self._request("POST", "subscriptions", payload)

    def validate_coupon_logic(self, code, user, original_amount):
        """
        Mantém a lógica de cupom local (banco de dados), independente do gateway.
        """
        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return False, "Cupom não encontrado.", Decimal(0), original_amount, None

        is_valid, msg = coupon.is_valid_for_user(user)
        if not is_valid: return False, msg, Decimal(0), original_amount, None

        if original_amount < coupon.min_purchase_value:
             return False, f"Mínimo para este cupom: R$ {coupon.min_purchase_value}", Decimal(0), original_amount, None

        # Check user usage limit
        if user and user.is_authenticated:
            # TODO: Ajustar filtro para considerar sucesso no modelo Asaas (approved/received)
            user_usage = Transaction.objects.filter(user=user, coupon=coupon, status=Transaction.Status.APPROVED).count()
            if user_usage >= coupon.max_uses_per_user:
                return False, "Você já atingiu o limite de uso deste cupom.", Decimal(0), original_amount, None

        # Calculate
        discount = Decimal(0)
        original_amount = Decimal(str(original_amount))
        
        if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
            discount = original_amount * (coupon.value / 100)
        else:
            discount = coupon.value

        if discount > original_amount: discount = original_amount
        final_price = original_amount - discount
        
        return True, "Cupom aplicado com sucesso!", discount, final_price, coupon
