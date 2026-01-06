import uuid
import logging
from django.conf import settings
from django.db import transaction as db_transaction # Importante para o atomic
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny # <--- O erro estava aqui (faltava AllowAny)
from rest_framework_simplejwt.tokens import RefreshToken # <--- Necessário para o login automático

# Imports dos seus Apps
from .models import Transaction
from .services import FinancialService
from apps.accounts.serializers import RegisterSerializer # <--- Necessário para validar o cadastro
#from apps.accounts.services import BitrixService # <--- Necessário para enviar ao CRM

logger = logging.getLogger(__name__)

# Tenta importar o BitrixService, mas previne erro
try:
    from apps.accounts.services import BitrixService
except ImportError:
    BitrixService = None

class CreateCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        
        plan_id = data.get('plan_id') # 'standard' ou 'plus'
        billing_cycle = data.get('billing_cycle', 'monthly')
        products = data.get('products', []) 
        
        if not products:
            return Response({"error": "Nenhum produto encontrado."}, status=400)

        # 1. Soma dos Medicamentos
        try:
            medication_total = sum(float(p.get('price', 0)) for p in products)
        except ValueError:
            return Response({"error": "Erro no valor dos produtos."}, status=400)
        
        # 2. Busca Preço do Plano no Bitrix (Dinâmico)
        plan_item = None
        service_price = 0.0
        
        if BitrixService:
            plan_item = BitrixService.get_plan_details(plan_id)
            if plan_item:
                service_price = plan_item['price']
                print(f"💰 Preço do {plan_id} vindo do Bitrix: R$ {service_price}")
            else:
                # Fallback de segurança se o Bitrix cair
                print(f"⚠️ Falha ao buscar plano {plan_id} no Bitrix. Usando fallback.")
                service_price = 150.00 if plan_id == 'plus' else 0.00
        
        base_total = medication_total + service_price
        
        # 3. Cálculo Final (Desconto Trimestral)
        if billing_cycle == 'quarterly':
             final_amount = (base_total * 3) * 0.90
             plan_title = f"ProtocoloMed - {plan_id.capitalize()} (Trimestral)"
        else:
             final_amount = base_total
             plan_title = f"ProtocoloMed - {plan_id.capitalize()} (Mensal)"

        # 4. Atualiza Bitrix (Deal)
        if BitrixService:
            try:
                final_products = list(products)
                # Adiciona o item do plano na lista de produtos do CRM
                if plan_item:
                    final_products.append(plan_item)
                elif service_price > 0:
                     final_products.append({"id": "264", "name": "Taxa Plus (Fallback)", "price": service_price})

                BitrixService.prepare_deal_payment(user, final_products, plan_title, final_amount)
            except Exception as e:
                print(f"⚠️ Erro Bitrix (Ignorado): {e}")

        # 5. Cria Transação Local
        try:
            transaction = Transaction.objects.create(
                user=user,
                plan_type=plan_id,
                amount=final_amount,
                cycle=billing_cycle,
                external_reference=str(uuid.uuid4()),
                status=Transaction.Status.PENDING
            )
            
            return Response({
                "checkout_url": "",
                "external_reference": transaction.external_reference,
                "amount": float(transaction.amount)
            }, status=200)
            
        except Exception as e:
            return Response({"error": "Erro interno ao criar pedido."}, status=500)

class WebhookView(APIView):
    permission_classes = [] # Public endpoint
    authentication_classes = [] # No auth required for callbacks

    def post(self, request):
        data = request.data
        action_type = data.get('type')
        
        if action_type == 'payment':
            payment_id = data.get('data', {}).get('id')
            
            # Validação Segura com SDK
            financial_service = FinancialService()
            payment_info = financial_service.sdk.payment().get(payment_id)
            
            if payment_info["status"] == 200:
                payment_data = payment_info["response"]
                external_ref = payment_data.get("external_reference")
                status = payment_data.get("status")
                
                try:
                    with transaction.atomic():
                        # Atualiza Transação
                        txn = Transaction.objects.get(external_reference=external_ref)
                        
                        if status == 'approved':
                            txn.status = Transaction.Status.APPROVED
                            
                            # Atualiza Usuário
                            user = txn.user
                            user.current_plan = txn.plan_type
                            user.save()
                            
                        elif status == 'rejected':
                            txn.status = Transaction.Status.REJECTED
                        
                        txn.mercado_pago_id = str(payment_id)
                        txn.payment_type = payment_data.get("payment_type_id", Transaction.PaymentType.UNKNOWN)
                        txn.save()
                        
                        print(f"Webhook Processado: {txn}")
                        
                except Transaction.DoesNotExist:
                    print(f"Transação não encontrada para ref: {external_ref}")
                except Exception as e:
                    print(f"Erro no processamento do webhook: {e}")
                    
        return Response(status=200)

class ProcessTransparentPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        # 1. Recebe os dados do Frontend
        token = data.get('token')
        external_reference = data.get('external_reference')
        installments = data.get('installments', 1)
        payment_method_id = data.get('payment_method_id')
        issuer_id = data.get('issuer_id')

        print(f"💳 Processando pagamento para Ref: {external_reference}")

        # 2. Busca a Transação Original
        try:
            txn = Transaction.objects.get(external_reference=external_reference, user=user)
        except Transaction.DoesNotExist:
            return Response({"error": "Transação não encontrada."}, status=404)

        # 3. Monta o Payload para o Mercado Pago
        # Lógica para separar Nome e Sobrenome baseada no full_name
        names = user.full_name.split()
        first_name = names[0]
        last_name = " ".join(names[1:]) if len(names) > 1 else ""
        
        payment_data = {
            "transaction_amount": float(txn.amount),
            "token": token,
            "description": f"ProtocoloMed - {txn.plan_type.capitalize()}",
            "installments": int(installments),
            "payment_method_id": payment_method_id,
            "issuer_id": issuer_id,
            "payer": {
                "email": user.email,
                "first_name": first_name,
                "last_name": last_name,
                "identification": {
                    "type": "CPF",
                    "number": data.get('payer', {}).get('identification', {}).get('number') 
                }
            },
            "external_reference": external_reference
        }

        # 4. Chama o Service
        service = FinancialService()
        result = service.process_direct_payment(payment_data)

        # 5. Trata a resposta
        if result and result.get('status') == 'approved':
            with db_transaction.atomic():
                txn.status = Transaction.Status.APPROVED
                txn.mercado_pago_id = str(result.get('id'))
                txn.save()

                # Atualiza plano do usuário
                user.current_plan = txn.plan_type
                user.save()
            
            return Response({"status": "approved"}, status=200)
        
        else:
            # Se falhou
            txn.status = Transaction.Status.REJECTED
            txn.save()
            return Response({
                "status": "rejected", 
                "status_detail": result.get('status_detail') if result else "Erro no processamento"
            }, status=400)

class CompletePurchaseView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        
        # 1. Validação do Cadastro
        register_serializer = RegisterSerializer(data=data)
        if not register_serializer.is_valid():
            return Response(register_serializer.errors, status=400)

        # Dados Gerais
        plan_id = data.get('plan_id')
        total_price = float(data.get('total_price', 0))
        billing_cycle = data.get('billing_cycle', 'monthly')
        payment_method = data.get('payment_method_id') # 'pix' ou 'master', 'visa'...
        
        # Bitrix Data
        address_data = data.get('address_data', {})
        answers = data.get('questionnaire_data', {})

        # Identificação
        full_name = data.get('full_name', '').split()
        first_name = full_name[0]
        last_name = " ".join(full_name[1:]) if len(full_name) > 1 else "Client"
        external_ref = str(uuid.uuid4())
        email = data.get('email')
        cpf = data.get('cpf', '').replace('.', '').replace('-', '')

        # 2. CONFIGURAÇÃO DO PAYLOAD (Diferença Cartão vs PIX)
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

        # Lógica Específica
        if payment_method == 'pix':
            # PIX não tem token nem parcelas
            pass 
        else:
            # Cartão exige token e parcelas
            payment_payload["token"] = data.get('token')
            payment_payload["installments"] = 1

        # 3. PROCESSA PAGAMENTO
        financial_service = FinancialService()
        payment_result = financial_service.process_direct_payment(payment_payload)

        # Validação: 
        # Cartão -> status='approved'
        # PIX -> status='pending' (QR Code gerado)
        is_success = False
        if payment_result:
            status_mp = payment_result.get('status')
            if status_mp == 'approved': is_success = True
            if payment_method == 'pix' and status_mp == 'pending': is_success = True

        if not is_success:
            error_msg = payment_result.get('status_detail') if payment_result else "Erro desconhecido"
            return Response({"error": "Pagamento não realizado", "detail": error_msg}, status=400)

        # 4. SALVAMENTO NO BANCO
        try:
            with db_transaction.atomic():
                user = register_serializer.save()
                
                Transaction.objects.create(
                    user=user,
                    plan_type=plan_id,
                    amount=total_price,
                    cycle=billing_cycle,
                    external_reference=external_ref,
                    status=Transaction.Status.APPROVED if payment_result.get('status') == 'approved' else Transaction.Status.PENDING,
                    payment_type=Transaction.PaymentType.PIX if payment_method == 'pix' else Transaction.PaymentType.CREDIT_CARD,
                    mercado_pago_id=str(payment_result.get('id'))
                )

                # Bitrix
                try:
                    full_crm_data = {**answers, **address_data}
                    bitrix_id = BitrixService.create_lead(user, full_crm_data) # Usa versão simplificada que corrigimos antes
                    
                    if bitrix_id:
                        user.id_bitrix = str(bitrix_id)
                        user.save()
                        
                        # Produtos
                        products = data.get('products', [])
                        final_products = list(products)
                        if hasattr(BitrixService, 'get_plan_details'):
                            plan_item = BitrixService.get_plan_details(plan_id)
                            if plan_item: final_products.append(plan_item)
                        
                        plan_title = f"ProtocoloMed - {plan_id} ({billing_cycle})"
                        BitrixService.prepare_deal_payment(user, final_products, plan_title, total_price)
                except Exception as e:
                    print(f"⚠️ Erro Bitrix: {e}")

                refresh = RefreshToken.for_user(user)
                
                response_data = {
                    "status": "success",
                    "access": str(refresh.access_token),
                    "user": {"id": user.id, "email": user.email}
                }

                # SE FOR PIX: Adiciona dados do QR Code na resposta
                if payment_method == 'pix':
                    poi = payment_result.get('point_of_interaction', {}).get('transaction_data', {})
                    response_data['pix_data'] = {
                        "qr_code": poi.get('qr_code'),
                        "qr_code_base64": poi.get('qr_code_base64'),
                        "ticket_url": poi.get('ticket_url')
                    }

                return Response(response_data, status=201)

        except Exception as e:
            print(f"❌ Erro Crítico: {e}")
            return Response({"error": "Erro interno."}, status=500)