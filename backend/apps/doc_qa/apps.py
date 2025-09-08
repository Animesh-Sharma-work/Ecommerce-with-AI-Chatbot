from django.apps import AppConfig


class DocQaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.doc_qa'
    
    def ready(self):
        # This line is crucial for the signals to be discovered by Django.
        import apps.doc_qa.signals
