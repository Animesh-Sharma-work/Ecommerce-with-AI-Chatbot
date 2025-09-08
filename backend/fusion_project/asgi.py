"""
ASGI config for fusion_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.chat import routing as chat_routing
from apps.users.middleware import JWTAuthMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fusion_project.settings')

# This is the standard way to get the base Django application.
# When DEBUG=False, this will be wrapped by WhiteNoise automatically
# because of the middleware we added in settings.py.
# When DEBUG=True, we need a different approach for the dev server.
application = ProtocolTypeRouter({
    "http": get_asgi_application(), # Revert this line to the standard call
    "websocket": JWTAuthMiddleware(
        URLRouter(
            chat_routing.websocket_urlpatterns
        )
    ),
})