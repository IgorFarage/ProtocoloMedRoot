from django.urls import path
from .views import CreateCheckoutView, WebhookView, ProcessTransparentPaymentView, CompletePurchaseView, PlanPricesView

urlpatterns = [
    path('checkout/', CreateCheckoutView.as_view(), name='checkout'),
    path('process-payment/', ProcessTransparentPaymentView.as_view(), name='process_payment'), # Nova rota
    path('webhook/', WebhookView.as_view(), name='webhook'),
    path('plans/prices/', PlanPricesView.as_view(), name='plan_prices'),
    path('purchase/', CompletePurchaseView.as_view(), name='complete_purchase'),
]