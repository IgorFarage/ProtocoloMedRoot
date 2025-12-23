from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
import uuid

from .serializers import CheckoutSerializer
from .models import Transaction
from .services import FinancialService

class CreateCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        
        plan_id = data.get('plan_id') # 'standard' ou 'plus'
        products = data.get('products', []) 
        
        if not products:
            return Response({"error": "Nenhum produto no protocolo."}, status=400)

        # 1. SOMA OS MEDICAMENTOS
        medication_total = sum(float(p['price']) for p in products)

        # 2. BUSCA O PREÇO DO SERVIÇO NO BITRIX (IDs informados: 262 e 264)
        # ID 262 = Standard (Provavelmente R$ 0 ou valor baixo)
        # ID 264 = Plus (Provavelmente R$ 150 ou similar)
        service_id = 264 if plan_id == 'plus' else 262
        
        service_item = BitrixService.get_product_detail(service_id)
        
        if not service_item:
            # Fallback de segurança se o ID não existir no CRM
            print(f"⚠️ Aviso: Serviço ID {service_id} não encontrado no Bitrix. Usando 0.")
            service_price = 150.00 if plan_id == 'plus' else 0.00
            service_name = f"Taxa Plano {plan_id.capitalize()}"
        else:
            service_price = service_item['price']
            service_name = service_item['name']

        # 3. CÁLCULO FINAL
        total_amount = medication_total + service_price
        
        # 4. PREPARA LISTA PARA O BITRIX (Medicamentos + Item de Serviço)
        final_products_list = list(products) # Copia a lista
        
        # Adiciona o serviço como um item na nota do CRM
        final_products_list.append({
            "id": service_id,
            "name": service_name,
            "price": service_price
        })

        # 5. ATUALIZA NEGÓCIO NO BITRIX (Product Rows)
        deal_id = BitrixService.prepare_deal_payment(user, final_products_list, plan_id, total_amount)
        
        # 6. GERA LINK MP
        mp_access_token = os.getenv('MERCADO_PAGO_ACCESS_TOKEN')
        sdk = mercadopago.SDK(mp_access_token)
        
        back_url_base = "http://localhost:5173/pagamento/sucesso"

        preference_data = {
            "items": [
                {
                    "id": f"sub_{plan_id}",
                    "title": f"ProtocoloMed - {plan_id.capitalize()} (Completo)",
                    "quantity": 1,
                    "currency_id": "BRL",
                    "unit_price": float(total_amount)
                }
            ],
            "payer": {"email": user.email, "name": user.full_name},
            "back_urls": {
                "success": back_url_base,
                "failure": "http://localhost:5173/planos",
                "pending": back_url_base
            },
            "auto_return": "approved",
            "external_reference": str(deal_id) if deal_id else str(user.id)
        }

        try:
            pref = sdk.preference().create(preference_data)
            return Response({"checkout_url": pref["response"]["sandbox_init_point"]})
        except Exception as e:
            return Response({"error": str(e)}, status=500)