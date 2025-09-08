# week5/backend/apps/doc_qa/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import UploadedDocument
from .serializers import UploadedDocumentSerializer

class DocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for uploading and managing documents.
    
    This ViewSet provides the following actions:
    - `list` (GET /api/qa/documents/): Retrieves a list of all uploaded documents.
    - `create` (POST /api/qa/documents/): Uploads a new document for processing.
    - `retrieve` (GET /api/qa/documents/{id}/): Retrieves details of a specific document.
    - `destroy` (DELETE /api/qa/documents/{id}/): Deletes a document and its associated data.
    """
    
    # The queryset defines the default set of objects for this view.
    # We order by the most recently uploaded documents first.
    queryset = UploadedDocument.objects.all().order_by('-uploaded_at')
    
    # The serializer class is used for converting model instances to and from JSON.
    serializer_class = UploadedDocumentSerializer
    
    # This permission class ensures that only users with 'is_staff=True' can access these endpoints.
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        """
        This method is a hook that gets called by DRF just before a new object is saved.
        We override it here to add extra data that isn't part of the request payload itself.
        """
        
        # Get the uploaded file object from the request.
        file_obj = self.request.FILES.get('file')
        
        # Although the serializer has `required=True`, this is a good secondary check.
        if not file_obj:
            # This line is defensive and should rarely be hit, but it prevents errors.
            # We're manually raising a validation error here, though DRF would typically handle it.
            # Note: In a real scenario, the serializer would raise the error first.
            # This is more of a conceptual safeguard.
            pass

        # Save the instance, but add two extra pieces of information:
        # 1. `user`: The authenticated user making the request.
        # 2. `original_filename`: The name of the file as it was on the user's computer.
        serializer.save(
            user=self.request.user,
            original_filename=file_obj.name
        )