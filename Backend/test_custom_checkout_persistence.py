
import os
import django
import json
from unittest.mock import MagicMock, patch

import sys
# Adiciona o diretório atual ao path para encontrar os módulos
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.financial.views import CompletePurchaseView
from apps.financial.models import Transaction
from apps.accounts.models import User

def test_custom_product_persistence():
    print("🚀 Iniciando Teste de Persistência de Produtos Customizados...")

    # 1. Setup Data
    email = "tester_persistence@example.com"
    User.objects.filter(email=email).delete() # Cleanup
    
    # Produtos Customizados (Simulando que o usuário removeu um item do protocolo)
    # Vamos enviar apenas 1 produto de ID "999" (fictício)
    custom_products = [
        {"id": "999", "name": "Produto Teste Customizado", "price": "50.00", "quantity": 1}
    ]
    
    payload = {
        "full_name": "Tester Persistence",
        "email": email,
        "password": "testpassword123", # Required for user creation
        "cpf": "12345678900",
        "phone": "11999999999",
        "plan_id": "plus",
        "billing_cycle": "monthly",
        "total_price": 50.00,
        "payment_method_id": "pix", # Pix nao precisa de token de cartao
        "products": custom_products, # <--- O PULO DO GATO
        "questionnaire_data": {"q1": "test"},
        "address_data": {
            "cep": "01001000", "street": "Rua Teste", "number": "123",
            "neighborhood": "Centro", "city": "SP", "state": "SP"
        }
    }

    # 2. Mock External Services
    # Mock FinancialService para aprovar o pagamento imediatamente
    with patch('apps.financial.views.FinancialService') as MockFinancial:
        import uuid
        random_mp_id = str(uuid.uuid4().int)[:10] # Garante unicidade
        service_instance = MockFinancial.return_value
        service_instance.process_direct_payment.return_value = {
            "status": "approved",
            "id": random_mp_id,
            "point_of_interaction": {"transaction_data": {"qr_code": "...", "ticket_url": "..."}}
        }

        # Mock BitrixService para não fazer chamadas reais (não é o foco deste teste)
        with patch('apps.financial.views.BitrixService') as MockBitrix:
            MockBitrix.create_lead.return_value = "100"
            MockBitrix.prepare_deal_payment.return_value = "200"

            # 3. Execute View
            factory = APIRequestFactory()
            request = factory.post('/api/financial/purchase/', payload, format='json')
            view = CompletePurchaseView.as_view()
            response = view(request)

            print(f"📡 Status Code: {response.status_code}")
            if response.status_code != 201:
                print(f"❌ Erro: {response.data}")
                return

            # 4. Verify Persistence
            transaction = Transaction.objects.filter(user__email=email).order_by('-created_at').first()
            if not transaction:
                print("❌ Transação não encontrada!")
                return

            print(f"✅ Transação Criada: ID {transaction.id}")
            
            metadata = transaction.mp_metadata or {}
            saved_products = metadata.get('original_products', [])
            
            print(f"📦 Produtos Salvos no Metadata: {len(saved_products)}")
            print(f"🔍 Conteúdo: {json.dumps(saved_products, indent=2)}")

            # Validação
            if len(saved_products) == 1 and str(saved_products[0].get('id')) == "999":
                print("🏆 SUCESSO! O produto customizado foi persistido corretamente.")
            else:
                print("❌ FALHA! Os produtos salvos não correspondem ao envio customizado.")
                print(f"Esperado: ID 999. Encontrado: {[p.get('id') for p in saved_products]}")

if __name__ == "__main__":
    try:
        test_custom_product_persistence()
    except Exception as e:
        print(f"💥 Erro Fatal no Teste: {e}")
