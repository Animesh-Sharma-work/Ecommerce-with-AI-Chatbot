#apps/chat/models.py

from django.db import models
from django.conf import settings

class ChatMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_from_ai = models.BooleanField(default=False)

    def __str__(self):
        sender = "AI" if self.is_from_ai else self.user.email
        return f'Message from {sender} at {self.timestamp.strftime("%Y-%m-%d %H:%M")}'