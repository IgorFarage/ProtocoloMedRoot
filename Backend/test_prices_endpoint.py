
import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.financial.views import PlanPricesView

def test_prices_endpoint():
    factory = APIRequestFactory()
    request = factory.get('/api/financial/plans/prices/')
    view = PlanPricesView.as_view()
    
    print("🚀 Testing PlanPricesView...")
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print(f"Data: {response.data}")
    
    if "standard" in response.data and "plus" in response.data:
        print("✅ Structure is correct.")
    else:
        print("❌ Structure is missing keys.")

if __name__ == "__main__":
    test_prices_endpoint()
