from django.urls import path
from .views import CreateCheckoutView, WebhookView, CompletePurchaseView, PlanPricesView, TransactionStatusView, ValidateCouponView, CancelSubscriptionView, DowngradeSubscriptionView

urlpatterns = [
    path('checkout/', CreateCheckoutView.as_view(), name='checkout'),

    path('webhook/', WebhookView.as_view(), name='webhook'),
    path('plans/prices/', PlanPricesView.as_view(), name='plan_prices'),
    path('purchase/', CompletePurchaseView.as_view(), name='complete_purchase'),
    path('check-status/<str:external_ref>/', TransactionStatusView.as_view(), name='check_transaction_status'),
    path('coupon/validate/', ValidateCouponView.as_view(), name='validate_coupon'),
    path('cancel-subscription/', CancelSubscriptionView.as_view(), name='cancel_subscription'),
    path('downgrade-subscription/', DowngradeSubscriptionView.as_view(), name='downgrade_subscription'),
]