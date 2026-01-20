import uuid
import logging
import json 
from django.conf import settings
from django.db import transaction as db_transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Transaction
from .services import FinancialService
from .serializers import PurchaseSerializer
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


# --- VIEW 2: PROCESSAMENTO ISOLADO ---
class ProcessTransparentPaymentView(APIView):
    permission_classes = [AllowAny] 
    def post(self, request):
        try:
            payment_data = request.data
            if not payment_data.get("token") and payment_data.get("payment_method_id") != "pix":
                return Response({"error": "Token obrigatório."}, status=400)
            
            financial_service = FinancialService()
            payload = {
                "transaction_amount": float(payment_data.get("transaction_amount", 0)),
                "token": payment_data.get("token"),
                "description": payment_data.get("description", "Compra"),
                "installments": int(payment_data.get("installments", 1)),
                "payment_method_id": payment_data.get("payment_method_id"),
                "payer": payment_data.get("payer"),
                "external_reference": payment_data.get("external_reference")
            }
            if payload["payment_method_id"] == "pix":
                payload.pop("token", None)
                payload.pop("installments", None)

            payment_response = financial_service.process_direct_payment(payload)
            if payment_response: return Response(payment_response, status=200) 
            return Response({"error": "Erro Gateway."}, status=400)
        except Exception as e: 
            logger.exception("Error processing transparent payment")
            return Response({"error": str(e)}, status=500)


# --- VIEW 3: WEBHOOK ---
class WebhookView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        topic = request.query_params.get("topic") or request.data.get("type")
        mp_id = request.query_params.get("id") or request.data.get("data", {}).get("id")
        if topic == "payment" and mp_id:
            try:
                financial_service = FinancialService()
                payment_info = financial_service.get_payment_info(mp_id)
                if payment_info:
                    ext_ref = payment_info.get("external_reference")
                    status = payment_info.get("status")
                    transaction = Transaction.objects.filter(external_reference=ext_ref).first()
                    if transaction:
                        if status == "approved": transaction.status = Transaction.Status.APPROVED
                        elif status == "rejected": transaction.status = Transaction.Status.REJECTED
                        transaction.mercado_pago_id = str(mp_id)
                        transaction.save()
            except Exception as e: logger.error(f"Webhook Error: {e}")
        return Response({"status": "received"}, status=200)


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
        full_name_list = validated_data.get('full_name').split()
        first_name = full_name_list[0]
        last_name = " ".join(full_name_list[1:]) if len(full_name_list) > 1 else "Client"
        cpf = validated_data.get('cpf')
        
        total_price = float(validated_data.get('total_price', 0))
        plan_id = validated_data.get('plan_id')
        payment_method = validated_data.get('payment_method_id')
        external_ref = str(uuid.uuid4())

        # [DEBUG] Log incoming products
        raw_products = request.data.get('products', [])
        val_products = validated_data.get('products', [])
        logger.info(f"🛒 Checkout Initialized for {email}. Raw Products: {len(raw_products)} | Validated Products: {len(val_products)}")
        if raw_products:
             logger.info(f"📦 First Product IDs: {[p.get('id') for p in raw_products[:5]]}")

        # 2. Payment Payload Construction
        payment_payload = {
            "transaction_amount": total_price,
            "description": f"ProtocoloMed - {plan_id}",
            "payment_method_id": payment_method,
            "payer": {
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "identification": {"type": "CPF", "number": cpf}
            },
            "external_reference": external_ref
        }
        

        # 3. Get or Create User (Before Payment to get Customer ID)
        try:
             user = self._get_or_create_user(request, validated_data)
        except ValueError as e:
             return Response({"error": str(e)}, status=400)

        # 3. Process Payment
        financial_service = FinancialService()
        payment_result = None

        logger.info(f"🚀 Processing Simple Payment ({payment_method}) for {email}")
        
        # Prepare Simple Payment Payload for ALL methods (Credit Card & Pix)
        if payment_method != 'pix':
            payment_payload["token"] = validated_data.get('token')
            payment_payload["installments"] = validated_data.get('installments', 1)

        # UNIFIED CALL - Direct Payment (No Subscription/Customer extraction)
        payment_result = financial_service.process_direct_payment(payment_payload)

        # Retry Logic (Generic International or other specific errors)
        if payment_method != 'pix' and payment_result and 'cause' in payment_result:
            causes = payment_result.get('cause', [])
            if isinstance(causes, list) and any(str(c.get('code')) == '10114' for c in causes):
                logger.warning("⚠️ Retry 1x (Internacional)...")
                payment_payload['installments'] = 1
                payment_payload['external_reference'] = f"{external_ref}_retry"
                payment_result = financial_service.process_direct_payment(payment_payload)

        # Evaluate Payment Success
        is_success = False
        status_mp = "rejected"
        mp_id_value = None

        if payment_result:
            status_mp = payment_result.get('status')
            mp_id_value = str(payment_result.get('id', ''))
            # Subscription success is 'authorized'
            if status_mp in ['approved', 'in_process', 'authorized']: is_success = True
            if payment_method == 'pix' and status_mp == 'pending': is_success = True

        if not is_success:
            error_msg = self._extract_error_message(payment_result)
            logger.error(f"❌ Payment Failed: {error_msg}")
            return Response({"error": "Pagamento não realizado", "detail": error_msg}, status=400)

        # 4. Persistence
        try:
            with db_transaction.atomic():
                # User is already created/retrieved
                
                transaction = Transaction.objects.create(
                    user=user, 
                    plan_type=plan_id, 
                    amount=total_price, 
                    cycle=validated_data.get('billing_cycle'),
                    external_reference=external_ref, 
                    status=Transaction.Status.APPROVED if is_success else Transaction.Status.PENDING,
                    payment_type=Transaction.PaymentType.PIX if payment_method == 'pix' else Transaction.PaymentType.CREDIT_CARD,
                    mercado_pago_id=mp_id_value
                )

                # TRIGGER AUTOMATIC SUBSCRIPTION/PLAN ACTIVATION
                if transaction.status == Transaction.Status.APPROVED:
                    SubscriptionService.activate_subscription_from_transaction(transaction)

                # Bitrix Integration
                bitrix_success = False
                deal_id = None
                try:
                    deal_id = self._handle_bitrix_integration(user, validated_data, payment_result, plan_id, total_price)
                    if deal_id:
                        bitrix_success = True
                except Exception as e:
                    logger.error(f"⚠️ Bitrix Sync Failed directly after purchase: {e}")

                # Update Transaction with Sync Status
                transaction.bitrix_sync_status = 'synced' if bitrix_success else 'failed'
                if bitrix_success: transaction.bitrix_deal_id = str(deal_id)
                # [MODIFICAÇÃO: Snapshot de Contexto para Resiliência]
                # [OTIMIZAÇÃO] Salvar apenas dados essenciais para economizar espaço no DB
                raw_products = request.data.get('products', [])
                sanitized_products = [
                    {
                        "id": p.get("id"), 
                        "name": p.get("name"), 
                        "price": p.get("price")
                    } for p in raw_products
                ]

                meta_data = {
                    "payment_response": self._sanitize_payment_data(payment_result),
                    "original_products": sanitized_products, 
                    "questionnaire_snapshot": validated_data.get('questionnaire_data', {})
                }
                # Fix: Convert Decimals to float/str for JSON serialization
                transaction.mp_metadata = self._make_json_serializable(meta_data)
                transaction.save()

                # [FIX CACHE] Limpar cache do protocolo para refletir mudança imediata (Standard -> Plus)
                from django.core.cache import cache
                cache.delete(f"user_protocol_{user.id}")
                cache.delete(f"user_profile_full_{user.id}")

                # Return Success Response
                refresh = RefreshToken.for_user(user)
                response_data = {
                    "status": "success", 
                    "payment_status": status_mp,
                    "access": str(refresh.access_token), 
                    "user": {"id": user.id, "email": user.email},
                    "order_id": external_ref
                }
                
                if payment_method == 'pix':
                    poi = payment_result.get('point_of_interaction', {}).get('transaction_data', {})
                    response_data['pix_data'] = {
                        "qr_code": poi.get('qr_code'),
                        "qr_code_base64": poi.get('qr_code_base64'),
                        "ticket_url": poi.get('ticket_url')
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

    def _handle_bitrix_integration(self, user, validated_data, payment_result, plan_id, total_price):
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
            payment_data=payment_info_bitrix
        )