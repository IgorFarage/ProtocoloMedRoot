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
        # Debugging the auth/redirect issue (masked key logging kept as debug if vital, else removed)
        # masked_key = self.api_key[:10] + "..." if self.api_key else "None"
        # logger.debug(f"DEBUG: Calling {url} | Key starts with: {masked_key}")

        try:
            # [FIX] allow_redirects=False to see if we are being redirected to login
            response = requests.request(method, url, headers=self.headers, json=payload, timeout=30, allow_redirects=False)
            
            if response.is_redirect:
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

    def cancel_subscription(self, user, reason="Cancelamento pelo Usuário"):
        """
        Cancela assinatura com lógica de Grace Period (Retenção).
        1. Cancela no Asaas (para parar cobrança futura).
        2. Mantém acesso local até o fim do ciclo pago.
        3. Atualiza User para 'grace_period'.
        """
        from django.db import transaction as db_transaction
        from apps.accounts.models import User
        
        # 1. Busca Assinatura Ativa
        last_tx = Transaction.objects.filter(
            user=user, 
            status=Transaction.Status.APPROVED,
            asaas_subscription_id__isnull=False
        ).order_by('-created_at').first()
        
        sub_id = last_tx.asaas_subscription_id if last_tx else None
        
        if not sub_id:
            # Fallback: Se não achar ID mas tiver plano, cancela local apenas.
            logger.warning(f"⚠️ Tentativa de cancelamento sem ID de assinatura Asaas para {user.email}. Cancelando localmente.")
            with db_transaction.atomic():
                user.subscription_status = User.SubscriptionStatus.CANCELED
                user.current_plan = User.PlanType.NONE
                user.cancel_reason = reason
                user.save()
            return True, "Assinatura cancelada localmente (sem vínculo Asaas)."

        # 2. Consulta data de validade no Asaas (Next Due Date)
        access_until = datetime.now() + timedelta(days=30) # Default Fallback
        
        try:
            sub_details = self._request("GET", f"subscriptions/{sub_id}")
            if sub_details and 'nextDueDate' in sub_details:
                 # Data do próximo vencimento é até quando ele pagou
                 next_due_str = sub_details['nextDueDate'] # YYYY-MM-DD
                 access_until = datetime.strptime(next_due_str, "%Y-%m-%d")
        except Exception as e:
            logger.error(f"⚠️ Erro ao consultar data de vencimento Asaas: {e}")
        
        # 3. Cancela no Gateway
        try:
             self._request("DELETE", f"subscriptions/{sub_id}")
             logger.info(f"✅ Assinatura {sub_id} removida no Asaas.")
        except Exception as e:
             logger.error(f"❌ Erro ao deletar assinatura Asaas {sub_id}: {e}")
             return False, "Erro ao comunicar com operadora de cartão."

        # 4. Atualização Atômica (Grace Period)
        try:
            with db_transaction.atomic():
                user.subscription_status = User.SubscriptionStatus.GRACE_PERIOD
                user.access_valid_until = access_until
                user.scheduled_cancellation_date = access_until
                user.cancel_reason = reason
                user.save()
                
                # Se BitrixService estiver disponível, notifica churn
                try:
                    from apps.accounts.services import BitrixService
                    if BitrixService:
                         # TODO: Implementar register_churn no BitrixService se desejar
                         pass 
                except: pass
                
            return True, f"Assinatura cancelada. Seu acesso continua válido até {access_until.strftime('%d/%m/%Y')}."
            
        except Exception as e:
            logger.exception(f"❌ Erro de banco ao cancelar user {user.email}: {e}")
            return False, "Erro interno ao processar cancelamento."
        except Exception as e:
            logger.exception(f"❌ Erro de banco ao cancelar user {user.email}: {e}")
            return False, "Erro interno ao processar cancelamento."

    def upgrade_subscription(self, user, new_plan_id, new_value, card_data=None):
        """
        Realiza Upgrade de plano (ex: Standard -> Plus).
        1. Cobra a diferença pro-rata imediatamento (One-Off).
        2. Atualiza a assinatura existente para o novo valor (Next Cycle).
        """
        from django.db import transaction as db_transaction
        from apps.accounts.models import User
        
        # 1. Busca Assinatura Ativa Local
        last_tx = Transaction.objects.filter(
            user=user, 
            status=Transaction.Status.APPROVED,
            asaas_subscription_id__isnull=False
        ).order_by('-created_at').first()
        
        if not last_tx or not last_tx.asaas_subscription_id:
             return False, "Nenhuma assinatura ativa encontrada para upgrade."

        sub_id = last_tx.asaas_subscription_id
        
        try:
            # 2. Busca detalhes no Asaas (para saber valor atual e vencimento)
            sub_details = self._request("GET", f"subscriptions/{sub_id}")
            if not sub_details or 'id' not in sub_details:
                return False, "Erro ao consultar assinatura no Asaas."
            
            current_value = float(sub_details.get('value', 0))
            next_due_str = sub_details.get('nextDueDate')
            
            # Se já for o mesmo valor/plano, aborta (ou apenas atualiza local)
            if float(new_value) <= current_value:
                 return False, "O novo plano deve ter valor superior ao atual para Upgrade."

            # 3. Calculo Pro-Rata
            from datetime import datetime
            today = datetime.now().date()
            next_due = datetime.strptime(next_due_str, "%Y-%m-%d").date()
            
            days_remaining = (next_due - today).days
            if days_remaining < 0: days_remaining = 0
            
            # Diferença mensal
            diff_full_month = float(new_value) - current_value
            
            # Valor Pro-Rata (Considerando mês de 30 dias)
            pro_rata_amount = (diff_full_month / 30) * days_remaining
            
            if pro_rata_amount < 5.00:
                pro_rata_amount = 5.00 # Minimo Asaas (ou decidimos não cobrar se for muito baixo?)
                # Vamos cobrar o minimo para registrar a mudança validar cartão
            
            pro_rata_amount = round(pro_rata_amount, 2)
            
            logger.info(f"🔄 Upgrade Check: Atual R$ {current_value} -> Novo R$ {new_value}. Dias Restantes: {days_remaining}. Cobrança Pro-Rata: R$ {pro_rata_amount}")

            # 4. Cobrança Imediata (Diferença)
            # Usamos create_payment simples. Se tiver card_data usa, senão tenta usar o tokenizado (mas create_payment exige dados completos se não for via customer tokenização explícita)
            # Obs: Asaas não tem "cobrar no cartão salvo" facilmente sem tokenização prévia ou enviando dados de novo.
            # O CompletePurchaseView envia card_data.
            
            one_off_resp = None
            if pro_rata_amount > 0:
                 one_off_resp = self.create_payment(
                     customer_id=user.asaas_customer_id,
                     billing_type="CREDIT_CARD",
                     value=pro_rata_amount,
                     card_data=card_data,
                     description=f"Upgrade para Plano {new_plan_id} (Pro-Rata)"
                 )
                 
                 if 'errors' in one_off_resp:
                      return False, f"Erro na cobrança da diferença: {one_off_resp['errors'][0]['description']}"
            
            # 5. Atualizar Assinatura (Para o próximo ciclo)
            update_payload = {
                "value": float(new_value),
                "description": f"Assinatura ProtocoloMed - {new_plan_id}",
                "updatePendingPayments": True # Atualiza boletos/cobranças em aberto se houver? Não, False geralmente pra manter o atual se já gerado. Mas queremos que o proximo venha certo.
                # Asaas docs: updatePendingPayments "true" updates pending payments too. 
                # Mas nós JÁ cobramos a diferença. Então queremos que a cobrança pendente (se for pro proximo mes) atualize.
                # Se a cobrança pendente for "amanhã", e cobramos pro-rata hoje, o usuario paga 2x?
                # Se cobramos pro-rata, é pelos dias DE HOJE ATE O VENCIMENTO.
                # O vencimento original PAGA O MES SEGUINTE ou O MES PASSADO?
                # Geralmente pré-pago. Pagou dia 01, usa até dia 30.
                # Se dia 15 faz upgrade. Pagou 30 dias de Standard. Usou 15. Tem 15 de crédito Standard.
                # Quer usar 15 dias de Plus.
                # Custo 15 dias Plus - Credito 15 dias Standard = (Plus - Standard)/2.
                # Isso é o pro-rata calculate acima.
                # A PRÓXIMA fatura (dia 30) deve ser FULL Plus.
                # Então updatePendingPayments = True parece correto se a fatura ainda não foi paga.
            }
            
            upd_resp = self._request("POST", f"subscriptions/{sub_id}", update_payload)
            if 'errors' in upd_resp:
                 return False, f"Erro ao atualizar assinatura: {upd_resp['errors'][0]['description']}"

            # 6. Atualização Local
            with db_transaction.atomic():
                # Salva transação do Pro-Rata
                if one_off_resp:
                    Transaction.objects.create(
                        user=user,
                        plan_type=new_plan_id,
                        amount=pro_rata_amount,
                        paid_amount=pro_rata_amount,
                        cycle='one_off',
                        external_reference=str(uuid.uuid4()),
                        status=Transaction.Status.APPROVED, # Assumindo sucesso direto se não deu erro API
                        payment_type=Transaction.PaymentType.CREDIT_CARD,
                        asaas_payment_id=one_off_resp.get('id'),
                        description=f"Upgrade {new_plan_id}"
                    )
                
                # Atualiza User
                user.current_plan = new_plan_id # 'plus'
                # Se estava em grace period ou algo assim, reativa
                user.subscription_status = User.SubscriptionStatus.ACTIVE
                user.access_valid_until = None
                user.scheduled_cancellation_date = None
                user.save()
            
            return True, "Upgrade realizado com sucesso!"

        except Exception as e:
            logger.exception(f"❌ Erro Upgrade: {e}")
            return False, f"Erro interno: {str(e)}"
