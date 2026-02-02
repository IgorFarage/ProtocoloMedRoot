from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, UserQuestionnaireListView, MyTokenObtainPairView, SubscribeView, RecommendationView, UpdateAddressView, UserProfileView, UserProtocolView, UserUpdateView, BitrixWebhookView, PasswordResetRequestView, PasswordResetConfirmView, DoctorRegisterView

urlpatterns = [
    # Rota de Cadastro
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('register-doctor/', DoctorRegisterView.as_view(), name='auth_register_doctor'),

    
    # Rotas de Login (JWT)
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Questionários (Histórico e novas respostas)
    path('questionnaires/', UserQuestionnaireListView.as_view(), name='user_questionnaires'),
    
    # Nova rota para assinatura
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    path('recommendation/', RecommendationView.as_view(), name='recommendation'),
    
    # Atualização de Endereço (Etapa 2 Checkout)
    path('update_address/', UpdateAddressView.as_view(), name='update_address'),
    
    # Webhooks
    path('webhooks/bitrix/', BitrixWebhookView.as_view(), name='bitrix_webhook'),
    
    # Perfil Completo (Bitrix)
    path('profile/', UserProfileView.as_view(), name='user_profile'),

    # Protocolo (Bitrix Deal)
    path('protocol/', UserProtocolView.as_view(), name='user_protocol'),

    # Atualização de Dados Pessoais
    path('profile/update/', UserUpdateView.as_view(), name='user_profile_update'),

    # Password Reset
    path('password_reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password_reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]