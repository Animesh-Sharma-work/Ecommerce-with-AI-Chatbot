# week5/backend/apps/ai_support/management/commands/generate_initial_summaries.py

import asyncio
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from apps.orders.models import Order
from apps.ai_support.models import OrderSummary
from asgiref.sync import sync_to_async

User = get_user_model()

class Command(BaseCommand):
    help = 'Generates initial order summaries for all users with existing orders.'

    async def _generate_summary(self, user):
        """Asynchronous helper to generate summary for a single user."""
        self.stdout.write(f"Processing user: {user.email}")

        # Use sync_to_async to query the database asynchronously
        orders = await sync_to_async(list)(
            Order.objects.filter(user=user).prefetch_related(
                'items', 'items__product', 'items__product__category'
            ).order_by('-created_at')
        )

        if not orders:
            self.stdout.write(f"No orders found for {user.email}. Skipping.")
            return

        order_details_list = []
        for order in orders:
            item_list = ", ".join([
                f"{item.quantity}x {item.product.name} (Category: {item.product.category.name})"
                for item in order.items.all()
            ])
            # NOTE: Assumes a 'status' field might exist on your Order model.
            # Defaults to 'Shipped' if not present.
            status = getattr(order, 'status', 'Shipped')
            order_details_list.append(
                f"- Order #{order.id} on {order.created_at.strftime('%Y-%m-%d')}: "
                f"Items: {item_list}. Status: {status}."
            )
        order_history_text = "\n".join(order_details_list)

        prompt = f"""
        Based on the following order history for a customer, provide a very concise, one-paragraph summary.
        Mention key product categories they seem interested in and the status of their most recent orders.

        Order History:
        {order_history_text}

        Summary:
        """

        try:
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
            ai_response = await llm.ainvoke(prompt)
            summary_text = ai_response.content.strip()

            # Use sync_to_async for the database update
            await sync_to_async(OrderSummary.objects.update_or_create)(
                user=user,
                defaults={'summary': summary_text}
            )
            self.stdout.write(self.style.SUCCESS(f"Successfully generated summary for {user.email}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to generate summary for {user.email}: {e}"))

    def handle(self, *args, **options):
        """The main entry point for the management command."""
        async def main():
            # Get users with orders asynchronously
            users_with_orders = await sync_to_async(list)(
                User.objects.filter(orders__isnull=False).distinct()
            )
            tasks = [self._generate_summary(user) for user in users_with_orders]
            await asyncio.gather(*tasks)

        self.stdout.write("Starting generation of initial order summaries...")
        asyncio.run(main())
        self.stdout.write(self.style.SUCCESS("Finished processing all users."))