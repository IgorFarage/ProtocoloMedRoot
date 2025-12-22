# Backend/apps/accounts/views.py

from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, UserQuestionnaire
from .serializers import (
    RegisterSerializer, 
    MyTokenObtainPairSerializer, 
    UserQuestionnaireSerializer
)
from .services import BitrixService

# 1. View de Login Customizada (Envia nome e role no token)
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    authentication_classes = []

# 2. View de Registro (Cria User + Questionário Inicial)
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    authentication_classes = []
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                return Response({
                    "message": "Usuário e questionário registrados com sucesso!",
                    "user": {
                        "email": user.email,
                        "full_name": user.full_name
                    }
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                # Captura erros que acontecem DURANTE o salvamento (ex: erro no create do Serializer)
                print(f"❌ ERRO NO SAVE: {e}")
                return Response({"erro_interno": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # --- AQUI ESTÁ O SEGREDO ---
        # Se os dados forem inválidos, imprimimos o motivo no terminal
        print("\n🛑 ERRO DE VALIDAÇÃO (400):")
        print(serializer.errors)  # <--- Isso vai mostrar o que está errado (Ex: E-mail já existe)
        print("-" * 30)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 3. View para Histórico de Questionários
class UserQuestionnaireListView(generics.ListCreateAPIView):
    serializer_class = UserQuestionnaireSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Retorna apenas os questionários do usuário logado
        return UserQuestionnaire.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Salva o novo questionário vinculado ao usuário que fez a requisição
        serializer.save(user=self.request.user, is_latest=True)

# 4. View de Assinatura/Checkout (Atualiza Bitrix)
class SubscribeView(APIView):
    """
    Recebe os dados do Checkout (Endereço, Produtos, Valor) e envia para o Bitrix.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        
        # Extrair dados do Payload
        address = data.get('address')
        products = data.get('products')
        total = data.get('total')

        # Validação simples
        if not address or not products:
            return Response(
                {"error": "Dados de endereço ou produtos ausentes."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Chama o serviço para atualizar o Bitrix
        try:
            BitrixService.process_subscription(user, address, products, total)
            
            return Response(
                {"message": "Assinatura processada e enviada para preparação."}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            # Logar o erro real no console do servidor para debug
            print(f"Erro no Checkout: {e}")
            return Response(
                {"error": "Erro ao processar assinatura."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class RecommendationView(APIView):
    def post(self, request):
        answers = request.data.get('answers', {})
        result = BitrixService.generate_protocol(answers)
        
        if not result:
            return Response({"error": "Erro ao gerar protocolo"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response(result)