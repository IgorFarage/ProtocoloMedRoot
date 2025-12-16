# apps/accounts/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db.models.fields.related import ManyToManyField, OneToOneField
from django.conf import settings

# =============================================================================
# 1. MANAGER DE USUÁRIOS CUSTOMIZADO (Para login via email)
# =============================================================================

class UserManager(BaseUserManager):
    # Baseado na solução do AbstractUser para email login
    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('O email deve ser definido.')
        
        email = self.normalize_email(email)
        extra_fields.pop('username', None) 
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(email, password, **extra_fields)


# =============================================================================
# 2. MODELO DE USUÁRIO CENTRAL (CUSTOMIZAÇÃO)
# =============================================================================

class User(AbstractUser):
    objects = UserManager() 
    
    # Sobrescreve campos AbstractUser para usar o email como login
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, null=True, blank=True)
    
    # Seus campos originais
    full_name = models.CharField(max_length=255, blank=True, null=True)
    cpf = models.CharField(unique=True, max_length=14, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, blank=True, null=True)
    
    # Resolve conflitos de related_name com o sistema Auth padrão do Django
    groups = ManyToManyField('auth.Group', related_name='protocolomed_user_groups', blank=True)
    user_permissions = ManyToManyField('auth.Permission', related_name='protocolomed_user_permissions', blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name'] 
    
    class Meta:
        verbose_name = 'Usuário do Sistema'

# =============================================================================
# 3. LOCALIZAÇÃO E ENDEREÇOS (3FN)
# =============================================================================

class FederativeUnits(models.Model):
    name = models.CharField(max_length=50)
    acronym = models.CharField(unique=True, max_length=2)
    class Meta:
        verbose_name = 'UF/Estado'

class Cities(models.Model):
    name = models.CharField(max_length=100)
    state = models.ForeignKey(FederativeUnits, on_delete=models.CASCADE)
    ibge_code = models.IntegerField(null=True, blank=True)
    class Meta:
        verbose_name = 'Cidade'
        unique_together = ['name', 'state']

class Addresses(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    city = models.ForeignKey(Cities, on_delete=models.SET_NULL, null=True, blank=True)
    cep = models.CharField(max_length=10)
    logradouro = models.CharField(max_length=255)
    numero = models.CharField(max_length=10, blank=True, null=True)
    complemento = models.CharField(max_length=100, blank=True, null=True)
    bairro = models.CharField(max_length=60, blank=True, null=True)
    address_type = models.CharField(max_length=15, default='residential')
    is_main = models.BooleanField(default=True)
    class Meta:
        verbose_name = 'Endereço'

class UserContacts(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    contact_type = models.CharField(max_length=20)
    contact_value = models.CharField(max_length=50)
    is_main = models.BooleanField(default=False)
    class Meta:
        verbose_name = 'Contato do Usuário'
        unique_together = ['user', 'contact_type', 'contact_value']


# =============================================================================
# 4. PERFIS DE SAÚDE (Doctors e Patients)
# =============================================================================

class Doctors(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='doctor_profile')
    crm = models.CharField(unique=True, max_length=20)
    uf_crm = models.CharField(max_length=2)
    specialty = models.CharField(max_length=100, blank=True, null=True, default='Dermatologista')
    consultation_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    class Meta:
        verbose_name = 'Médico'

class Patients(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='patient_profile')
    assigned_doctor = models.ForeignKey(Doctors, on_delete=models.SET_NULL, related_name='assigned_patients', blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    class Meta:
        verbose_name = 'Paciente'

# =============================================================================
# 5. STAFF
# =============================================================================

class InternalStaff(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    department = models.CharField(max_length=50)
    employee_code = models.CharField(max_length=20)
    class Meta:
        verbose_name = 'Staff Interno'