from django.urls import path
from .views import CreateCheckoutView, WebhookView

urlpatterns = [
    path('checkout/', CreateCheckoutView.as_view(), name='create_checkout'),
    path('webhook/', WebhookView.as_view(), name='webhook'),
]