# week5/backend/apps/doc_qa/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

# The router automatically generates the URLs for our ViewSet
# (e.g., /documents/ for list/create, /documents/{id}/ for retrieve/delete)
router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]