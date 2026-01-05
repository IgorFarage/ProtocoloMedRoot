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
    # ALTERAÇÃO 1: Adicionei 'required=False' e 'allow_null=True'
    # Isso impede o erro 400 se o dado não vier.
    questionnaire_data = serializers.JSONField(write_only=True, required=False, allow_null=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'questionnaire_data']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
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
                password=password,
                role='patient'
            )
            
            # Só tentamos salvar o questionário e mandar pro Bitrix SE houver respostas
            if questionnaire_answers:
                # 2. Salva o Primeiro Questionário
                UserQuestionnaire.objects.create(
                    user=user,
                    answers=questionnaire_answers,
                    is_latest=True
                )
                
                # 3. Integração Bitrix (Sua lógica original preservada)
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
            
            else:
                # Caso opcional: Se quiser criar Lead no Bitrix apenas com Nome/Email mesmo sem respostas
                # você pode colocar uma lógica aqui. Por enquanto, deixei passando direto para não dar erro.
                print(f"ℹ️ Usuário {user.id} criado sem dados de questionário inicial.")
            
        return user