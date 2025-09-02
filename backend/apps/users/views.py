#apps/users/views

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView


# Google Auth
from google.oauth2 import id_token
from google.auth.transport import requests

from .serializers import UserRegistrationSerializer, MyTokenObtainPairSerializer

User = get_user_model()

class UserRegistrationView(generics.CreateAPIView):
    """
    API view for user registration.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny] # Anyone can register
    
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    
# This is our new view for Google Sign-In
class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny] # Anyone can try to log in with Google

    def post(self, request, *args, **kwargs):
        # The frontend will send a 'token' in the request body
        google_jwt = request.data.get('token')
        if not google_jwt:
            return Response({'error': 'Google token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Validate the token with Google's servers
            idinfo = id_token.verify_oauth2_token(
                google_jwt, 
                requests.Request(), 
                settings.GOOGLE_OAUTH2_CLIENT_ID
            )

            # The 'sub' field is Google's unique ID for the user
            if 'sub' not in idinfo or 'email' not in idinfo:
                return Response({'error': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

            email = idinfo['email']
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # Get or create the user in our database
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'first_name': first_name, 'last_name': last_name}
            )

            # If the user was just created, we might want to set a default unusable password
            if created:
                user.set_unusable_password()
                user.save()

            # Generate our application's JWT tokens for the user
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'email': user.email,
                    'is_staff': user.is_staff,
                }
            })

        except ValueError:
            # This exception is raised if the token is invalid
            return Response({'error': 'Token validation failed.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Handle other potential errors
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)