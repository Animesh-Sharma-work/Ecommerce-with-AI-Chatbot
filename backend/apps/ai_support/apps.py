# week5/backend/apps/ai_support/apps.py

from django.apps import AppConfig

class AiSupportConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_support'

    def ready(self):
        # This line is crucial for the signals to be discovered by Django
        import apps.ai_support.signals