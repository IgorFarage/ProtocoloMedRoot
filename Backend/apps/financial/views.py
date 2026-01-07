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
from apps.accounts.serializers import RegisterSerializer

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
            except Exception as e: print(f"⚠️ Erro Bitrix: {e}")

        try:
            transaction = Transaction.objects.create(
                user=user, plan_type=plan_id, amount=final_amount, cycle=billing_cycle,
                external_reference=str(uuid.uuid4()), status=Transaction.Status.PENDING
            )
            return Response({"checkout_url": "", "external_reference": transaction.external_reference, "amount": float(transaction.amount)}, status=200)
        except Exception as e: return Response({"error": "Erro interno."}, status=500)


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
        except Exception as e: return Response({"error": str(e)}, status=500)


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
            except: pass
        return Response({"status": "received"}, status=200)


# --- VIEW 4: COMPRA COMPLETA (CORRIGIDA) ---
class CompletePurchaseView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        
        # 1. Validação
        register_serializer = RegisterSerializer(data=data)
        if not register_serializer.is_valid():
            return Response(register_serializer.errors, status=400)

        # Dados
        plan_id = data.get('plan_id')
        total_price = float(data.get('total_price', 0))
        billing_cycle = data.get('billing_cycle', 'monthly')
        payment_method = data.get('payment_method_id') 
        
        address_data = data.get('address_data', {})
        answers = data.get('questionnaire_data', {})
        
        print(f"🔍 [DEBUG] Respostas: {len(answers)} | Valor: {total_price} | Método: {payment_method}")

        full_name = data.get('full_name', '').split()
        first_name = full_name[0]
        last_name = " ".join(full_name[1:]) if len(full_name) > 1 else "Client"
        external_ref = str(uuid.uuid4())
        email = data.get('email')
        cpf = data.get('cpf', '').replace('.', '').replace('-', '')

        # 2. Payload Pagamento
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

        # SEPARAÇÃO CLARA: PIX vs CARTÃO
        if payment_method == 'pix':
            pass # Pix vai limpo, sem token e sem installments
        else:
            payment_payload["token"] = data.get('token')
            payment_payload["installments"] = int(data.get('installments', 1))

        # 3. Processa
        financial_service = FinancialService()
        
        # AGORA VAI FUNCIONAR O PRINT (json foi importado)
        print(f"🚀 Enviando Payload ({payment_method}): {json.dumps(payment_payload, indent=2)}")
        
        payment_result = financial_service.process_direct_payment(payment_payload)

        # Retry Internacional
        if payment_method != 'pix' and payment_result and 'cause' in payment_result:
            causes = payment_result.get('cause', [])
            if isinstance(causes, list) and any(str(c.get('code')) == '10114' for c in causes):
                print("⚠️ Retry 1x (Internacional)...")
                payment_payload['installments'] = 1
                payment_payload['external_reference'] = f"{external_ref}_retry"
                payment_result = financial_service.process_direct_payment(payment_payload)

        # Valida Sucesso
        is_success = False
        if payment_result:
            status_mp = payment_result.get('status')
            if status_mp == 'approved': is_success = True
            if payment_method == 'pix' and status_mp == 'pending': is_success = True

        if not is_success:
            error_msg = "Erro desconhecido"
            if payment_result:
                error_msg = payment_result.get('message') or payment_result.get('status_detail')
                if 'cause' in payment_result:
                    causes = payment_result.get('cause')
                    if causes and isinstance(causes, list):
                        error_msg = f"{error_msg}: {causes[0].get('description')}"
            
            print(f"❌ FALHA PAGAMENTO: {json.dumps(payment_result, indent=2)}")
            return Response({"error": "Pagamento não realizado", "detail": error_msg}, status=400)

        # 4. Salva
        try:
            with db_transaction.atomic():
                user = register_serializer.save()
                Transaction.objects.create(
                    user=user, plan_type=plan_id, amount=total_price, cycle=billing_cycle,
                    external_reference=external_ref, 
                    status=Transaction.Status.PENDING,
                    payment_type=Transaction.PaymentType.PIX if payment_method == 'pix' else Transaction.PaymentType.CREDIT_CARD,
                    mercado_pago_id=str(payment_result.get('id'))
                )

                try:
                    if BitrixService:
                        bitrix_id = BitrixService.create_lead(user, answers, address_data)
                        if bitrix_id:
                            user.id_bitrix = str(bitrix_id)
                            user.save()
                            
                            products = data.get('products', [])
                            final_products = list(products)
                            if hasattr(BitrixService, 'get_plan_details'):
                                plan_item = BitrixService.get_plan_details(plan_id)
                                if plan_item: final_products.append(plan_item)
                            
                            BitrixService.prepare_deal_payment(user, final_products, f"ProtocoloMed - {plan_id}", total_price, answers)
                except Exception as e: print(f"⚠️ Erro Bitrix: {e}")

                refresh = RefreshToken.for_user(user)
                response_data = {"status": "success", "access": str(refresh.access_token), "user": {"id": user.id, "email": user.email}}
                
                if payment_method == 'pix':
                    poi = payment_result.get('point_of_interaction', {}).get('transaction_data', {})
                    response_data['pix_data'] = {
                        "qr_code": poi.get('qr_code'),
                        "qr_code_base64": poi.get('qr_code_base64'),
                        "ticket_url": poi.get('ticket_url')
                    }

                return Response(response_data, status=201)

        except Exception as e:
            print(f"❌ Erro Interno: {e}")
            return Response({"error": "Erro interno."}, status=500)