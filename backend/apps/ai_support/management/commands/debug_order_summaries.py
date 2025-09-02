# week5/backend/apps/ai_support/management/commands/debug_order_summaries.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.ai_support.models import OrderSummary

User = get_user_model()

class Command(BaseCommand):
    help = 'Debug order summaries - check which users have orders and summaries'

    def handle(self, *args, **options):
        self.stdout.write("=== ORDER SUMMARY DEBUG REPORT ===")
        
        # Get all users
        all_users = User.objects.all()
        self.stdout.write(f"Total users: {all_users.count()}")
        
        # Users with orders
        users_with_orders = User.objects.filter(orders__isnull=False).distinct()
        self.stdout.write(f"Users with orders: {users_with_orders.count()}")
        
        # Users with summaries
        users_with_summaries = User.objects.filter(order_summary__isnull=False).distinct()
        self.stdout.write(f"Users with summaries: {users_with_summaries.count()}")
        
        self.stdout.write("\n=== DETAILED BREAKDOWN ===")
        
        for user in users_with_orders:
            order_count = Order.objects.filter(user=user).count()
            has_summary = hasattr(user, 'order_summary') and user.order_summary is not None
            
            self.stdout.write(f"User: {user.email}")
            self.stdout.write(f"  - Orders: {order_count}")
            self.stdout.write(f"  - Has Summary: {has_summary}")
            
            if has_summary:
                summary_text = user.order_summary.summary[:100] + "..." if len(user.order_summary.summary) > 100 else user.order_summary.summary
                self.stdout.write(f"  - Summary Preview: {summary_text}")
                self.stdout.write(f"  - Last Updated: {user.order_summary.last_updated}")
            else:
                self.stdout.write("  - Summary: MISSING!")
            
            self.stdout.write("")
        
        # Check for users with summaries but no orders (shouldn't happen)
        orphaned_summaries = OrderSummary.objects.filter(user__orders__isnull=True)
        if orphaned_summaries.exists():
            self.stdout.write("=== ORPHANED SUMMARIES (Users with summaries but no orders) ===")
            for summary in orphaned_summaries:
                self.stdout.write(f"User: {summary.user.email}")
        
        self.stdout.write(f"\n=== RECOMMENDATIONS ===")
        missing_summaries = users_with_orders.count() - users_with_summaries.count()
        if missing_summaries > 0:
            self.stdout.write(f"❌ {missing_summaries} users have orders but no summaries.")
            self.stdout.write("   Run: python manage.py generate_initial_summaries")
        else:
            self.stdout.write("✅ All users with orders have summaries.")
            
        self.stdout.write("\n=== SAMPLE ORDER DATA ===")
        sample_orders = Order.objects.select_related('user').prefetch_related('items__product__category')[:3]
        for order in sample_orders:
            self.stdout.write(f"Order #{order.id} for {order.user.email}:")
            for item in order.items.all():
                self.stdout.write(f"  - {item.quantity}x {item.product.name} ({item.product.category.name})")