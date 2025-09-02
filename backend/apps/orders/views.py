# backend/apps/orders/views.py

import stripe
import json
import logging # Import the logging library
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer

# Get the User model and set up a logger
User = get_user_model()
logger = logging.getLogger(__name__)

# Initialize Stripe with your secret key
stripe.api_key = settings.STRIPE_SECRET_KEY

# --- PAYMENT INTENT VIEW ---
# This view is already in good shape. No changes needed.
class CreatePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    # ... (rest of the view is correct)
    def post(self, request, *args, **kwargs):
        cart_items = request.data.get('items', [])
        
        if not cart_items:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            total_amount = 0
            product_updates = []
            for item in cart_items:
                product = Product.objects.get(id=item['id'])
                if item['quantity'] > product.quantity:
                    return Response(
                        {'error': f'Not enough stock for {product.name}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                total_amount += product.price * item['quantity']
                product_updates.append({'product': product, 'quantity': item['quantity']})

            total_amount_in_cents = int(total_amount * 100)
            
            cart_for_metadata = {
                'items': [{'id': item['id'], 'quantity': item['quantity']} for item in cart_items]
            }

            payment_intent = stripe.PaymentIntent.create(
                amount=total_amount_in_cents,
                currency='usd',
                metadata={
                    'user_id': request.user.id,
                    'cart': json.dumps(cart_for_metadata)
                }
            )
            
            return Response({'clientSecret': payment_intent.client_secret}, status=status.HTTP_200_OK)

        except Product.DoesNotExist:
            return Response({'error': 'Invalid product in cart'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating payment intent: {e}")
            return Response({'error': 'An internal error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- STRIPE WEBHOOK VIEW (Revised) ---
class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.body
        # Improvement 1: Use .get() for safer dictionary access
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        if not endpoint_secret:
            logger.error("Stripe webhook secret is not configured.")
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if not sig_header:
            logger.warning("Stripe signature header missing from webhook.")
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError:
            logger.warning("Invalid webhook payload.")
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid webhook signature.")
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Handle only the specific event we care about
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            
            # Improvement 2: More robust metadata extraction
            metadata = payment_intent.get('metadata', {})
            cart_data_str = metadata.get('cart')
            user_id = metadata.get('user_id')

            if not cart_data_str or not user_id:
                logger.error("Webhook received for payment_intent.succeeded with missing metadata.")
                # Return 200 OK because the event is valid, but we can't process it.
                # This prevents Stripe from resending it.
                return Response(status=status.HTTP_200_OK)
            
            cart_data = json.loads(cart_data_str)
            
            try:
                user = User.objects.get(id=user_id)
                
                # Improvement 3: Use a single atomic transaction for all database operations
                with transaction.atomic():
                    order = Order.objects.create(
                        user=user,
                        total_price=payment_intent['amount'] / 100.0,
                        paid=True
                    )
                    
                    products_to_update = []
                    for item_data in cart_data['items']:
                        product = Product.objects.select_for_update().get(id=item_data['id'])
                        
                        if product.quantity < item_data['quantity']:
                             # This case is rare but handles race conditions
                             logger.error(f"Race condition: Not enough stock for Product ID {product.id} during webhook processing.")
                             # The transaction will be rolled back automatically on error.
                             raise Exception("Insufficient stock detected during order creation.")

                        OrderItem.objects.create(
                            order=order,
                            product=product,
                            price=product.price,
                            quantity=item_data['quantity']
                        )
                        product.quantity -= item_data['quantity']
                        products_to_update.append(product)
                    
                    # Update all products in a single bulk query if possible (more efficient)
                    Product.objects.bulk_update(products_to_update, ['quantity'])

            except (User.DoesNotExist, Product.DoesNotExist) as e:
                logger.error(f"User or Product not found during webhook processing: {e}")
                return Response(status=status.HTTP_200_OK) # Still return 200
            except Exception as e:
                logger.error(f"Error processing webhook: {e}")
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Acknowledge other event types from Stripe without erroring
        return Response(status=status.HTTP_200_OK)


# --- ORDER HISTORY VIEW ---
# This view is already in good shape. No changes needed.
class OrderHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'items__product')