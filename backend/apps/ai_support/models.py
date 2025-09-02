# week5/backend/apps/ai_support/models.py

from django.db import models
from django.conf import settings

class OrderSummary(models.Model):
    """
    Stores an AI-generated summary of a user's complete order history.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='order_summary'
    )
    summary = models.TextField(
        help_text="AI-generated summary of the user's order history."
    )
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order Summary for {self.user.email}"