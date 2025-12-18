from rest_framework import serializers
from .models import User, UserQuestionnaire
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .services import BitrixService

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['full_name'] = user.full_name
        token['role'] = user.role
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'email': self.user.email,
        }
        return data

class UserQuestionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserQuestionnaire
        fields = ['answers', 'created_at', 'is_latest']

class RegisterSerializer(serializers.ModelSerializer):
    questionnaire_data = serializers.JSONField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'questionnaire_data']

    # Validação para evitar erro de integridade se o e-mail já existir
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
        return value

    def create(self, validated_data):
        questionnaire_answers = validated_data.pop('questionnaire_data')
        password = validated_data.pop('password')
        email = validated_data['email']
        
        with transaction.atomic():
            # 1. Cria usuário local (O ID é gerado aqui)
            user = User.objects.create_user(
                username=email, 
                email=email,
                full_name=validated_data.get('full_name', ''),
                password=password,
                role='patient' # Garante que novos registros via site sejam pacientes
            )
            
            # 2. Salva o Primeiro Questionário
            UserQuestionnaire.objects.create(
                user=user,
                answers=questionnaire_answers,
                is_latest=True
            )
            
            # 3. Integração Bitrix com Debug e Salvamento Explícito
            print(f"🔄 Tentando registrar no Bitrix para o user ID: {user.id}")
            
            # Chama o serviço (que agora também deve enviar o ID local para o Bitrix)
            bitrix_id = BitrixService.create_lead(user, questionnaire_answers)
            
            if bitrix_id:
                # Converte para string para garantir compatibilidade com CharField
                user.id_bitrix = str(bitrix_id)
                
                # Força o update apenas deste campo para garantir que o Django não se perca
                user.save(update_fields=['id_bitrix'])
                
                print(f"✅ SUCESSO: Local ID {user.id} vinculado ao Bitrix ID {user.id_bitrix}")
            else:
                print("⚠️ ATENÇÃO: Usuário criado localmente, mas falha ao obter ID do Bitrix.")
            
        return user