from django.urls import path
from .views import CreatePaymentIntentView, StripeWebhookView, OrderHistoryView

urlpatterns = [
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
     path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('', OrderHistoryView.as_view(), name='order-history'),
]