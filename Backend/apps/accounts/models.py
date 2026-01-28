from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import uuid

# --- 1. GERENCIADOR DE USUÁRIO (Obrigatório para AbstractBaseUser) ---
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O Email é obrigatório')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

# --- 2. MODELO DE USUÁRIO UNIFICADO ---
class User(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de usuário customizado.
    Mantém dados de autenticação e plano localmente.
    Endereço e CPF ficam no Bitrix (vinculados pelo id_bitrix).
    """
    class PlanType(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        PLUS = 'plus', 'Plus'
        NONE = 'none', 'Nenhum'

    class RoleType(models.TextChoices):
        DOCTOR = 'doctor', 'Médico'
        PATIENT = 'patient', 'Paciente'

    # Identificação
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    
    # Endereço Local (Cache/Persistência)
    cep = models.CharField(max_length=10, null=True, blank=True)
    street = models.CharField(max_length=255, null=True, blank=True)
    number = models.CharField(max_length=20, null=True, blank=True)
    complement = models.CharField(max_length=255, null=True, blank=True)
    neighborhood = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=2, null=True, blank=True)

    # Integrações
    id_bitrix = models.CharField(max_length=50, null=True, blank=True, help_text="ID do contato no CRM")
    customer_id_mp = models.CharField(max_length=50, null=True, blank=True, help_text="ID do Cliente no Mercado Pago")
    
    # Lógica de Negócio
    current_plan = models.CharField(
        max_length=20, 
        choices=PlanType.choices, 
        default=PlanType.NONE
    )
    role = models.CharField(
        max_length=10, 
        choices=RoleType.choices, 
        default=RoleType.PATIENT
    )

    # Armazena o protocolo atual (JSON simples para consulta rápida)
    recommended_medications = models.JSONField(default=list, blank=True)
    
    # Permissões do Django
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return self.email

# --- 3. MODELOS AUXILIARES ---

class UserQuestionnaire(models.Model):
    """
    Histórico de respostas do questionário capilar.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questionnaires')
    answers = models.JSONField() 
    created_at = models.DateTimeField(auto_now_add=True)
    is_latest = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Garante que apenas o último seja is_latest=True
        if self.is_latest:
            UserQuestionnaire.objects.filter(user=self.user).update(is_latest=False)
        super().save(*args, **kwargs)

class Doctors(models.Model):
    """
    Dados específicos de Médicos (CRM, Especialidade).
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    crm = models.CharField(max_length=20)
    specialty = models.CharField(max_length=100)

class Patients(models.Model):
    """
    Dados específicos de Pacientes (Vínculo com médico).
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    assigned_doctor = models.ForeignKey(Doctors, on_delete=models.SET_NULL, null=True, blank=True)