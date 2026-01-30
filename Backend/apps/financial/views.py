import uuid
import logging
import json 
from datetime import datetime, timedelta 
from django.conf import settings
from django.db import transaction as db_transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Transaction, Coupon
from .services import AsaasService 
from .serializers import PurchaseSerializer, CouponValidateSerializer
from apps.accounts.serializers import RegisterSerializer
from apps.store.services import SubscriptionService
import os
# Importa o BitrixService com tratamento de erro
try:
    from apps.accounts.services import BitrixService
except ImportError:
    BitrixService = None

logger = logging.getLogger(__name__)

# --- VIEW 1: CHECKOUT LOGADO ---
class CreateCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        plan_id = data.get('plan_id') 
        billing_cycle = data.get('billing_cycle', 'monthly')
        products = data.get('products', []) 
        
        if not products: return Response({"error": "Nenhum produto encontrado."}, status=400)

        try: medication_total = sum(float(p.get('price', 0)) for p in products)
        except ValueError: return Response({"error": "Erro no valor dos produtos."}, status=400)
        
        plan_item = None
        service_price = 0.0
        if BitrixService:
            plan_item = BitrixService.get_plan_details(plan_id)
            if plan_item: service_price = plan_item['price']
        
        base_total = medication_total + service_price
        
        if billing_cycle == 'quarterly':
             final_amount = (base_total * 3) * 0.90
        else:
             final_amount = base_total

        if BitrixService:
            try:
                final_products = list(products)
                if plan_item: final_products.append(plan_item)
                BitrixService.prepare_deal_payment(user, final_products, f"ProtocoloMed - {plan_id}", final_amount, None)
            except Exception as e: logger.error(f"⚠️ Erro Bitrix: {e}")

        try:
            transaction = Transaction.objects.create(
                user=user, plan_type=plan_id, amount=final_amount, cycle=billing_cycle,
                external_reference=str(uuid.uuid4()), status=Transaction.Status.PENDING
            )
            return Response({"checkout_url": "", "external_reference": transaction.external_reference, "amount": float(transaction.amount)}, status=200)
        except Exception as e: 
            logger.exception("Error creating transaction")
            return Response({"error": "Erro interno."}, status=500)


# --- VIEW 3: WEBHOOK ---
class WebhookView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        import os
        allowed_token = os.getenv('ASAAS_WEBHOOK_ACCESS_TOKEN')
        incoming_token = request.headers.get('asaas-access-token')

        if allowed_token:
            if not incoming_token or incoming_token != allowed_token:
                logger.warning(f"⛔ Webhook bloqueado: Token inválido ou ausente. (Recebido: {incoming_token})")
                return Response({"error": "Forbidden"}, status=403)
        
        data = request.data
        
        # --- [HANDLER] ASAAS WEBHOOK ---
        # Asaas payload typically has "event" (e.g., PAYMENT_CONFIRMED) and "payment" object
        if 'event' in data and 'payment' in data:
            event = data.get('event')
            payment_data = data.get('payment')
            payment_id = payment_data.get('id')
            subscription_id = payment_data.get('subscription') 
            external_reference = payment_data.get('externalReference')

            logger.info(f"🔔 [Webhook] Asaas Event: {event} | ID: {payment_id} | Ref: {external_reference}")

            # 1. Encontrar Transação
            transaction = None
            if external_reference:
                transaction = Transaction.objects.filter(external_reference=external_reference).first()
            
            if not transaction and payment_id:
                transaction = Transaction.objects.filter(asaas_payment_id=payment_id).first()
                
            if not transaction and subscription_id:
                    # Se for renovação de assinatura, pode não ter transação criada ainda?
                    # Por enquanto focamos em atualizar status de existente
                    transaction = Transaction.objects.filter(asaas_subscription_id=subscription_id).order_by('-created_at').first()

            if transaction:
                # 2. Mapear Status (Centralizado)
                new_status = AsaasService.map_status(event)
                
                # 3. Atualizar e Disparar Ações
                # Só processamos mudanças de status relevantes (Aprovado/Rejeitado/Estornado)
                # Ignoramos PENDING se já estiver PENDING, mas se vier APPROVED é ação nova.
                if new_status and transaction.status != new_status:
                    # Se for status final ou mudança importante
                    transaction.status = new_status
                else:
                    logger.info(f"   ⚠️ Transaction {transaction.id} ignored: Status unchanged ({transaction.status} -> {new_status})")

                    # Salva ID do Asaas se não tiver
                    if not transaction.asaas_payment_id: transaction.asaas_payment_id = payment_id
                    transaction.save()
                    
                    logger.info(f"   ✅ Transaction {transaction.id} updated to {new_status}")

                    if new_status == Transaction.Status.APPROVED:
                        # Ativa Assinatura
                        try:
                            SubscriptionService.activate_subscription_from_transaction(transaction)
                            logger.info(f"      📦 Subscription activated.")
                        except Exception as e:
                            logger.error(f"      ❌ Subscription Activation Error: {e}")

                        # Sync Bitrix
                        if transaction.bitrix_sync_status != 'synced' and BitrixService:
                            try:
                                logger.info("      🔄 Triggering Bitrix Sync from Asaas Webhook...")
                                
                                # Snapshot de Produtos
                                products_list = []
                                if transaction.mp_metadata and isinstance(transaction.mp_metadata, dict):
                                    products_list = transaction.mp_metadata.get('original_products', [])
                                
                                # Fallback
                                if not products_list:
                                    from apps.accounts.models import UserQuestionnaire
                                    last_q = UserQuestionnaire.objects.filter(user=transaction.user).order_by('-created_at').first()
                                    if last_q:
                                        prot = BitrixService.generate_protocol(last_q.answers)
                                        products_list = prot.get('products', [])

                                deal_id = BitrixService.prepare_deal_payment(
                                    user=transaction.user,
                                    products_list=products_list,
                                    plan_title=f"ProtocoloMed - {transaction.plan_type}",
                                    total_amount=float(transaction.amount),
                                    answers=None,
                                    payment_data={
                                        "status": "approved",
                                        "id": payment_id,
                                        "asaas_payment_id": payment_id,
                                        "date_created": datetime.now().isoformat()
                                    }
                                )
                                if deal_id:
                                    transaction.bitrix_deal_id = str(deal_id)
                                    transaction.bitrix_sync_status = 'synced'
                                    transaction.save()
                                    logger.info(f"      ✅ Bitrix Synced. Deal: {deal_id}")
                            except Exception as be:
                                logger.error(f"      ❌ Bitrix Sync Error: {be}")

            return Response({"status": "received"}, status=200)

        return Response({"status": "ignored"}, status=200)


# --- VIEW 4: COMPRA COMPLETA (REFACTORED) ---

class PlanPricesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Retorna os preços atuais dos planos Standard e Plus diretamente do Bitrix (ou cache).
        """
        standard_details = BitrixService.get_plan_details('standard')
        plus_details = BitrixService.get_plan_details('plus')

        # Fallbacks seguros caso Bitrix esteja offline ou retorno seja None
        price_standard = standard_details.get('price', 0) if standard_details else 0
        price_plus = plus_details.get('price', 150.00) if plus_details else 150.00

        return Response({
            "standard": price_standard,
            "plus": price_plus
        })

class ValidateCouponView(APIView):
    permission_classes = [AllowAny] # Permite validar antes de logar
    
    def post(self, request):
        serializer = CouponValidateSerializer(data=request.data)
        if not serializer.is_valid():
             return Response(serializer.errors, status=400)
        
        code = serializer.validated_data['code']
        amount = serializer.validated_data['amount']
        user = request.user if request.user.is_authenticated else None

        service = AsaasService()
        is_valid, msg, discount, final_price, _ = service.validate_coupon_logic(code, user, amount)

        if not is_valid:
            return Response({"valid": False, "message": msg}, status=200) # Retornamos 200 com valid: False

        return Response({
            "valid": True, 
            "message": msg,
            "discount_amount": float(discount),
            "final_price": float(final_price)
        }, status=200)

# --- VIEW 5: STATUS DA TRANSAÇÃO ---
class TransactionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, external_ref):
        try:
            transaction = Transaction.objects.get(external_reference=external_ref)
            
            # [FIX] Force Check Asaas if Pending (Webhook latency fallback)
            if transaction.status == Transaction.Status.PENDING and transaction.asaas_payment_id:
                try:
                    asaas_service = AsaasService()
                    # Pega pagamento atualizado
                    payment_data = asaas_service._request("GET", f"payments/{transaction.asaas_payment_id}")
                    if payment_data and 'status' in payment_data:
                        new_status_asaas = payment_data['status']
                        new_status_mapped = AsaasService.map_status(new_status_asaas)
                        
                        if transaction.status != new_status_mapped:
                            logger.info(f"🔄 Check-Status: Updating {transaction.external_reference} from {transaction.status} to {new_status_mapped}")
                            transaction.status = new_status_mapped
                            transaction.save()
                            
                            # Trigger Activation if Approved
                            if transaction.status == Transaction.Status.APPROVED:
                                SubscriptionService.activate_subscription_from_transaction(transaction)
                                
                                # [FIX] Sync Bitrix Payment Status
                                try:
                                    meta = transaction.mp_metadata or {}
                                    products = meta.get('original_products', [])
                                    # Fallback questionnaire check handled inside prepare_deal_payment ideally, 
                                    # but let's pass what we have.
                                    
                                    # Need to import here to avoid circular dependency if any (though usually safe in method)
                                    from apps.accounts.services import BitrixService
                                    
                                    payment_data_bitrix = {
                                        "status": "approved", # Explicitly approved
                                        "id": transaction.asaas_payment_id,
                                        "date_created": transaction.created_at.strftime("%Y-%m-%dT%H:%M:%S%z")
                                    }
                                    
                                    BitrixService.prepare_deal_payment(
                                        user=transaction.user,
                                        products_list=products,
                                        plan_title=f"ProtocoloMed - {transaction.plan_type}",
                                        total_amount=float(transaction.amount),
                                        answers=None, # Already synced at checkout
                                        payment_data=payment_data_bitrix
                                    )
                                    logger.info(f"✅ Bitrix Updated for Manual Check: {transaction.external_reference}")
                                except Exception as e:
                                    logger.error(f"⚠️ Bitrix Manual Sync Failed: {e}")

                except Exception as e:
                    logger.error(f"⚠️ Failed to force-check Asaas status: {e}")

            return Response({
                "status": transaction.status,
                "payment_type": transaction.payment_type,
                "cycle": transaction.cycle
            })
        except Transaction.DoesNotExist:
            return Response({"error": "Transação não encontrada."}, status=404)

class CompletePurchaseView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Validation with Serializer
        serializer = PurchaseSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"❌ Validation Errors: {serializer.errors}")
            return Response(serializer.errors, status=400)
        
        validated_data = serializer.validated_data
        
        # Extract basic data
        email = validated_data.get('email')
        import re
        full_name_raw = validated_data.get('full_name', '')
        # [FIX MP 107] Sanitize: Remove numbers and symbols, keep only letters/spaces
        # [MODIFIED] Use raw name as requested by user (no aggressive regex)
        safe_name = full_name_raw.strip()
        if not safe_name: safe_name = "Cliente"

        full_name_list = safe_name.split()
        first_name = full_name_list[0]
        last_name = " ".join(full_name_list[1:]) if len(full_name_list) > 1 else "Client"
        cpf = validated_data.get('cpf')
        
        total_price = float(validated_data.get('total_price', 0))
        original_amount = total_price  # Guarda o valor original recebido do front (customizado ou não)
        plan_id = validated_data.get('plan_id')
        payment_method = validated_data.get('payment_method_id')
        billing_cycle = validated_data.get('billing_cycle', 'monthly') # 'monthly' or 'monthly_subscription' (or 'quarterly' mapped to sub)

        external_ref = str(uuid.uuid4())

        # [DEBUG] Log incoming products
        raw_products = request.data.get('products', [])
        logger.info(f"🛒 Checkout Initialized for {email}. Cycle: {billing_cycle}")

        # 2. Get or Create User
        try:
             user = self._get_or_create_user(request, validated_data)
        except ValueError as e:
             return Response({"error": str(e)}, status=400)
        
        # 3. COUPON VALIDATION (Override Price)
        coupon_code = validated_data.get('coupon_code')
        coupon_instance = None
        discount_amount = 0.0

        if coupon_code:
            # [FIX] Use AsaasService logic (FinancialService removed)
            asaas_service = AsaasService()
            is_valid, msg, discount, final_price_val, coupon_inst = asaas_service.validate_coupon_logic(coupon_code, user, total_price)
            if is_valid:
                logger.info(f"🏷️ Cupom {coupon_code} aplicado! Desconto: {discount}. Novo Valor: {final_price_val}")
                total_price = float(final_price_val)
                discount_amount = float(discount)
                coupon_instance = coupon_inst
            else:
                 logger.warning(f"⚠️ Cupom {coupon_code} inválido na finalização: {msg}")
                 # Decisão: Prosseguir sem desconto ou bloquear? 
                 # Melhor prosseguir avisando, mas o cliente já viu no front. Se mudou algo, cobramos o cheio.

        # 4. IMPLEMENTAÇÃO DE PISO (ASAAS MÍNIMO R$ 5,00)
        # O Asaas rejeita transações menores que R$ 5,00.
        if 0 < total_price < 5.00:
             logger.warning(f"⚠️ Valor original R$ {total_price} insuficiente para Asaas (Min R$ 5,00).")
             return Response({"error": "O valor mínimo para transação é R$ 5,00. Adicione mais itens ao carrinho."}, status=400)

        # 4. Integrate with Asaas
        asaas_service = AsaasService()
        payment_result = None
        is_subscription = False
        asaas_payment_id = None
        asaas_subscription_id = None
        final_status = Transaction.Status.PENDING

        try:
             # 4.1 Get/Create Customer
             customer_data = {
                 "name": safe_name,
                 "email": email,
                 "cpf": cpf,
                 "phone": validated_data.get('phone') or request.data.get('phone') or '' # Try both sources
             }
             customer_id_asaas = asaas_service.get_or_create_customer(customer_data)
             
             if not customer_id_asaas:
                 return Response({"error": "Erro ao criar cliente no Asaas."}, status=500)
             
             # Save Asaas ID to User
             if user.asaas_customer_id != customer_id_asaas:
                 user.asaas_customer_id = customer_id_asaas
                 user.save()

             # 4.2 Prepare Card Data (Pass-Through - RAM only)
             card_data = None
             if payment_method == 'credit_card':
                 # FRONTEND DEVE ENVIAR ESSA ESTRUTURA
                 # "credit_card": { "holderName": "...", "number": "...", "expiryMonth": "...", "expiryYear": "...", "ccv": "..." }
                 card_raw = request.data.get('credit_card', {})
                 if not card_raw:
                     return Response({"error": "Dados do cartão obrigatórios."}, status=400)
                 
                 card_data = {
                     "holderName": card_raw.get('holderName'),
                     "number": card_raw.get('number'),
                     "expiryMonth": card_raw.get('expiryMonth'),
                     "expiryYear": card_raw.get('expiryYear'),
                     "ccv": card_raw.get('ccv'),
                     "holderInfo": card_raw.get('holderInfo', {}) # {name, email, cpf, postalCode, ...}
                 }

             # 4.3 Decide: Subscription vs Payment
             # [FIX] 'one_off' must force single payment
             is_subscription_flow = (billing_cycle in ['monthly', 'quarterly']) and (payment_method == 'credit_card')
             
             if is_subscription_flow:
                 # --- UPGRADE CHECK ---
                 if user.subscription_status == 'active' and user.current_plan != plan_id and user.current_plan != 'none':
                      logger.info(f"🔄 Processing Upgrade for {email} ({user.current_plan} -> {plan_id})")
                      success_upg, msg_upg = asaas_service.upgrade_subscription(user, plan_id, total_price, card_data)
                      if success_upg:
                           return Response({"status": "success", "message": msg_upg, "upgrade": True}, status=200)
                      else:
                           return Response({"error": f"Falha no Upgrade: {msg_upg}"}, status=400)
                 # ---------------------

                 cycle_months = 3 if billing_cycle == 'quarterly' else 1
                 logger.info(f"🔄 Starting Asaas Subscription Flow ({cycle_months}m) for {email}")
                 
                 response = asaas_service.create_subscription(
                     customer_id=customer_id_asaas, 
                     value=total_price, 
                     cycle_months=cycle_months, 
                     card_data=card_data,
                     description=f"Assinatura ProtocoloMed - {plan_id}"
                 )
                 
                 if response and 'id' in response:
                     is_subscription = True
                     asaas_subscription_id = response['id']
                     payment_result = response
                     if response.get('status') == 'ACTIVE':
                         final_status = Transaction.Status.APPROVED
                 else:
                     return Response({"error": "Erro ao criar assinatura.", "detail": response}, status=400)

             else:
                 # One-off Payment (Pix or Credit Card Single)
                 logger.info(f"🚀 Processing Asaas One-Off ({payment_method}) for {email}")
                 billing_type = "PIX" if payment_method == 'pix' else "CREDIT_CARD"
                 
                 response = asaas_service.create_payment(
                     customer_id=customer_id_asaas,
                     billing_type=billing_type,
                     value=total_price,
                     card_data=card_data, # Ignored if PIX
                     description=f"Pedido ProtocoloMed - {plan_id}"
                 )

                 if response and 'id' in response:
                     asaas_payment_id = response['id']
                     payment_result = response
                     status_asaas = response.get('status')
                     
                     if status_asaas in ['CONFIRMED', 'RECEIVED']:
                         final_status = Transaction.Status.APPROVED
                     elif status_asaas == 'PENDING':
                         final_status = Transaction.Status.PENDING
                     else:
                         final_status = Transaction.Status.REJECTED  # Ou pending/failed
                         
                 else:
                      return Response({"error": "Erro ao criar cobrança.", "detail": response}, status=400)
        
        except Exception as e:
            logger.exception(f"❌ Asaas Flow Error: {e}")
            return Response({"error": "Erro interno no processamento."}, status=500)

        # 5. Persistence Transaction
        try:
            with db_transaction.atomic():
                transaction = Transaction.objects.create(
                    user=user, 
                    plan_type=plan_id, 
                    amount=original_amount, # Salva o valor original (antes do desconto/cupom)
                    paid_amount=total_price, # Salva o valor final pago
                    cycle=billing_cycle,
                    external_reference=external_ref, 
                    status=final_status,
                    payment_type=Transaction.PaymentType.PIX if payment_method == 'pix' else Transaction.PaymentType.CREDIT_CARD,
                    asaas_payment_id=asaas_payment_id,
                    asaas_subscription_id=asaas_subscription_id,
                    coupon=coupon_instance, 
                    discount_amount=discount_amount 
                )
                
                # INCREMENT COUPON USAGE
                if coupon_instance and final_status in [Transaction.Status.APPROVED, Transaction.Status.PENDING]:
                    # Consideramos 'Pending' como uso também para evitar race condition no Pix?
                    # Melhor contar apenas Approved ou incrementar agora e decrementar se falhar/cancelar?
                    # Por simplicidade e segurança, incrementamos. Admin pode corrigir.
                    from django.db.models import F
                    coupon_instance.current_uses = F('current_uses') + 1
                    coupon_instance.save()

                # TRIGGER AUTOMATIC ACTIVATION
                if transaction.status == Transaction.Status.APPROVED:
                    SubscriptionService.activate_subscription_from_transaction(transaction)

                # LEGACY MAPPING FOR COMPATIBILITY (Bitrix & Response)
                # O Frontend e o Bitrix esperam algumas variáveis com nomes antigos do MP ou padronizados.
                mp_id_value = asaas_payment_id
                subscription_id_value = asaas_subscription_id
                status_mp = payment_result.get('status') if payment_result else 'unknown'
                
                # Bitrix Integration
                bitrix_success = False
                deal_id = None
                try:
                    # Pass correct ID (Subscription ID or Payment ID) depending on flow
                    integ_id = subscription_id_value if is_subscription else mp_id_value
                    # Construct temp result wrapper for Bitrix
                    bitrix_payment_result = payment_result.copy()
                    bitrix_payment_result['id'] = integ_id
                    
                    deal_id = self._handle_bitrix_integration(user, validated_data, bitrix_payment_result, plan_id, total_price, coupon_code)
                    if deal_id: bitrix_success = True
                except Exception as e:
                    logger.error(f"⚠️ Bitrix Sync Failed: {e}")

                transaction.bitrix_sync_status = 'synced' if bitrix_success else 'failed'
                if bitrix_success: transaction.bitrix_deal_id = str(deal_id)
                
                # Metadata Snapshot
                sanitized_products = [{"id": p.get("id"), "name": p.get("name"), "price": p.get("price")} for p in raw_products]
                meta_data = {
                    "payment_response": payment_result, # [ASAAS ADAPTATION] Save full JSON
                    "original_products": sanitized_products, 
                    "questionnaire_snapshot": validated_data.get('questionnaire_data', {}),
                    "is_subscription": is_subscription,
                    "coupon_code": coupon_code 
                }
                transaction.mp_metadata = self._make_json_serializable(meta_data)
                transaction.save()

                # Cache Clear
                from django.core.cache import cache
                cache.delete(f"user_protocol_{user.id}")
                cache.delete(f"user_profile_full_{user.id}")

                # Response Construction
                refresh = RefreshToken.for_user(user)
                response_data = {
                    "status": "success", 
                    "payment_status": str(status_mp).lower(),
                    "access": str(refresh.access_token), 
                    "user": {"id": user.id, "email": user.email},
                    "order_id": external_ref
                }
                
                if payment_method == 'pix':
                     # [ASAAS ADAPTATION]
                     # Asaas retorna: 'encodedImage' (base64) e 'payload' (copia e cola)
                     response_data['pix_data'] = {
                         "qr_code": payment_result.get('payload'), # Copia e Cola
                         "qr_code_base64": payment_result.get('encodedImage'), # Imagem Base64
                         "ticket_url": payment_result.get('invoiceUrl') # Link da Fatura
                     }

                return Response(response_data, status=201)

        except Exception as e:
            logger.exception(f"❌ Internal Consistency Error: {e}")
            return Response({"error": "Erro ao finalizar pedido (consistência)."}, status=500)

    def _sanitize_payment_data(self, payment_result):
        """
        Remove dados sensíveis e desnecessários do payload do Mercado Pago.
        """
        if not payment_result or not isinstance(payment_result, dict):
            return {}
        
        sanitized = payment_result.copy()
        
        # Campos para remover (PII excessiva ou dados técnicos irrelevantes)
        keys_to_remove = [
            'card', 'payer', 'additional_info', 'processing_mode', 'merchant_account_id'
        ]
        
        for key in keys_to_remove:
            sanitized.pop(key, None)
            
        # Manter apenas dados essenciais do payer se necessário, mas o MP já retorna seguro.
        # Reforço de segurança: garantindo que não salvamos objeto card completo se vier
        if 'card' in sanitized: del sanitized['card']
            
        return sanitized

    def _make_json_serializable(self, data):
        """
        Recursively converts Decimal objects to floats (or strings) so they can be serialized to JSON.
        Handles dicts, lists, and direct Decimal values.
        """
        from decimal import Decimal
        if isinstance(data, dict):
            return {k: self._make_json_serializable(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._make_json_serializable(v) for v in data]
        elif isinstance(data, Decimal):
            return float(data)
        elif hasattr(data, 'pk') and hasattr(data, '__dict__'): # Handle basic model instances if any slip through
             return str(data)
        return data

    def _extract_error_message(self, payment_result):
        if not payment_result: return "Erro desconhecido"
        msg = payment_result.get('message') or payment_result.get('status_detail') or "Falha no pagamento"
        if 'cause' in payment_result:
            causes = payment_result.get('cause')
            if causes and isinstance(causes, list):
                msg = f"{msg}: {causes[0].get('description')}"
        return msg

    def _get_or_create_user(self, request, validated_data):
        if request.user and request.user.is_authenticated:
            return request.user
        
        # Check if email exists to avoid duplication error if not caught by serializer
        # Assuming RegisterSerializer handles creation specifics (checking email uniqueness etc)
        # Re-using logic from original code passing data to serializer
        # Note: Validated data is clean, but RegisterSerializer needs raw or dict
        
        from apps.accounts.models import User
        email = validated_data.get('email')
        existing = User.objects.filter(email=email).first()
        if existing:
            return existing
            
        # Create new user
        register_serializer = RegisterSerializer(data=request.data) # Use raw data for full reg
        if register_serializer.is_valid():
             return register_serializer.save()
        raise ValueError("Invalid User Data for Creation")

    def _handle_bitrix_integration(self, user, validated_data, payment_result, plan_id, total_price, coupon_code=None):
        """
        Tenta realizar a integração completa. Retorna o Deal ID se sucesso, ou lança exceção.
        """
        if not BitrixService: return None

        # 1. Lead/Contact Sync
        if not user.id_bitrix:
            bitrix_id = BitrixService.create_lead(user, validated_data.get('questionnaire_data'), validated_data.get('address_data'))
            if bitrix_id:
                user.id_bitrix = str(bitrix_id)
                user.save()
        
        # 2. Update Contact
        BitrixService.update_contact_data(user.id_bitrix, validated_data.get('cpf'), validated_data.get('phone'))

        # 3. Prepare Deal
        from apps.accounts.config import BitrixConfig
        products = validated_data.get('products', [])
        
        # [FIX UPGRADE] Remover produtos que sejam PLANOS antigos (Standard/Plus) para evitar duplicidade
        all_plan_ids = BitrixConfig.PLAN_IDS.values() # [262, 264, etc]
        
        # Filtrar produtos que NÃO sejam planos
        filtered_products = [
            p for p in products 
            if int(p.get('id', 0)) not in all_plan_ids
        ]
        
        final_products = list(filtered_products)
        
        # Add New Plan Item
        if hasattr(BitrixService, 'get_plan_details'):
            plan_item = BitrixService.get_plan_details(plan_id)
            if plan_item: final_products.append(plan_item)
        
        payment_info_bitrix = {
            "id": payment_result.get('id'),
            "date_created": payment_result.get('date_created'),
            "status": payment_result.get('status')
        }

        # Returns Deal ID or None
        return BitrixService.prepare_deal_payment(
            user, 
            final_products, 
            f"ProtocoloMed - {plan_id}", 
            total_price, 
            validated_data.get('questionnaire_data'), 
            payment_data=payment_info_bitrix,
            coupon_code=coupon_code
        )

# --- VIEW 6: CANCELAMENTO DE ASSINATURA ---
class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        reason = request.data.get('reason', 'Não informado')
        
        # Security Check: User must have a plan to cancel
        if user.current_plan == 'none' and user.subscription_status != 'active':
             return Response({"error": "Você não possui uma assinatura ativa."}, status=400)

        service = AsaasService()
        success, message = service.cancel_subscription(user, reason)
        
        if success:
             return Response({"status": "success", "message": message}, status=200)
        else:
             return Response({"error": message}, status=500)