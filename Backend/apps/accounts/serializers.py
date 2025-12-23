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

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
        return value

    def create(self, validated_data):
        questionnaire_answers = validated_data.pop('questionnaire_data')
        password = validated_data.pop('password')
        email = validated_data['email']
        
        with transaction.atomic():
            # CORREÇÃO CRÍTICA AQUI:
            # Removemos 'username=email' porque seu model User não tem o campo username.
            user = User.objects.create_user(
                email=email,
                full_name=validated_data.get('full_name', ''),
                password=password,
                role='patient'
            )
            
            # 2. Salva o Primeiro Questionário
            UserQuestionnaire.objects.create(
                user=user,
                answers=questionnaire_answers,
                is_latest=True
            )
            
            # 3. Integração Bitrix
            print(f"🔄 Tentando registrar no Bitrix para o user ID: {user.id}")
            
            try:
                bitrix_id = BitrixService.create_lead(user, questionnaire_answers)
                
                if bitrix_id:
                    user.id_bitrix = str(bitrix_id)
                    user.save(update_fields=['id_bitrix'])
                    print(f"✅ SUCESSO: Local ID {user.id} vinculado ao Bitrix ID {user.id_bitrix}")
                else:
                    print("⚠️ ATENÇÃO: Usuário criado localmente, mas falha ao obter ID do Bitrix.")
            except Exception as e:
                print(f"⚠️ Erro não fatal na integração com Bitrix: {e}")
            
        return user

class RegisterSerializer(serializers.ModelSerializer):
    questionnaire_data = serializers.JSONField(write_only=True)
    address_data = serializers.JSONField(write_only=True, required=False) # Novo campo
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'questionnaire_data', 'address_data']

    def create(self, validated_data):
        questionnaire_answers = validated_data.pop('questionnaire_data')
        address_info = validated_data.pop('address_data', {}) # Extrai endereço
        password = validated_data.pop('password')
        email = validated_data['email']
        
        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                full_name=validated_data.get('full_name', ''),
                password=password,
                role='patient'
            )
            
            UserQuestionnaire.objects.create(
                user=user,
                answers=questionnaire_answers,
                is_latest=True
            )
            
            # Atualiza Bitrix com Endereço
            try:
                # Modifique seu BitrixService.create_lead para aceitar address_info
                # Ou combine os dados:
                full_data = {**questionnaire_answers, **address_info}
                
                bitrix_id = BitrixService.create_lead(user, full_data)
                
                if bitrix_id:
                    user.id_bitrix = str(bitrix_id)
                    user.save(update_fields=['id_bitrix'])
            except Exception as e:
                print(f"Erro Bitrix: {e}")
            
        return user