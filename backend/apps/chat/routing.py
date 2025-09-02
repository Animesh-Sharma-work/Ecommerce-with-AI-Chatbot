# apps/chat/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # URL for a regular user to connect to their own chat
    re_path(r'ws/chat/$', consumers.ChatConsumer.as_asgi()),
    
    
]