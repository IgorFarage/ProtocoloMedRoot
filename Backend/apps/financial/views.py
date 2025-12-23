from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import uuid
from .services import FinancialService

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
        external_ref = str(deal_id) if deal_id else str(uuid.uuid4())
        
        checkout_url = financial_service.create_subscription(
            title=plan_title,
            price=final_amount,
            user_email=user.email,
            external_reference=external_ref,
            frequency=frequency_months
        )

        if checkout_url:
            return Response({"checkout_url": checkout_url}, status=200)
        else:
            return Response({"error": "Erro ao gerar assinatura."}, status=500)