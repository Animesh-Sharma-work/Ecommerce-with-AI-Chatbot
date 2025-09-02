# week5/backend/apps/chat/consumers.py - ENHANCED WITH DYNAMIC LOOKUP

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain.schema.messages import SystemMessage, HumanMessage, AIMessage

from .models import ChatMessage
from apps.orders.models import Order

User = get_user_model()
logger = logging.getLogger(__name__)

chat_sessions = {}

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        await self.accept()
        try:
            user_name, order_summary = await self.get_user_context()
            logger.info(f"Retrieved user context for {self.user.email}: name={user_name}, summary_length={len(order_summary) if order_summary else 0}")
            
            system_prompt = self.create_enhanced_system_prompt(user_name, order_summary)
            history = ChatMessageHistory()
            
            past_messages = await self.get_last_10_messages()
            for msg in past_messages:
                if msg.is_from_ai:
                    history.add_ai_message(msg.message)
                else:
                    history.add_user_message(msg.message)

            chat_sessions[self.channel_name] = {
                "system_prompt": system_prompt, "history": history
            }
            logger.info(f"WebSocket session ready for user {self.user.email}")
        except Exception as e:
            logger.error(f"Error during WebSocket connect for {self.user.email}: {e}")
            await self.send_error_message("Could not initialize chat session.")
            await self.close()

    async def disconnect(self, close_code):
        if self.channel_name in chat_sessions:
            del chat_sessions[self.channel_name]
        logger.info(f"WebSocket disconnected for user {self.user.email}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_text = text_data_json['message']
        session = chat_sessions.get(self.channel_name)
        if not session:
            await self.send_error_message("Chat session lost. Please refresh.")
            return

        try:
            # Save the user's message
            await self.save_message(message_text, is_from_ai=False)

            # Check if user is asking about specific orders and get enhanced context
            enhanced_context = await self.get_enhanced_context_if_needed(message_text)

            # Get fresh order summary
            user_name, fresh_order_summary = await self.get_user_context()
            
            # Create enhanced system prompt with dynamic context
            system_prompt = self.create_enhanced_system_prompt(
                user_name, 
                fresh_order_summary, 
                enhanced_context
            )

            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
            
            messages = [
                SystemMessage(content=system_prompt),
                *session["history"].messages,
                HumanMessage(content=message_text),
            ]

            ai_response = await llm.ainvoke(messages)
            reply_text = ai_response.content

            session["history"].add_user_message(message_text)
            session["history"].add_ai_message(reply_text)

            # Save and send response
            new_ai_message_obj = await self.save_message(reply_text, is_from_ai=True)
            await self.send(text_data=json.dumps({
                'id': new_ai_message_obj.id,
                'user': 'FusionBot',
                'message': reply_text,
                'timestamp': new_ai_message_obj.timestamp.isoformat(),
            }))

        except Exception as e:
            logger.error(f"Error during AI invocation for {self.user.email}: {e}")
            await self.send_error_message("Sorry, I encountered an error.")

    async def get_enhanced_context_if_needed(self, message_text):
        """
        Check if the user is asking about specific orders and fetch detailed data
        """
        # Keywords that suggest user wants specific order details
        specific_order_keywords = [
            'second last', 'second to last', 'previous order', 'before that',
            'third order', 'last 3 orders', 'order before', 'earlier order',
            'what did i buy before', 'my order history', 'list my orders',
            'show my orders', 'order details', 'which order', 'what order'
        ]
        
        message_lower = message_text.lower()
        needs_detailed_context = any(keyword in message_lower for keyword in specific_order_keywords)
        
        if needs_detailed_context:
            logger.info(f"User asking for specific order details: {message_text}")
            return await self.get_detailed_order_history()
        
        return None

    @database_sync_to_async
    def get_detailed_order_history(self):
        """
        Get detailed order history for specific order questions
        """
        try:
            orders = Order.objects.filter(user=self.user).prefetch_related(
                'items__product__category'
            ).order_by('-created_at')[:5]  # Last 5 orders
            
            if not orders:
                return "No orders found for this user."
            
            detailed_history = []
            for i, order in enumerate(orders, 1):
                items = []
                for item in order.items.all():
                    items.append(f"{item.quantity}x {item.product.name} ({item.product.category.name})")
                
                order_position = ""
                if i == 1:
                    order_position = "Most recent order (latest)"
                elif i == 2:
                    order_position = "Second last order"
                elif i == 3:
                    order_position = "Third last order"
                else:
                    order_position = f"Order from {i} orders ago"
                
                status = getattr(order, 'status', 'Shipped')
                
                detailed_history.append(
                    f"{order_position}: Order #{order.id} placed on {order.created_at.strftime('%Y-%m-%d')} - "
                    f"Items: {', '.join(items)}. Total: ${order.total_price}. Status: {status}"
                )
            
            return "\n".join(detailed_history)
            
        except Exception as e:
            logger.error(f"Error getting detailed order history: {e}")
            return None

    def create_enhanced_system_prompt(self, user_name, order_summary, enhanced_context=None):
        """
        Create system prompt with optional enhanced context for specific order questions
        """
        base_prompt = f"""You are "FusionBot", a friendly and helpful AI assistant for our e-commerce store, "Fusion".
The user you are chatting with is named {user_name}.

Here is an AI-generated summary of their RECENT ORDER HISTORY. Use this for context:
<order_summary>
{order_summary or "No orders found for this user yet."}
</order_summary>"""

        if enhanced_context:
            base_prompt += f"""

DETAILED ORDER HISTORY (for specific order questions):
<detailed_orders>
{enhanced_context}
</detailed_orders>

Use this detailed information to answer specific questions about their order sequence, like "what was my second last order", "what did I buy before that", or "show me my order history". Be precise with order numbers, dates, and items."""

        base_prompt += """

You have access to the full conversation history. Keep your responses friendly and concise. When users ask about their orders or purchase history, refer to the order information above and be as specific as possible."""

        return base_prompt

    async def send_error_message(self, message: str):
        await self.send(text_data=json.dumps({
            'id': f'error-{timezone.now().isoformat()}',
            'user': 'System', 
            'message': message, 
            'timestamp': timezone.now().isoformat()
        }))

    @database_sync_to_async
    def get_user_context(self):
        """
        Retrieves user context including order summary with detailed logging
        """
        try:
            user = User.objects.get(id=self.user.id)
            user_name = user.first_name or user.email.split('@')[0]
            
            # Debug: Check if user has any orders
            order_count = Order.objects.filter(user=user).count()
            logger.info(f"User {user.email} has {order_count} orders")
            
            # Try to get order summary
            order_summary_text = "No orders found for this user yet."
            try:
                from apps.ai_support.models import OrderSummary
                order_summary_obj = OrderSummary.objects.get(user=user)
                order_summary_text = order_summary_obj.summary
                logger.info(f"Found order summary for {user.email}: {order_summary_text[:100]}...")
            except OrderSummary.DoesNotExist:
                logger.warning(f"No OrderSummary found for user {user.email}")
                
                # If no summary exists but user has orders, create one
                if order_count > 0:
                    logger.info(f"User has {order_count} orders but no summary. Consider running generate_initial_summaries command.")
            except Exception as e:
                logger.error(f"Error retrieving OrderSummary for {user.email}: {e}")
            
            return user_name, order_summary_text
            
        except Exception as e:
            logger.error(f"Error in get_user_context for user {self.user.id}: {e}")
            raise

    @database_sync_to_async
    def save_message(self, message_text, is_from_ai):
        """
        Saves a message to the ChatMessage model AND RETURNS THE INSTANCE.
        """
        return ChatMessage.objects.create(
            user=self.user, 
            message=message_text, 
            is_from_ai=is_from_ai
        )
    
    @database_sync_to_async
    def get_last_10_messages(self):
        return list(ChatMessage.objects.filter(user=self.user).order_by("-timestamp")[:10][::-1])