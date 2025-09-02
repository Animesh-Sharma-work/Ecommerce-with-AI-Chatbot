# backend/apps/products/serializers.py
from rest_framework import serializers
from django.utils.text import slugify
from django.utils import timezone
from datetime import timedelta
from .models import Category, Product, Review
from django.contrib.auth import get_user_model

User = get_user_model()

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

# 1. Create a custom field for the category
class CategoryNameField(serializers.RelatedField):
    def to_representation(self, value):
        # For GET requests, represent the category by its name
        return value.name

    def to_internal_value(self, data):
        # For POST/PUT requests, get or create the category by name
        category_name = data
        category_slug = slugify(category_name)
        category, created = Category.objects.get_or_create(
            slug=category_slug,
            defaults={'name': category_name, 'slug': category_slug}
        )
        return category

# 2. Use the new custom field in the ProductSerializer
class ProductSerializer(serializers.ModelSerializer):
    # This custom field now handles all logic for both reading and writing
    category = CategoryNameField(queryset=Category.objects.all())

    class Meta:
        model = Product
        fields = [
            'id', 
            'category',
            'name', 
            'description', 
            'price', 
            'quantity',
            'image',
            'ai_meta_title',
            'ai_meta_description',
            'ai_keywords',
            'ai_tags',
        ]
        
#  Add a simple serializer for displaying the user in a review
class ReviewUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name']

#  Add the main ReviewSerializer
class ReviewSerializer(serializers.ModelSerializer):
    user = ReviewUserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user', 'rating', 'text', 'created_at']
        # The user is set automatically from the request, so it's read-only
        read_only_fields = ['id', 'user', 'created_at']

class ProductInventoryInsightSerializer(serializers.ModelSerializer):
    """
    Serializer for the admin inventory dashboard.
    It includes calculated fields for sales data and predictive insights.
    """
    # These fields are calculated in the view's queryset (annotations)
    total_units_sold = serializers.IntegerField(read_only=True)
    sales_last_30_days = serializers.IntegerField(read_only=True)

    # These fields are calculated here in the serializer
    status = serializers.SerializerMethodField()
    insight = serializers.SerializerMethodField()
    predicted_days_until_stockout = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'quantity', # Current stock
            'total_units_sold',
            'sales_last_30_days',
            'status',
            'insight',
            'predicted_days_until_stockout',
        ]

    def get_predicted_days_until_stockout(self, obj) -> int | None:
        """
        Predicts how many days are left until the product runs out of stock.
        """
        sales_in_period = obj.sales_last_30_days
        if sales_in_period is None or sales_in_period <= 0:
            return None # Cannot predict if there are no recent sales

        # Calculate daily sales velocity
        sales_velocity = sales_in_period / 30.0
        if sales_velocity == 0:
            return None

        days_left = obj.quantity / sales_velocity
        return int(days_left)

    def get_status(self, obj) -> str:
        """
        Applies business logic to determine the inventory status of a product.
        """
        LOW_STOCK_THRESHOLD = 10
        POPULAR_ITEM_THRESHOLD = 20 # Total units sold to be considered popular

        is_popular = obj.total_units_sold and obj.total_units_sold > POPULAR_ITEM_THRESHOLD
        is_low_stock = obj.quantity < LOW_STOCK_THRESHOLD
        has_recent_sales = obj.sales_last_30_days and obj.sales_last_30_days > 0

        if is_popular and is_low_stock:
            return "CRITICAL"
        
        if is_low_stock and has_recent_sales:
            return "WARNING"
            
        if is_low_stock and not has_recent_sales:
            return "LOW_STOCK" # Low stock but not selling recently

        if obj.total_units_sold == 0:
            return "UNSOLD"
            
        if not has_recent_sales and obj.total_units_sold > 0:
            return "SLOW_MOVING"

        return "HEALTHY"

    def get_insight(self, obj) -> str:
        """
        Generates a human-readable insight based on the product's status.
        """
        status = self.get_status(obj)
        days_left = self.get_predicted_days_until_stockout(obj)

        if status == "CRITICAL":
            insight = f"High demand, critically low stock. "
            if days_left is not None:
                insight += f"Predicted to sell out in ~{days_left} days. Restock immediately."
            else:
                insight += "Restock immediately."
            return insight
        
        if status == "WARNING":
            insight = f"Stock is low and product is selling. "
            if days_left is not None:
                insight += f"Predicted to sell out in ~{days_left} days. Plan to reorder soon."
            else:
                insight += "Plan to reorder soon."
            return insight

        if status == "LOW_STOCK":
            return "Stock is low, but there have been no sales in the last 30 days. Monitor."
            
        if status == "UNSOLD":
            return "This product has never been sold. Consider promotion or removal."
            
        if status == "SLOW_MOVING":
            return "This product has sold in the past but not in the last 30 days. May need marketing."

        return "Inventory levels are healthy and sales are steady."