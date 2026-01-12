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
# Backend/apps/accounts/views.py

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    authentication_classes = []
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        print("📝 Iniciando Registro de Usuário...")
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # 1. Salva no Banco Local
                user = serializer.save()
                print(f"✅ Usuário Local Criado: {user.email}")

                # 2. Envia para o Bitrix
                try:
                    answers = request.data.get('questionnaire_data', {})
                    address_data = request.data.get('address_data', {}) # <--- CAPTURA O ENDEREÇO
                    
                    print("🚀 Enviando dados (Lead + Endereço) para o Bitrix...")
                    
                    # Passamos o endereço para a função create_lead
                    bitrix_id = BitrixService.create_lead(user, answers, address_data)
                    
                    if bitrix_id:
                        user.id_bitrix = str(bitrix_id)
                        user.save()
                        print(f"✅ Bitrix Vinculado! ID: {bitrix_id}")
                    
                except Exception as e_bitrix:
                    print(f"❌ Erro Bitrix: {e_bitrix}")

                return Response({
                    "message": "Sucesso",
                    "user": {"id": user.id, "email": user.email}
                }, status=status.HTTP_201_CREATED)

            except Exception as e:
                return Response({"erro_interno": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
    permission_classes = [AllowAny]
    authentication_classes = [] # Evita 401 se vier token inválido

    def post(self, request):
        answers = request.data.get('answers', {})
        result = BitrixService.generate_protocol(answers)
        
        if not result:
            return Response({"error": "Erro ao gerar protocolo"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response(result)

class UpdateAddressView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        address_data = request.data.get('address_data')

        print(f"📍 Atualizando endereço para usuário {user.email}...")

        if not address_data:
            return Response({"error": "Dados de endereço obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 1. Atualiza no Bitrix se houver vínculo
            if user.id_bitrix:
                BitrixService.update_contact_address(user.id_bitrix, address_data)
            else:
                print("⚠️ Usuário sem ID Bitrix, endereço não sincronizado.")

            # 2. (Opcional) Poderíamos salvar localmente se tivéssemos modelo de endereço
            
            # 3. Limpar Cache do Perfil
            from django.core.cache import cache
            cache.delete(f"user_profile_full_{user.id}")

            return Response({"message": "Endereço atualizado com sucesso."}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"❌ Erro UpdateAddressView: {e}")
            return Response({"error": "Erro interno."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    """
    Retorna o perfil completo do usuário, incluindo dados do Bitrix.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"user_profile_full_{user.id}"

        # 1. Tenta Cache
        cached_profile = cache.get(cache_key)
        if cached_profile:
            return Response(cached_profile, status=status.HTTP_200_OK)
        
        # 2. Dados Básicos do Usuário
        profile_data = {
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "plan": user.current_plan,
        }

        # 3. Buscar dados enriquecidos do Bitrix (Telefone, Endereço)
        try:
            bitrix_data = BitrixService.get_contact_data(user)
            profile_data.update(bitrix_data) # Mescla phone e address no JSON
        except Exception as e:
            print(f"⚠️ Erro ao buscar perfil Bitrix: {e}")
            # Não falha o request, apenas vai sem os dados extras

        # 4. Salva Cache (5 min)
        cache.set(cache_key, profile_data, 300)

        return Response(profile_data, status=status.HTTP_200_OK)

from django.core.cache import cache

class UserProtocolView(APIView):
    """
    Retorna o protocolo ativo do usuário (negócio no Bitrix).
    Com Cache de 10 minutos para evitar lentidão.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"user_protocol_{user.id}"
        
        # 1. Tenta pegar do Cache
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        # 2. Se não tiver, busca no Bitrix (Lento)
        result = BitrixService.get_client_protocol(user)
        
        if not result or "error" in result:
             error_msg = result.get('error') if result else 'Erro desconhecido'
             print(f"⚠️ UserProtocolView Warning: {error_msg} for user {user.email}")
             return Response(result or {"error": "Erro ao buscar protocolo"}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Salva no Cache por 10 minutos (600s)
        cache.set(cache_key, result, 600)

        return Response(result, status=status.HTTP_200_OK)