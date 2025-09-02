#apps/users/urls.py

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from .views import UserRegistrationView, GoogleLoginView, MyTokenObtainPairView

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user_registration'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Add the new URL for Google login
    path('google/', GoogleLoginView.as_view(), name='google_login'),
]