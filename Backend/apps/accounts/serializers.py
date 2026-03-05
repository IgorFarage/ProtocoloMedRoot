from rest_framework import serializers
from .models import User, UserQuestionnaire
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .services import BitrixService
import logging

logger = logging.getLogger(__name__)

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['full_name'] = user.full_name
        token['role'] = user.role
        token['email'] = user.email
        token['current_plan'] = user.current_plan
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # [REMOVIDO] A sincronização síncrona com o Bitrix via BitrixService.check_and_update_user_plan
        # foi desativada aqui no momento do Login para evitar gargalos (bottlenecks) na emissão
        # de JWT em caso de instabilidade na API externa. O banco de dados local passa a ser 
        # a fonte da verdade oficial para a UI durante o login.

        data['user'] = {
            'id': self.user.id,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'email': self.user.email,
            'current_plan': self.user.current_plan,
        }
        return data

class UserQuestionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserQuestionnaire
        fields = ['answers', 'created_at', 'is_latest']

class RegisterSerializer(serializers.ModelSerializer):
    # ALTERAÇÃO 1: Adicionei 'required=False' e 'allow_null=True' e TELEFONE OBRIGATÓRIO
    phone = serializers.CharField(required=True)
    cpf = serializers.CharField(required=True, min_length=14, max_length=14)
    date_of_birth = serializers.DateField(required=True, input_formats=['%Y-%m-%d', '%d/%m/%Y'])
    # Isso impede o erro 400 se o dado não vier.
    questionnaire_data = serializers.JSONField(write_only=True, required=False, allow_null=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'cpf', 'phone', 'date_of_birth', 'password', 'questionnaire_data']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
        return value

    def validate_cpf(self, value):
        if User.objects.filter(cpf=value).exists():
            raise serializers.ValidationError("Este CPF já está cadastrado em nossa base.")
        return value

    def create(self, validated_data):
        # ALTERAÇÃO 2: Usamos .pop(..., None) para não quebrar se não tiver dados
        questionnaire_answers = validated_data.pop('questionnaire_data', None)
        password = validated_data.pop('password')
        email = validated_data['email']
        
        with transaction.atomic():
            # 1. Criação do Usuário (Sua lógica original)
            user = User.objects.create_user(
                email=email,
                full_name=validated_data.get('full_name', ''),
                cpf=validated_data.get('cpf', ''),
                phone=validated_data.get('phone', ''),
                date_of_birth=validated_data.get('date_of_birth'),
                password=password,
                role='patient'
            )
            
            # Só tentamos salvar o questionário e mandar pro Bitrix SE houver respostas
            if questionnaire_answers:
                # 2. Salva o Primeiro Questionário localmente na transação
                UserQuestionnaire.objects.create(
                    user=user,
                    answers=questionnaire_answers,
                    is_latest=True
                )
                
        # --- FIM DO BLOCO ATÔMICO (Banco de Dados Seguro e Desbloqueado) ---
                
        # 3. Integração Bitrix (Comunicação via Rede - Fora do Lock)
        if questionnaire_answers:
            logger.info(f"🔄 Tentando registrar no Bitrix para o user ID: {user.id}")
            try:
                from apps.accounts.services import BitrixService
                bitrix_id = BitrixService.create_lead(user, questionnaire_answers)
                
                if bitrix_id:
                    user.id_bitrix = str(bitrix_id)
                    user.save(update_fields=['id_bitrix'])
                    logger.info(f"✅ SUCESSO: Local ID {user.id} vinculado ao Bitrix ID {user.id_bitrix}")
                else:
                    logger.warning("⚠️ ATENÇÃO: Usuário criado localmente, mas falha ao obter ID do Bitrix.")
            except Exception as e:
                logger.warning(f"⚠️ Erro não fatal na integração com Bitrix: {e}")
        else:
            # Caso opcional: Se quiser criar Lead no Bitrix apenas com Nome/Email mesmo sem respostas
            logger.info(f"ℹ️ Usuário {user.id} criado sem dados de questionário inicial.")
            
        return user