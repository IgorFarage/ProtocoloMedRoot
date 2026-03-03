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
    # FKs diretas para o User (Role-based)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appointments_as_patient', null=True, blank=True) 
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments_as_doctor')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, default='scheduled', choices=[
        ('scheduled', 'Agendado'),
        ('completed', 'Realizado'),
        ('cancelled', 'Cancelado'),
        ('waiting_payment', 'Aguardando Pagamento')
    ])
    meeting_link = models.CharField(max_length=255, null=True, blank=True)
    
    # ---------------------------
    # Telemedicina (Daily.co)
    # ---------------------------
    daily_room_name = models.CharField(max_length=100, null=True, blank=True, help_text="Nome da sala privada no Daily.co")
    daily_patient_token = models.TextField(null=True, blank=True, help_text="Token de acesso do Paciente (Visitante)")
    daily_doctor_token = models.TextField(null=True, blank=True, help_text="Token de acesso do Médico (Owner)")

    # ---------------------------
    # Prontuário Eletrônico (EHR)
    # ---------------------------
    clinical_notes = models.TextField(null=True, blank=True, help_text="Anotações gerais e evolução clínica da consulta")
    prescription_data = models.JSONField(null=True, blank=True, help_text="Dados estruturados do Receituário de Medicamentos")
    exam_request_data = models.JSONField(null=True, blank=True, help_text="Dados estruturados do Pedido de Exames")

    consultation_start = models.DateTimeField(null=True, blank=True, help_text="Data/hora real do INÍCIO do atendimento")
    consultation_end = models.DateTimeField(null=True, blank=True, help_text="Data/hora real do TÉRMINO do atendimento")

    class Meta:
        verbose_name = 'Consulta Médica'
        ordering = ['scheduled_at']
        # Evita conflito: Um médico não pode ter duas consultas no mesmo horário
        constraints = [
            models.UniqueConstraint(fields=['doctor', 'scheduled_at'], name='unique_doctor_slot')
        ]

class PatientPhotos(models.Model):
    patient = models.ForeignKey(PATIENT_MODEL, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='evolution_gallery/%Y/%m/%d/')
    taken_at = models.DateField(auto_now_add=True)
    is_public = models.BooleanField(default=False)
    class Meta:
        verbose_name = 'Foto de Evolução'

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(DOCTOR_MODEL, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.IntegerField(choices=[
        (0, 'Segunda'),
        (1, 'Terça'),
        (2, 'Quarta'),
        (3, 'Quinta'),
        (4, 'Sexta'),
        (5, 'Sábado'),
        (6, 'Domingo')
    ])
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Disponibilidade Médica'
        verbose_name_plural = 'Disponibilidades Médicas'
        ordering = ['day_of_week', 'start_time']