from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Campos que ficam no BD Local
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    
    # Referência para o Bitrix (Onde estarão CPF e Endereço)
    id_bitrix = models.CharField(max_length=100, blank=True, null=True)
    
    ROLE_CHOICES = (
        ('doctor', 'Médico'),
        ('patient', 'Paciente'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    recommended_medications = models.JSONField(null=True, blank=True)

    def __str__(self):
        return self.email

class UserQuestionnaire(models.Model):
    """
    Histórico de respostas do utilizador.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questionnaires')
    answers = models.JSONField() 
    created_at = models.DateTimeField(auto_now_add=True)
    is_latest = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.is_latest:
            UserQuestionnaire.objects.filter(user=self.user).update(is_latest=False)
        super().save(*args, **kwargs)

# Modelos auxiliares simplificados
class Doctors(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    crm = models.CharField(max_length=20)
    specialty = models.CharField(max_length=100)

class Patients(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    gender = models.CharField(max_length=20)
    assigned_doctor = models.ForeignKey(Doctors, on_delete=models.SET_NULL, null=True, blank=True)

class RecommendedMedication(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medications')
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=255, blank=True)
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']