

from django.urls import path, include
from .views import ProductAdminViewSet, CategoryListView, ReviewViewSet, PublicProductViewSet, GenerateAIContentView, ProductRecommendationView, ProductInventoryInsightView
# from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

# Admin Router
admin_router = routers.DefaultRouter()
admin_router.register(r'manage', ProductAdminViewSet, basename='product-admin')

# Public & Nested Routers
router = routers.SimpleRouter()
router.register(r'', PublicProductViewSet, basename='products')

reviews_router = routers.NestedSimpleRouter(router, r'', lookup='product')
reviews_router.register(r'reviews', ReviewViewSet, basename='product-reviews')


urlpatterns = [
    # Include the public product and nested review routes
    path('', include(router.urls)),
    path('', include(reviews_router.urls)),
    
    # Explicitly define the categories URL at the top level of this app
    path('categories/', CategoryListView.as_view(), name='category-list'),
    
    path('<int:pk>/recommendations/', ProductRecommendationView.as_view(), name='product-recommendations'),


    # Admin-specific URLs
    path('admin/', include(admin_router.urls)),
    path('admin/generate-content/', GenerateAIContentView.as_view(), name='generate-ai-content'),
    
    # Add the new URL for our inventory dashboard
    path('admin/inventory-insights/', ProductInventoryInsightView.as_view(), name='inventory-insights'),
]

