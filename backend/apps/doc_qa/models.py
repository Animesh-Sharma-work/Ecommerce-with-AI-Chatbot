# week6/backend/apps/doc_qa/models.py - COMPLETE AND CORRECT VERSION

import os
from django.db import models
from django.conf import settings
from pgvector.django import VectorField

class UploadedDocument(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to='qa_documents/')
    original_filename = models.CharField(max_length=255)
    # This field is named 'processing_status' for clarity and consistency
    processing_status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.original_filename} (User: {self.user.email})"

    def file_extension(self):
        name, extension = os.path.splitext(self.file.name)
        return extension.lower()


class DocumentChunk(models.Model):
    document = models.ForeignKey(
        UploadedDocument, 
        related_name='chunks', 
        on_delete=models.CASCADE
    )
    content = models.TextField()
    # Ensure dimensions match your embedding model (Gemini-001 is 768)
    embedding = VectorField(dimensions=768)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chunk {self.id} for {self.document.original_filename}"