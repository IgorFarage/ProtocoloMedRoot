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
    asaas_customer_id = models.CharField(max_length=50, null=True, blank=True, help_text="ID do Cliente no Asaas")
    
    # Lógica de Negócio
    current_plan = models.CharField(
        max_length=20, 
        choices=PlanType.choices, 
        default=PlanType.NONE
    )

    # Agendamento de Troca de Plano (Downgrade)
    scheduled_plan = models.CharField(
        max_length=20,
        choices=PlanType.choices,
        null=True,
        blank=True,
        help_text="Plano agendado para a próxima renovação."
    )
    scheduled_transition_date = models.DateField(
        null=True,
        blank=True,
        help_text="Data prevista para a troca de plano."
    )
    role = models.CharField(
        max_length=10, 
        choices=RoleType.choices, 
        default=RoleType.PATIENT
    )
    
    # --- CICLO DE VIDA DA ASSINATURA ---
    class SubscriptionStatus(models.TextChoices):
        ACTIVE = 'active', 'Ativo'
        PAST_DUE = 'past_due', 'Atrasado'
        CANCELED = 'canceled', 'Cancelado'
        GRACE_PERIOD = 'grace_period', 'Cancelamento Agendado'

    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE
    )
    
    cancel_reason = models.TextField(null=True, blank=True, help_text="Motivo do cancelamento informado pelo usuário")
    
    # Data limite do acesso (Grace Period)
    access_valid_until = models.DateTimeField(null=True, blank=True, help_text="Data até quando o usuário mantém acesso após cancelar")
    
    # Data agendada para o 'Ceifador' rodar
    scheduled_cancellation_date = models.DateTimeField(null=True, blank=True, help_text="Data efetiva para corte do serviço")

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
    class SpecialtyType(models.TextChoices):
        TRICHOLOGIST = 'trichologist', 'Tricologista'
        NUTRITIONIST = 'nutritionist', 'Nutricionista'

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    crm = models.CharField(max_length=20)
    specialty = models.CharField(max_length=100) # Legacy (Mantido para exibição livre)
    specialty_type = models.CharField(
        max_length=20, 
        choices=SpecialtyType.choices, 
        default=SpecialtyType.TRICHOLOGIST
    )
    profile_photo = models.ImageField(upload_to="doctor_photos/", null=True, blank=True)
    bio = models.TextField(blank=True, null=True, help_text="Descrição curta ou mini-currículo do profissional.")

class Patients(models.Model):
    """
    Dados específicos de Pacientes (Vínculo com médico).
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    
    # Legacy Field (Will be removed after migration)
    assigned_doctor = models.ForeignKey(Doctors, on_delete=models.SET_NULL, null=True, blank=True, related_name='legacy_patients')
    
    # New Medical Team
    assigned_trichologist = models.ForeignKey(
        Doctors, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='trichology_patients'
    )
    assigned_nutritionist = models.ForeignKey(
        Doctors, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='nutrition_patients'
    )

class DoctorInvite(models.Model):
    """
    Código de convite para cadastro de médicos.
    Gerado pelo Admin, consumido no Registro.
    """
    code = models.CharField(max_length=20, unique=True, help_text="Código único de convite (Ex: DOC-X92A)")
    is_used = models.BooleanField(default=False)
    
    # Quem usou o código?
    used_by = models.OneToOneField(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='invite_used',
        help_text="Médico que utilizou este convite"
    )
    
    # Quando foi usado?
    used_at = models.DateTimeField(null=True, blank=True)

    # Quem criou? (Admin)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='invites_created'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = "USADO" if self.is_used else "DISPONÍVEL"
        return f"{self.code} [{status}]"