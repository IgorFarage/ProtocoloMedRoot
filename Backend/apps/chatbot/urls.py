from django.urls import path
from .views import ChatbotView

urlpatterns = [
    path('ask/', ChatbotView.as_view(), name='chatbot_ask'),
]
