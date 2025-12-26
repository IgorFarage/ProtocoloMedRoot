from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
import uuid
from .services import FinancialService
from .models import Transaction

# Tenta importar o BitrixService, mas previne erro
try:
    from apps.accounts.services import BitrixService
except ImportError:
    BitrixService = None

class CreateCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("🔍 [DEBUG] CreateCheckoutView ACESSADA")
        print(f"👤 User: {request.user} (Is Auth: {request.user.is_authenticated})")
        print(f"📦 Data: {request.data}")
        
        user = request.user
        data = request.data
        
        plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle', 'monthly')
        products = data.get('products', []) 
        
        # Validação crucial que estava dando erro 400
        if not products:
            print("❌ ERRO: Checkout chamado sem produtos.")
            return Response({"error": "Nenhum produto encontrado."}, status=400)

        # 1. Cálculos
        try:
            medication_total = sum(float(p.get('price', 0)) for p in products)
        except ValueError:
            return Response({"error": "Erro no valor dos produtos."}, status=400)
        
        service_price = 150.00 if plan_id == 'plus' else 0.00
        base_total = medication_total + service_price
        
        # 2. Definição da Frequência para Assinatura
        if billing_cycle == 'quarterly':
             final_amount = (base_total * 3) * 0.90
             frequency_months = 3
             plan_title = f"ProtocoloMed - {plan_id.capitalize()} (Trimestral)"
        else:
             final_amount = base_total
             frequency_months = 1
             plan_title = f"ProtocoloMed - {plan_id.capitalize()} (Mensal)"

        # 3. Bitrix (Atualiza Negócio)
        deal_id = None
        if BitrixService:
            try:
                final_products = list(products)
                if service_price > 0:
                    final_products.append({"id": "264", "name": "Taxa Plus", "price": service_price})
                deal_id = BitrixService.prepare_deal_payment(user, final_products, plan_title, final_amount)
            except Exception as e:
                print(f"Erro Bitrix (não fatal): {e}")

        # 4. Criação da Assinatura (Link)
        financial_service = FinancialService()
        
        # Cria a transação antes de gerar o link
        transaction = Transaction.objects.create(
            user=user,
            plan_type=plan_id,
            amount=final_amount,
            cycle=billing_cycle,
            external_reference=str(uuid.uuid4()) # Gera um ID único para o MP
        )
        
        checkout_url = financial_service.create_subscription(
            title=plan_title,
            price=final_amount,
            user_email=user.email,
            external_reference=transaction.external_reference,
            frequency=frequency_months
        )

        if checkout_url:
            return Response({"checkout_url": checkout_url}, status=200)
        else:
            transaction.delete() # Remove se falhar
            return Response({"error": "Erro ao gerar assinatura."}, status=500)

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