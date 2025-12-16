from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, UserQuestionnaireListView, MyTokenObtainPairView

urlpatterns = [
    # Rota de Cadastro
    path('register/', RegisterView.as_view(), name='auth_register'),
    
    # Rotas de Login (JWT)
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Questionários (Histórico e novas respostas)
    path('questionnaires/', UserQuestionnaireListView.as_view(), name='user_questionnaires'),
]