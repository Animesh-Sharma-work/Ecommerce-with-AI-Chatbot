# week5/backend/apps/ai_support/signals.py - ENHANCED VERSION (OPTIONAL)

import logging
import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.orders.models import Order
from .models import OrderSummary

User = get_user_model()
logger = logging.getLogger(__name__)

def generate_summary_in_background(user_id: int):
    """
    Generate summary in a separate thread to avoid blocking the main request.
    Enhanced to provide better context for specific order questions.
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        
        logger.info(f"Background: Starting enhanced summary generation for user ID {user_id}")
        
        user = User.objects.get(id=user_id)
        orders = Order.objects.filter(user=user).prefetch_related(
            'items', 'items__product', 'items__product__category'
        ).order_by('-created_at')

        if not orders.exists():
            logger.warning(f"Background: No orders found for user {user.email}")
            return

        order_details_list = []
        for order in orders:
            try:
                item_list = ", ".join([
                    f"{item.quantity}x {item.product.name} (Category: {item.product.category.name})"
                    for item in order.items.all()
                ])
                status = getattr(order, 'status', 'Shipped')
                order_details_list.append(
                    f"- Order #{order.id} on {order.created_at.strftime('%Y-%m-%d')}: "
                    f"Items: {item_list}. Status: {status}. Total: ${order.total_price}"
                )
            except Exception as e:
                logger.error(f"Background: Error processing order #{order.id}: {e}")
                continue
                
        if not order_details_list:
            logger.warning(f"Background: No valid order details for user {user.email}")
            return
            
        order_history_text = "\n".join(order_details_list)

        # ENHANCED PROMPT - provides better context for order sequence questions
        prompt = f"""
        Based on the following order history for a customer, provide a comprehensive but concise summary that includes:
        
        1. Their  orders with specific order numbers and key items (make sure to add all orders with details)
        2. Overall purchasing patterns and favorite product categories  
        3. Order frequency and typical purchase amounts
        4. Any recent order statuses
        
        The summary should enable answering questions like "what was my second last order" or "what did I buy before that".

        Order History:
        {order_history_text}

        Provide a detailed summary (a few sentences):
        """

        # Check API key
        if not hasattr(settings, 'GEMINI_API_KEY') or not settings.GEMINI_API_KEY:
            logger.error("Background: GEMINI_API_KEY not configured")
            return

        # Generate enhanced summary
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
        ai_response = llm.invoke(prompt)
        summary_text = ai_response.content.strip()

        # Save summary
        OrderSummary.objects.update_or_create(
            user=user,
            defaults={'summary': summary_text}
        )
        logger.info(f"Background: Successfully updated enhanced summary for {user.email}")

    except Exception as e:
        logger.error(f"Background: Error generating enhanced summary for user {user_id}: {e}", exc_info=True)

@receiver(post_save, sender=Order)
def on_new_order(sender, instance, created, **kwargs):
    """
    When a new Order is created, trigger background summary generation.
    This doesn't block the main request.
    """
    if created:
        logger.info(f"New order #{instance.id} created for {instance.user.email}. Queuing enhanced background summary update.")
        
        # Start enhanced summary generation in a separate thread
        thread = threading.Thread(
            target=generate_summary_in_background,
            args=(instance.user.id,),
            daemon=True  # Dies when main process dies
        )
        thread.start()
        
        logger.info(f"Enhanced background summary generation started for user {instance.user.email}")