#fusion_project/urls.py

from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/qa/', include('apps.doc_qa.urls')),
]

# This block is for serving media files during development
if settings.DEBUG:
    # THE FIX: This line MUST be indented to be inside the 'if' block.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)