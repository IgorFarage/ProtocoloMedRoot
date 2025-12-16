# apps/medical/models.py

from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField # Para JSONB/ArrayFields (se seu Postgres suportar)
import json

# Referências a perfis no app 'accounts'
DOCTOR_MODEL = 'accounts.Doctors'
PATIENT_MODEL = 'accounts.Patients'
USER_MODEL = settings.AUTH_USER_MODEL # Referência a 'accounts.User'

# =============================================================================
# 1. ANAMNESE (METADATA E RESPOSTAS)
# =============================================================================

class AnamnesisQuestions(models.Model):
    step_order = models.IntegerField()
    section = models.CharField(max_length=50, null=True, blank=True)
    question_text = models.TextField()
    input_type = models.CharField(max_length=20, default='single_choice')
    is_active = models.BooleanField(default=True)
    class Meta:
        verbose_name = 'Pergunta da Anamnese'

class AnamnesisOptions(models.Model):
    question = models.ForeignKey(AnamnesisQuestions, on_delete=models.CASCADE)
    option_text = models.TextField()
    # Armazena lógica de negócio (ex: {"exclude_tags": ["minoxidil"]})
    logic_metadata = models.JSONField(null=True, blank=True) 
    class Meta:
        verbose_name = 'Opção da Anamnese'

class AnamnesisSessions(models.Model):
    user = models.ForeignKey(USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='completed')
    # Armazena o resultado da IA (nível de risco, protocolo sugerido)
    ai_score_data = models.JSONField(null=True, blank=True) 
    class Meta:
        verbose_name = 'Sessão da Anamnese'

class AnamnesisAnswers(models.Model):
    session = models.ForeignKey(AnamnesisSessions, on_delete=models.CASCADE)
    question_key = models.CharField(max_length=100)
    answer_value = models.TextField(null=True, blank=True)
    is_red_flag = models.BooleanField(default=False)
    class Meta:
        verbose_name = 'Resposta da Anamnese'


# =============================================================================
# 2. ACOMPANHAMENTO CLÍNICO
# =============================================================================

class Appointments(models.Model):
    # FKs para os perfis específicos, conforme normalização
    patient_profile = models.ForeignKey(PATIENT_MODEL, on_delete=models.CASCADE, related_name='appointments_as_patient') 
    doctor_profile = models.ForeignKey(DOCTOR_MODEL, on_delete=models.CASCADE, related_name='appointments_as_doctor')
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, default='scheduled')
    meeting_link = models.CharField(max_length=255, null=True, blank=True)
    class Meta:
        verbose_name = 'Consulta Médica'
        ordering = ['scheduled_at']

class PatientPhotos(models.Model):
    patient = models.ForeignKey(PATIENT_MODEL, on_delete=models.CASCADE)
    photo_url = models.CharField(max_length=255)
    taken_at = models.DateField(auto_now_add=True)
    is_public = models.BooleanField(default=False)
    class Meta:
        verbose_name = 'Foto de Evolução'