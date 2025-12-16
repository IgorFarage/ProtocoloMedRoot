from rest_framework import serializers
from .models import User, UserQuestionnaire
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
            # Criar o Utilizador usando o manager oficial para garantir hash de senha
            user = User.objects.create_user(
                username=email, 
                email=email,
                full_name=validated_data.get('full_name', ''),
                password=password,
                role='patient' # Garante que novos registros via site sejam pacientes
            )
            
            # Salvar o Primeiro Questionário
            UserQuestionnaire.objects.create(
                user=user,
                answers=questionnaire_answers,
                is_latest=True
            )
            
        return user