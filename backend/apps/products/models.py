# apps/products/models.py

from django.db import models
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, help_text="A URL-friendly version of the category name.")

    class Meta:
        verbose_name_plural = "Categories" # Corrects the pluralization in the admin panel

    def __str__(self):
        return self.name

class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True) # blank=True means this field is not required
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0, help_text="The available stock quantity.")
    image = models.URLField(max_length=1024, null=True, blank=True, help_text="URL to the product image.")
    
    ai_meta_title = models.CharField(max_length=255, blank=True, null=True, help_text="AI-generated SEO meta title.")
    ai_meta_description = models.TextField(blank=True, null=True, help_text="AI-generated SEO meta description.")
    ai_keywords = models.TextField(blank=True, null=True, help_text="AI-generated SEO keywords, comma-separated.")
    ai_tags = models.TextField(blank=True, null=True, help_text="AI-generated tags for recommendations, comma-separated.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at'] # Default ordering for products

    def __str__(self):
        return self.name
    
class Review(models.Model):
    # Define the choices for the review status
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField() # e.g., 1 to 5
    text = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        # Ensure a user can only review a product once
        unique_together = ('product', 'user')

    def __str__(self):
        return f'Review by {self.user.email} for {self.product.name}'