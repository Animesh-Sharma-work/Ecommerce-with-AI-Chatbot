# apps/users/middleware.py

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()

@database_sync_to_async
def get_user(token_key):
    try:
        # Validate the token
        access_token = AccessToken(token_key)
        # Get the user ID from the token payload
        user_id = access_token['user_id']
        # Get the user object
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        # If the token is invalid or the user doesn't exist, return an anonymous user
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    Custom middleware for Django Channels to authenticate users via JWT in the query string.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Get the token from the query string
        # e.g., ws://.../?token=xxx
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
        token = query_params.get('token')

        if token:
            # If a token is provided, try to authenticate the user
            scope['user'] = await get_user(token)
        else:
            # If no token, the user is anonymous
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)