# week5/backend/apps/ai_support/admin.py

from django.contrib import admin
from .models import OrderSummary

@admin.register(OrderSummary)
class OrderSummaryAdmin(admin.ModelAdmin):
    list_display = ('user', 'last_updated')
    search_fields = ('user__email',)
    readonly_fields = ('user', 'summary', 'last_updated')