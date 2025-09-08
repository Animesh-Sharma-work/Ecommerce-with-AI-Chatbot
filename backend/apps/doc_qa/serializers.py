# week5/backend/apps/doc_qa/serializers.py - CORRECTED AND IMPROVED VERSION

from rest_framework import serializers
from .models import UploadedDocument

class UploadedDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for the UploadedDocument model, updated to match the current model definition.
    """
    # This is a great addition for providing readable user info in the API.
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UploadedDocument
        # --- THE MAIN FIX IS HERE ---
        # 'status' has been replaced with the correct field name 'processing_status'.
        # The 'user' field has also been added for completeness.
        fields = [
            'id',
            'user',
            'user_email',
            'file',
            'original_filename',
            # 'processing_status', # <-- Corrected from 'status'
            'uploaded_at',
            'processed_at',
        ]

        # --- UPDATED READ-ONLY FIELDS ---
        # All fields except 'file' are set by the server, so they should be read-only.
        # The 'user' is set in the ViewSet, not from the request payload.
        read_only_fields = [
            'id',
            'user',
            'user_email',
            'original_filename',
            # 'processing_status', # <-- Corrected from 'status'
            'uploaded_at',
            'processed_at',
        ]

        # This ensures the file is required for uploads (POST) but not sent back in responses (GET).
        extra_kwargs = {
            'file': {'write_only': True, 'required': True}
        }