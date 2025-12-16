# apps/medical/admin.py

from django.contrib import admin
from .models import (
    AnamnesisQuestions, AnamnesisSessions, AnamnesisAnswers, Appointments, PatientPhotos
)

@admin.register(AnamnesisQuestions)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'step_order', 'section', 'input_type', 'is_active')
    list_filter = ('section', 'is_active')
    search_fields = ('question_text',)

@admin.register(AnamnesisSessions)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'status')
    list_filter = ('status',)
    search_fields = ('user__email',)

@admin.register(Appointments)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient_profile', 'doctor_profile', 'scheduled_at', 'status')
    list_filter = ('status', 'scheduled_at')

@admin.register(PatientPhotos)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('patient', 'taken_at', 'is_public')

admin.site.register(AnamnesisAnswers)