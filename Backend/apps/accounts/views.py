# Backend/apps/accounts/views.py

import logging
from rest_framework import status, generics
from django.db import transaction
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

logger = logging.getLogger(__name__)

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
        logger.info("📝 Iniciando Registro de Usuário...")
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # 1. Salva no Banco Local
                user = serializer.save()
                logger.info(f"✅ Usuário Local Criado: {user.email}")

                # 2. Envia para o Bitrix
                try:
                    answers = request.data.get('questionnaire_data', {})
                    address_data = request.data.get('address_data', {}) # <--- CAPTURA O ENDEREÇO
                    
                    logger.info("🚀 Enviando dados (Lead + Endereço) para o Bitrix...")
                    
                    # Passamos o endereço para a função create_lead
                    bitrix_id = BitrixService.create_lead(user, answers, address_data)
                    
                    if bitrix_id:
                        user.id_bitrix = str(bitrix_id)
                        user.save()
                        logger.info(f"✅ Bitrix Vinculado! ID: {bitrix_id}")
                    
                except Exception as e_bitrix:
                    logger.error(f"❌ Erro Bitrix: {e_bitrix}")

                return Response({
                    "message": "Sucesso",
                    "user": {"id": user.id, "email": user.email}
                }, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.exception("Erro interno no registro")
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
            logger.error(f"Erro no Checkout: {e}")
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

        logger.info(f"📍 Atualizando endereço para usuário {user.email}...")

        if not address_data:
            return Response({"error": "Dados de endereço obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 1. Atualiza no Bitrix se houver vínculo
            if user.id_bitrix:
                BitrixService.update_contact_address(user.id_bitrix, address_data)
            else:
                logger.warning("⚠️ Usuário sem ID Bitrix, endereço não sincronizado.")

            # 2. Salva localmente (Cache/Persistência)
            user.cep = address_data.get('cep')
            user.street = address_data.get('street')
            user.number = address_data.get('number')
            user.neighborhood = address_data.get('neighborhood')
            user.city = address_data.get('city')
            user.state = address_data.get('state')
            user.complement = address_data.get('complement')
            user.save()
            logger.info(f"✅ Endereço salvo localmente para {user.email}")
            
            # 3. Limpar Cache do Perfil
            from django.core.cache import cache
            cache.delete(f"user_profile_full_{user.id}")

            return Response({"message": "Endereço atualizado com sucesso."}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"❌ Erro UpdateAddressView: {e}")
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
            "phone": user.phone,
            "date_of_birth": user.date_of_birth,
            "address": {
                "street": user.street,
                "number": user.number,
                "city": user.city,
                "state": user.state,
                "zip": user.cep,
                "neighborhood": user.neighborhood,
                "complement": user.complement
            }
        }

        # [MOVED] Logic moved downstream to ensure Fresh Data after Sync

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
            
            # [AUTO-HEAL] Persistência: Se o banco local estiver vazio, trazer do Bitrix
            updated_local = False
            
            if not user.phone and bitrix_data.get('phone'):
                user.phone = bitrix_data['phone']
                updated_local = True

            bx_addr = bitrix_data.get('address', {})
            if not user.street and bx_addr.get('street'):
                user.street = bx_addr.get('street')
                user.city = bx_addr.get('city')
                user.state = bx_addr.get('state')
                user.cep = bx_addr.get('zip')
                user.neighborhood = bx_addr.get('neighborhood')
                # Bitrix pode juntar numero/comp, mas tentamos o básico
                updated_local = True

            if updated_local:
                user.save()
                logger.info(f"🔧 Auto-healing: Dados de Contato recuperados do Bitrix p/ {user.email}")

            # Mescla para o frontend (Prioriza Bitrix se vier algo novo, mas local já está no default)
            # [FIX] Não sobrescrever telefone local com vazio do Bitrix
            bitrix_phone = bitrix_data.get('phone')
            if bitrix_phone:
                profile_data['phone'] = bitrix_phone
            
            # Remove phone do update genérico para evitar overwrite com vazio/None
            bitrix_data_copy = bitrix_data.copy()
            if 'phone' in bitrix_data_copy:
                del bitrix_data_copy['phone']

            profile_data.update(bitrix_data_copy) 
        except Exception as e:
            logger.warning(f"⚠️ Erro ao buscar perfil Bitrix: {e}")
            # Não falha o request, apenas vai sem os dados extras

        # [MOVED HERE] Equipe Médica (Tricologista + Nutricionista)
        # Refresh User again to be safe
        user.refresh_from_db()
        
        medical_team = {"trichologist": None, "nutritionist": None}
        try:
            if hasattr(user, 'patients'):
                p = user.patients
                
                if p.assigned_trichologist:
                    doc = p.assigned_trichologist
                    medical_team["trichologist"] = {
                        "name": doc.user.full_name,
                        "crm": doc.crm,
                        "photo": doc.profile_photo.url if doc.profile_photo else None,
                        "id": str(doc.user.id),
                        "description": doc.bio
                    }
                    
                if p.assigned_nutritionist:
                    doc = p.assigned_nutritionist
                    medical_team["nutritionist"] = {
                        "name": doc.user.full_name,
                        "crm": doc.crm,
                        "photo": doc.profile_photo.url if doc.profile_photo else None,
                        "id": str(doc.user.id),
                        "description": doc.bio
                    }
        except Exception as e:
            logger.warning(f"Erro ao montar equipe médica (Pós-Sync): {e}")

        profile_data['medical_team'] = medical_team

        # [NOVO] Payment Info (Last Approved Credit Card)
        last_cc_tx = Transaction.objects.filter(
            user=user,
            payment_type=Transaction.PaymentType.CREDIT_CARD,
            status=Transaction.Status.APPROVED
        ).order_by('-created_at').first()

        payment_info = {
            "has_card": False,
            "cardName": "",
            "cardNumber": "",
            "brand": "",
            "expiry": "" 
        }

        if last_cc_tx and last_cc_tx.mp_metadata:
            # Asaas Response is stored in payment_response
            resp = last_cc_tx.mp_metadata.get('payment_response', {})
            # Try to get creditCard object (common in Subscription and Payment response)
            cc_data = resp.get('creditCard')
            
            if cc_data:
                payment_info = {
                    "has_card": True,
                    "cardName": "Cartão Salvo", # Asaas returns holderName? Often not in response, but let's check input
                    "cardNumber": f"**** **** **** {cc_data.get('creditCardNumber', '****')}",
                    "brand": cc_data.get('creditCardBrand', 'Desconhecido'),
                    "expiry": "**/**" # Asaas usually masks this
                }
        
        profile_data['payment_info'] = payment_info

        # [NOVO] Plan Info for UI
        # Try to get from last Approved Transaction or User
        plan_name = user.current_plan.capitalize() if user.current_plan else "Nenhum"
        
        # Encontra última transação aprovada para saber ciclo/preço
        last_success_tx = Transaction.objects.filter(
            user=user, 
            status=Transaction.Status.APPROVED
        ).order_by('-created_at').first()

        plan_info = {
            "name": f"Plano {plan_name}",
            "cycle": last_success_tx.get_cycle_display() if last_success_tx else "Mensal",
            "price": f"R$ {last_success_tx.paid_amount}" if last_success_tx else "-",
            "status": "Ativo",
            "subscription_status": getattr(user, 'subscription_status', 'active'),
            "access_until": user.access_valid_until.strftime("%d/%m/%Y") if user.access_valid_until else None,
            "is_subscription": last_success_tx.asaas_subscription_id is not None if last_success_tx else False,
            # [NOVO] Downgrade Agendado
            "scheduled_plan": getattr(user, 'scheduled_plan', None),
            "scheduled_date": user.scheduled_transition_date.strftime("%d/%m/%Y") if getattr(user, 'scheduled_transition_date', None) else None
        }
        
        # Adjust Display Status for Grace Period
        if user.subscription_status == 'grace_period':
             plan_info['status'] = 'Cancelamento Agendado'
             plan_info['warning'] = f"Seu acesso encerra em {plan_info['access_until']}"
             
        profile_data['plan_info'] = plan_info

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
             # [FALLBACK] Se não achou Deal (User Inativo), gera sugestão baseada nas respostas
             # Isso garante que o Frontend receba produtos com preços reais do catálogo
             last_q = UserQuestionnaire.objects.filter(user=user).order_by('-created_at').first()
             if last_q:
                 suggested = BitrixService.generate_protocol(last_q.answers)
                 if suggested and not "error" in suggested:
                     # Salva no Cache e retorna como sucesso
                     cache.set(cache_key, suggested, 600)
                     return Response(suggested, status=status.HTTP_200_OK)

             error_msg = result.get('error') if result else 'Erro desconhecido'
             logger.warning(f"⚠️ UserProtocolView Warning: {error_msg} for user {user.email}")
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
        if 'full_name' in data:
            user.full_name = data.get('full_name')
            updated = True
        
        if 'phone' in data:
            user.phone = data.get('phone')
            updated = True
            
        if 'date_of_birth' in data:
            user.date_of_birth = data.get('date_of_birth')
            updated = True
        
        if updated:
            user.save()
            # Tenta sincronizar contato no Bitrix (Nome/Fone)
            try:
                if user.id_bitrix:
                    # TODO: Implementar update_contact_data no BitrixService se necessário
                    # Por enquanto apenas logamos, pois o update_address foca no endereço
                    logger.info(f"ℹ️ Dados locais atualizados para {user.email}. Bitrix sync pendente.")
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
            logger.warning(f"⛔ Tentativa de Webhook com Token Inválido: {incoming_token}")
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # 2. Processamento Assíncrono (Idealmente) ou Rápido
        # O Bitrix espera 200 OK rápido.
        try:
            # Delegate to Service
            BitrixService.process_incoming_webhook(request.data)
        except Exception as e:
            # Nunca retornar erro 500 para o Bitrix, senão ele desativa o webhook
            logger.error(f"❌ Erro processando Webhook: {e}")
        
        return Response({"status": "received"}, status=status.HTTP_200_OK)

# 7. Password Reset Views
from .services import PasswordResetService

class PasswordResetRequestView(APIView):
    """
    Endpoint para solicitar redefinição de senha.
    Payload: {"email": "user@example.com"}
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "E-mail é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Chama serviço (sempre retorna True por segurança)
        PasswordResetService.request_password_reset(email)
        
        return Response({
            "message": "Se o e-mail estiver cadastrado, você receberá um link de redefinição."
        }, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    """
    Endpoint para confirmar nova senha.
    Payload: {"uid": "...", "token": "...", "new_password": "..."}
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not all([uid, token, new_password]):
            return Response({"error": "Todos os campos são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

        success = PasswordResetService.confirm_password_reset(uid, token, new_password)
        
        if success:
            return Response({"message": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Token inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

# 8. Doctor Self-Registration
from .models import Doctors
from .services import DoctorInviteService

class DoctorRegisterView(APIView):
    """
    Endpoint para auto-cadastro de Médicos via link/convite.
    Segurança: Exige 'invite_code' válido gerenciado no Admin.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data
        invite_code = data.get('invite_code')
        
        # 1. Validação do Código de Convite (Dinâmica via Banco)
        if not DoctorInviteService.validate_code(invite_code):
            return Response({"error": "Código de convite inválido ou já utilizado."}, status=status.HTTP_403_FORBIDDEN)
            
        email = data.get('email', '').strip().lower()
        password = data.get('password')
        # Ajuste para suportar tanto split fields quanto full_name direto
        if data.get('first_name'):
             full_name = f"{data.get('first_name')} {data.get('last_name', '')}".strip()
        else:
             full_name = data.get('full_name', '').strip()

        crm = data.get('crm')
        specialty = data.get('specialty', 'Tricologia')
        specialty_type = data.get('specialty_type', 'trichologist')
        
        if not email or not password or not full_name or not crm:
             return Response({"error": "Todos os campos são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)
             
        # 2. Verifica se usuário já existe
        if User.objects.filter(email=email).exists():
            return Response({"error": "E-mail já cadastrado."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                # 3. Criar Usuário Base
                user = User.objects.create_user(email=email, password=password, full_name=full_name)
                # Adiciona prefixo Dr./Dra. se não tiver
                if not (user.full_name.startswith("Dr.") or user.full_name.startswith("Dra.")):
                    user.full_name = f"Dr(a). {user.full_name}"
                
                user.role = 'doctor'
                user.save()
                
                # 4. Criar Perfil Médico
                Doctors.objects.create(
                    user=user, 
                    crm=crm, 
                    specialty=specialty,
                    specialty_type=specialty_type
                )
                
                # 5. Consumir o Convite (Marcar como usado)
                DoctorInviteService.consume_code(invite_code, user)
                
                logger.info(f"👨‍⚕️ Novo Médico registrado via Link: {user.email} (CRM: {crm})")
                
                return Response({"message": "Conta médica criada com sucesso!"}, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"❌ Erro ao registrar médico: {e}")

# 9. Doctor Profile Settings
class DoctorProfileUpdateView(APIView):
    """
    Endpoint para ver e editar o perfil do médico (Bio, Foto, Telefone, etc).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'doctor':
            return Response({"error": "Apenas médicos podem acessar este perfil."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            doctor = user.doctors # Acesso reverso OneToOne
        except Doctors.DoesNotExist:
             return Response({"error": "Perfil médico não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "fullName": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "crm": doctor.crm,
            "specialty": doctor.specialty, # Free text legacy
            "specialty_type": doctor.specialty_type,
            "bio": doctor.bio,
            "profilePhoto": doctor.profile_photo.url if doctor.profile_photo else None
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        if user.role != 'doctor':
             return Response({"error": "Acesso negado."}, status=status.HTTP_403_FORBIDDEN)

        try:
            doctor = user.doctors
        except Doctors.DoesNotExist:
             return Response({"error": "Perfil médico não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data # Pode ser multipart (com arquivos) ou JSON
        
        # 1. Atualizar User (Nome, Telefone)
        full_name = data.get('fullName')
        phone = data.get('phone')
        
        if 'fullName' in data:
             user.full_name = data.get('fullName')
        
        if 'phone' in data:
            user.phone = data.get('phone') # Permite limpar se vier string vazia
            logger.info(f"📞 Telefone atualizado para: {user.phone}")
            
        user.save()

        # 2. Atualizar Doctor (Bio, CRM, Specialty, Foto)
        bio = data.get('bio')
        crm = data.get('crm') # Opcional permitir trocar
        specialty = data.get('specialty') # String (tags joinadas ou apenas texto)
        specialty_type = data.get('specialty_type')

        if bio is not None: doctor.bio = bio
        if crm: doctor.crm = crm
        if specialty: doctor.specialty = specialty
        if specialty_type: doctor.specialty_type = specialty_type
        
        # Foto (Files)
        photo = request.FILES.get('profilePhoto')
        if photo:
            doctor.profile_photo = photo
        
        doctor.save()
        
        return Response({"message": "Perfil atualizado com sucesso!"}, status=status.HTTP_200_OK)