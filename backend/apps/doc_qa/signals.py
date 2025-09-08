# week6/backend/apps/doc_qa/signals.py - CORRECTED AND UPDATED VERSION

import threading
import logging
import os
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.document_loaders.word_document import Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import  GoogleGenerativeAIEmbeddings

from .models import UploadedDocument, DocumentChunk

logger = logging.getLogger(__name__)

def process_document_in_background(document_id):
    """
    This function runs in a separate thread to process the document.
    """
    try:
        doc = UploadedDocument.objects.get(id=document_id)
        # Use the correct field name: processing_status
        doc.processing_status = UploadedDocument.Status.PROCESSING
        doc.save()

        logger.info(f"Starting processing for document: {doc.original_filename}")
        
        file_path = doc.file.path
        _, file_extension = os.path.splitext(file_path)
        file_extension = file_extension.lower()

        loader = None
        if file_extension == '.pdf':
            loader = PyPDFLoader(file_path)
        elif file_extension == '.docx':
            loader = Docx2txtLoader(file_path)
        elif file_extension == '.txt':
            loader = TextLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

        documents = loader.load()
        logger.info(f"Loaded {len(documents)} pages/parts from {doc.original_filename}")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(documents)
        logger.info(f"Split document into {len(chunks)} chunks.")

        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.GEMINI_API_KEY
        )

        for i, chunk in enumerate(chunks):
            vector = embeddings.embed_query(chunk.page_content)
            DocumentChunk.objects.create(
                document=doc,
                content=chunk.page_content,
                embedding=vector
            )
            logger.info(f"Saved chunk {i+1}/{len(chunks)} for document {doc.id}")

        # Use the correct field name: processing_status
        doc.processing_status = UploadedDocument.Status.SUCCESS
        logger.info(f"Successfully processed document: {doc.original_filename}")

    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}", exc_info=True)
        if 'doc' in locals():
            # Use the correct field name: processing_status
            doc.processing_status = UploadedDocument.Status.FAILED
    finally:
        if 'doc' in locals():
            doc.processed_at = timezone.now()
            doc.save()

@receiver(post_save, sender=UploadedDocument)
def on_document_upload(sender, instance, created, **kwargs):
    """
    Signal handler that triggers when a new UploadedDocument is created.
    """
    if created:
        logger.info(f"New document uploaded: {instance.original_filename}. Queuing for processing.")
        thread = threading.Thread(
            target=process_document_in_background,
            args=(instance.id,)
        )
        thread.daemon = True
        thread.start()