from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, UserQuestionnaire
from .serializers import (
    RegisterSerializer, 
    MyTokenObtainPairSerializer, 
    UserQuestionnaireSerializer
)

# 1. View de Login Customizada (Envia nome e role no token)
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# 2. View de Registro (Cria User + Questionário Inicial)
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Usuário e questionário registrados com sucesso!",
                "user": {
                    "email": user.email,
                    "full_name": user.full_name
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 3. View para Histórico de Questionários (Para responder múltiplas vezes)
class UserQuestionnaireListView(generics.ListCreateAPIView):
    serializer_class = UserQuestionnaireSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Retorna apenas os questionários do usuário logado
        return UserQuestionnaire.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Salva o novo questionário vinculado ao usuário que fez a requisição
        serializer.save(user=self.request.user, is_latest=True)