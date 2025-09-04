#apps/products/views

from rest_framework import generics, permissions, viewsets, status
from .models import Product, Category, Review
from .serializers import ProductSerializer, CategorySerializer, ReviewSerializer, ProductInventoryInsightSerializer
from .permissions import IsOwnerOrReadOnly
from rest_framework.views import APIView # Add APIView
from rest_framework.response import Response # Add Response
from django.conf import settings # Add settings
import google.generativeai as genai
import json
from .ai_utils import moderate_review_text
from django.db.models import Count, Q, Sum, Value, IntegerField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta

#  Configure the library with your API key
genai.configure(api_key=settings.GEMINI_API_KEY)

# class ProductListView(generics.ListAPIView):
#     """
#     API view to retrieve a list of all products.
#     """
#     queryset = Product.objects.all()
#     serializer_class = ProductSerializer
#     # Anyone, even unauthenticated users, should be able to see the products.
#     permission_classes = [permissions.AllowAny]

# class ProductDetailView(generics.RetrieveAPIView):
#     """
#     API view to retrieve the details of a single product.
#     """
#     queryset = Product.objects.all()
#     serializer_class = ProductSerializer
#     permission_classes = [permissions.AllowAny]
#     # 'lookup_field' tells DRF what model field to use for retrieving the object.
#     # The default is 'pk' (primary key), which is what we want.

class PublicProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A read-only viewset for public listing and retrieval of products.
    This handles both GET /api/products/ and GET /api/products/{id}/.
    The pagination is handled globally by the settings.
    """
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]    

class ProductAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admins to manage products.
    Provides full CRUD functionality.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # This is the crucial part: only staff users can access these endpoints
    permission_classes = [permissions.IsAdminUser]
    
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    
# 3. Add the new AI content generation view
class GenerateAIContentView(APIView):
    """
    An admin-only view to generate product content using the Gemini API.
    It validates if the product name and image are related by passing the URL directly to the model.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        product_name = request.data.get('name')
        category_name = request.data.get('category')
        image_url = request.data.get('image')

        if not all([product_name, category_name, image_url]):
            return Response(
                {'error': 'Product name, category and image url are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Initialize the Gemini Pro model
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Craft a detailed prompt for the AI
            prompt = f"""
            You are an e-commerce product analyst. Your task is to perform two steps:
            1.  **Validation**: Analyze the user-provided image from the URL and the product name to determine if they are a plausible match for the same product listing.
            2.  **Content Generation**: If they match, generate marketing content.

            **Product Details:**
            - Product Name: "{product_name}"
            - Category: "{category_name}"
            - Image URL: "{image_url}"

            **Validation Rules:**
            - Your primary goal is to check if the CORE OBJECT in the image matches the CORE OBJECT in the product name.
            - Be flexible with subjective terms. For example, if the name is "Classic Bag" and the image is a "Stylish Handbag", this IS a match because the core object is a bag.
            - Similarly, "Leather Ankle Boots" and an image of brown boots IS a match.
            - A mismatch should only be for clear, undeniable errors. For example, a product named "Laptop" with an image of a shoe IS NOT a match.
            - The goal is to prevent major category errors, not to police minor stylistic variations.

            **Required Output Format:**
            Your final output must be a single, clean JSON object. Do not include any text or formatting outside of this JSON object.

            **JSON Structure:**
            {{
              "validation": {{
                "match": boolean,
                "reason": "In case of mismatch just say "The uploaded image does not appear to match the product name. Please ensure the correct image is uploaded for the name provided. Suggested name - (suggest a name from your thinking)", or 'OK' if they match."
              }},
              "content": {{
                "description": "A compelling, user-friendly product description (around 50-70 words).",
                "meta_title": "A concise and SEO-friendly meta title (around 50-60 characters).",
                "meta_description": "An engaging SEO meta description (around 150-160 characters).",
                "keywords": "A comma-separated list of 5-7 relevant SEO keywords.",
                "tags": "A comma-separated list of 5-7 relevant tags for product recommendations."
              }} | null
            }}
            """

            # Make the API call to Gemini
            response = model.generate_content(prompt)
            
            # The response text should be a JSON string. We need to clean and parse it.
            response_text = response.text.strip().replace('```json', '').replace('```', '')
            ai_data = json.loads(response_text)

           # Validates if the Image and Product name matches
            validation_result = ai_data.get('validation', {})
            if not validation_result.get('match'):
                return Response(
                    {'error': validation_result.get('reason', 'Image and product name do not match.')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            content = ai_data.get('content')

             # Validate that the response contains the keys we expect
            if not content:
                raise ValueError("AI validation passed, but the 'content' block is missing or null.")

            required_keys = ['description', 'meta_title', 'meta_description', 'keywords', 'tags']
            missing_keys = [key for key in required_keys if key not in content]

            if missing_keys:
                raise ValueError(f"AI response is missing required content fields: {', '.join(missing_keys)}")

            return Response(content, status=status.HTTP_200_OK)

        except Exception as e:
            # Handle potential errors from the API call or JSON parsing
            return Response(
                {'error': f'An error occurred while generating AI content: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for creating, viewing, updating, and deleting reviews.
    """
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    # Apply permissions: Must be logged in to do anything, and can only edit/delete your own.
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        # This view should be nested under a product, so we filter by product_pk
        if 'product_pk' in self.kwargs:
            return self.queryset.filter(product_id=self.kwargs['product_pk'], status=Review.Status.APPROVED)
        return self.queryset.none() # Return nothing if not accessed via a product

    def get_serializer_context(self):
        # Pass the product and request to the serializer
        context = super().get_serializer_context()
        if 'product_pk' in self.kwargs:
            context['product'] = Product.objects.get(pk=self.kwargs['product_pk'])
        return context
    
    
    # 2. Override perform_create to add moderation
    def perform_create(self, serializer):
        # First, save the review with the default 'PENDING' status
        review = serializer.save(
            user=self.request.user,
            product=self.get_serializer_context()['product']
        )

        # Now, send the text to the AI for moderation
        classification = moderate_review_text(review.text)

        # Update the status based on the AI's response
        if classification == 'APPROVED':
            review.status = Review.Status.APPROVED
        elif classification == 'REJECTED':
            review.status = Review.Status.REJECTED
        
        # The status remains 'PENDING' if the AI fails or is unsure
        review.save()

    # 3. Override perform_update to add re-moderation on edit
    def perform_update(self, serializer):
        # Get the original review instance
        review = serializer.instance
        
        # Update the text and rating from the incoming data
        review.text = serializer.validated_data.get('text', review.text)
        review.rating = serializer.validated_data.get('rating', review.rating)
        
        # IMPORTANT: Reset status to PENDING before re-moderating
        review.status = Review.Status.PENDING
        review.save() # Save the pending status first

        # Re-moderate the new text
        classification = moderate_review_text(review.text)
        if classification == 'APPROVED':
            review.status = Review.Status.APPROVED
        elif classification == 'REJECTED':
            review.status = Review.Status.REJECTED
        
        review.save()
        
class ProductRecommendationView(generics.ListAPIView):
    """
    API view to get product recommendations based on shared AI tags.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        # Get the product ID from the URL
        product_id = self.kwargs.get('pk')
        
        try:
            # Get the product we're finding recommendations for
            current_product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            # If the product doesn't exist, return an empty list
            return Product.objects.none()

        # Get the AI tags of the current product, if they exist
        if not current_product.ai_tags:
            # Fallback: If no tags, recommend other products from the same category
            return Product.objects.filter(category=current_product.category).exclude(pk=product_id)[:4]

        # Split the tags string into a list of individual tags
        current_tags = [tag.strip() for tag in current_product.ai_tags.split(',')]

        # --- The Recommendation Algorithm ---
        
        # 1. Find products that share at least one tag
        # We use Q objects to build a dynamic query: (tag=tag1) OR (tag=tag2) OR ...
        tag_query = Q()
        for tag in current_tags:
            # This builds a query that says: "tags contains 'modern' OR tags contains 'ceramic' OR..."
            tag_query |= Q(ai_tags__icontains=tag)

        # 2. Exclude the current product itself
        # 3. Annotate: Count how many tags each product shares
        # 4. Order: Put the products with the most shared tags first
        # 5. Limit: Return only the top 4 recommendations
        recommended_products = Product.objects.filter(tag_query)\
            .exclude(pk=product_id)\
            .annotate(shared_tags=Count('pk', filter=tag_query))\
            .order_by('-shared_tags', '-created_at')[:4]

        # Fallback if not enough recommendations are found
        if recommended_products.count() < 4:
            # Get IDs of already recommended products to exclude them
            recommended_ids = list(recommended_products.values_list('id', flat=True))
            recommended_ids.append(product_id)
            
            # Get more products from the same category to fill up the list
            category_products = Product.objects.filter(category=current_product.category)\
                .exclude(pk__in=recommended_ids)[:4 - recommended_products.count()]
            
            # Combine the two querysets
            recommended_products = list(recommended_products) + list(category_products)

        return recommended_products
    
class ProductInventoryInsightView(generics.ListAPIView):
    """
    An admin-only view that provides inventory insights for all products.
    It calculates total sales, recent sales, and provides a status.
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProductInventoryInsightSerializer
    pagination_class = None # Show all products on one page for this dashboard

    def get_queryset(self):
        # Define the time period for "recent" sales
        thirty_days_ago = timezone.now() - timedelta(days=30)

        # The main query that aggregates all data
        queryset = Product.objects.annotate(
            # Calculate total units sold for all time.
            # Coalesce ensures that if a product has no sales, it returns 0 instead of None.
            total_units_sold=Coalesce(
                Sum('order_items__quantity'),
                Value(0),
                output_field=IntegerField()
            ),
            # Calculate units sold only in the last 30 days using a filter on the aggregation.
            sales_last_30_days=Coalesce(
                Sum(
                    'order_items__quantity',
                    filter=Q(order_items__order__created_at__gte=thirty_days_ago)
                ),
                Value(0),
                output_field=IntegerField()
            )
        ).order_by('name') # Order alphabetically by default

        return queryset