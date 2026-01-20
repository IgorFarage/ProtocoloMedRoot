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

        # [NOVO] Verificar se existe transação Pendente (Para mostrar no Dashboard)
        # Import local para evitar ciclo se financial importar accounts
        from apps.financial.models import Transaction
        
        # 3. Buscar dados enriquecidos do Bitrix (Telefone, Endereço, PLANO)
        bitrix_status_report = {}
        try:
            # [FIX] Forçar sincronização do plano com Bitrix (Source of Truth)
            bitrix_status_report = BitrixService.check_and_update_user_plan(user)
            
            # Recarrega usuário do banco para pegar o plano atualizado
            user.refresh_from_db()
            profile_data['plan'] = user.current_plan

            bitrix_data = BitrixService.get_contact_data(user)
            profile_data.update(bitrix_data) # Mescla phone e address no JSON
        except Exception as e:
            print(f"⚠️ Erro ao buscar perfil Bitrix: {e}")
            # Não falha o request, apenas vai sem os dados extras

        pending_tx = Transaction.objects.filter(
            user=user, 
            status=Transaction.Status.PENDING
        ).order_by('-created_at').first()

        bitrix_payment_status = bitrix_status_report.get('payment_status', 'Unknown')
        is_bitrix_pending = bitrix_payment_status in ['Pendente', 'Em análise', 'Em processo']

        if pending_tx or is_bitrix_pending:
            profile_data['pending_transaction'] = {
                'exists': True,
                'order_id': pending_tx.external_reference if pending_tx else None,
                'payment_method': pending_tx.payment_type if pending_tx else 'pix', # Default Pix se não achar
                'bitrix_status': bitrix_payment_status # Debug Frontend
            }
        else:
             profile_data['pending_transaction'] = {'exists': False}

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

class UserUpdateView(APIView):
    """
    Permite atualizar dados básicos do usuário (Nome, Telefone).
    Usado no Checkout se o usuário quiser corrigir dados.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        data = request.data
        
        full_name = data.get('full_name')
        phone = data.get('phone')

        updated = False
        if full_name:
            user.full_name = full_name
            updated = True
        if phone:
            user.phone = phone
            updated = True
        
        if updated:
            user.save()
            # Tenta sincronizar contato no Bitrix (Nome/Fone)
            try:
                if user.id_bitrix:
                    # TODO: Implementar update_contact_data no BitrixService se necessário
                    # Por enquanto apenas logamos, pois o update_address foca no endereço
                    print(f"ℹ️ Dados locais atualizados para {user.email}. Bitrix sync pendente.")
            except:
                pass


        return Response({"message": "Dados atualizados com sucesso."}, status=status.HTTP_200_OK)

# 6. Webhook Endpoint
class BitrixWebhookView(APIView):
    """
    Endpoint público para receber notificações do Bitrix.
    Segurança: Valida 'auth[application_token]' contra BITRIX_APP_TOKEN_SECRET.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import os
        
        # 1. Validação de Segurança (Token Secret)
        secret = os.getenv('BITRIX_APP_TOKEN_SECRET')
        incoming_token = request.data.get('auth[application_token]')
        
        # Se não configurado secret, loga warning mas (por enquanto) processa ou rejeita? 
        # R: Rejeita (Forbidden) se secret existir. Se não existir, é perigoso deixar aberto.
        if secret and incoming_token != secret:
            print(f"⛔ Tentativa de Webhook com Token Inválido: {incoming_token}")
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # 2. Processamento Assíncrono (Idealmente) ou Rápido
        # O Bitrix espera 200 OK rápido.
        try:
            # Delegate to Service
            BitrixService.process_incoming_webhook(request.data)
        except Exception as e:
            # Nunca retornar erro 500 para o Bitrix, senão ele desativa o webhook
            print(f"❌ Erro processando Webhook: {e}")
        
        return Response({"status": "received"}, status=status.HTTP_200_OK)