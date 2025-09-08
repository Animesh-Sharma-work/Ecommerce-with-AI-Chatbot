# week6/backend/apps/chat/consumers.py - CORRECTED VERSION

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain.schema.messages import SystemMessage, HumanMessage, AIMessage

# --- THIS LINE IS NOW CORRECTED ---
from apps.doc_qa.models import DocumentChunk
from pgvector.django import L2Distance
# --- END OF CORRECTION ---

from .models import ChatMessage
from apps.ai_support.models import OrderSummary

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
            history = ChatMessageHistory()
            past_messages = await self.get_last_10_messages()
            for msg in past_messages:
                if msg.is_from_ai:
                    history.add_ai_message(msg.message)
                else:
                    history.add_user_message(msg.message)

                 # Also send the message down to the client to populate the UI
                await self.send(text_data=json.dumps({
                    'id': msg.id,
                    # Check if the message is from the AI or the user
                    'user': 'FusionBot' if msg.is_from_ai else self.user.email,
                    'message': msg.message,
                    'timestamp': msg.timestamp.isoformat(),
                }))
            chat_sessions[self.channel_name] = {"history": history}
            logger.info(f"WebSocket session ready for user {self.user.email}")

        except Exception as e:
            logger.error(f"Error during WebSocket connect for {self.user.email}: {e}", exc_info=True)
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
            await self.save_message(message_text, is_from_ai=False)
            session["history"].add_user_message(message_text)
            intent = await self.get_question_intent(message_text)
            logger.info(f"User question intent classified as: {intent}")
            reply_text = ""
            if intent == "DOCUMENTS":
                reply_text = await self.get_rag_response(message_text, session["history"])
            else:
                reply_text = await self.get_order_history_response(session["history"])
            session["history"].add_ai_message(reply_text)
            new_ai_message_obj = await self.save_message(reply_text, is_from_ai=True)
            await self.send(text_data=json.dumps({
                'id': new_ai_message_obj.id, 'user': 'FusionBot', 'message': reply_text,
                'timestamp': new_ai_message_obj.timestamp.isoformat(),
            }))
        except Exception as e:
            logger.error(f"Error during AI invocation for {self.user.email}: {e}", exc_info=True)
            await self.send_error_message("Sorry, I encountered an error.")

    async def get_question_intent(self, question: str) -> str:
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
        prompt = f"""
        You are a routing agent. Your job is to classify the user's question into one of two categories.
        Category 1: General Conversation & Order History.
        Category 2: Document-Based Question. This includes any question about company policies, product specifications, terms and conditions, return policies, shipping info, etc.
        User's Question: "{question}"
        Respond with ONLY the word 'ORDERS' for Category 1 or 'DOCUMENTS' for Category 2.
        """
        response = await llm.ainvoke(prompt)
        intent = response.content.strip().upper()
        return "DOCUMENTS" if intent == "DOCUMENTS" else "ORDERS"

    async def get_rag_response(self, question: str, history: ChatMessageHistory) -> str:
        logger.info("Performing RAG search using Django ORM and pgvector.")

        embeddings_model = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001", 
            google_api_key=settings.GEMINI_API_KEY
        )
        query_embedding = embeddings_model.embed_query(question)

        relevant_chunks = await self.find_similar_chunks(query_embedding)

        if not relevant_chunks:
            return "I could not find any relevant information in the uploaded documents to answer your question."

        context = "\n\n".join([chunk.content for chunk in relevant_chunks])
        chat_history_text = "\n".join([f"{'User' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}" for msg in history.messages[:-1]])
        
        prompt = f"""
        You are a helpful assistant. Answer the user's question based ONLY on the following context.
        If the answer is not in the context, say "I could not find an answer in the provided documents."
        Also consider the CHAT HISTORY for context on follow-up questions. Be concise and helpful.

        CHAT HISTORY:
        {chat_history_text}

        CONTEXT FROM DOCUMENTS:
        ---
        {context}
        ---

        USER'S LATEST QUESTION: {question}

        Answer:
        """
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
        response = await llm.ainvoke(prompt)
        return response.content.strip()

    @database_sync_to_async
    def find_similar_chunks(self, embedding):
        similar_chunks = DocumentChunk.objects.annotate(
            distance=L2Distance('embedding', embedding)
        ).order_by('distance')[:4]
        return list(similar_chunks)
    
    async def get_order_history_response(self, history: ChatMessageHistory) -> str:
        logger.info("Generating response based on order history.")
        user_name, order_summary = await self.get_user_context()
        system_prompt = f"""You are "FusionBot", a friendly AI assistant. The user is {user_name}.
        Use their order summary for context:
        <order_summary>
        {order_summary or "No orders yet."}
        </order_summary>
        Use the full conversation history. Be friendly and concise.
        """
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
        messages = [SystemMessage(content=system_prompt), *history.messages]
        response = await llm.ainvoke(messages)
        return response.content.strip()

    async def send_error_message(self, message: str):
        await self.send(text_data=json.dumps({
            'id': f'error-{timezone.now().isoformat()}', 'user': 'System', 
            'message': message, 'timestamp': timezone.now().isoformat()
        }))

    @database_sync_to_async
    def get_user_context(self):
        user = User.objects.get(id=self.user.id)
        user_name = user.first_name or user.email.split('@')[0]
        try:
            order_summary_text = OrderSummary.objects.get(user=user).summary
        except OrderSummary.DoesNotExist:
            order_summary_text = "No orders found for this user yet."
        return user_name, order_summary_text

    @database_sync_to_async
    def save_message(self, message_text, is_from_ai):
        return ChatMessage.objects.create(user=self.user, message=message_text, is_from_ai=is_from_ai)
    
    @database_sync_to_async
    def get_last_10_messages(self):
        return list(ChatMessage.objects.filter(user=self.user).order_by("-timestamp")[:10][::-1])