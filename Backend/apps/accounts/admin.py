from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserQuestionnaire, Doctors, Patients

class CustomUserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'role', 'is_active')
    search_fields = ('email', 'full_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password', 'role')}),
        ('Informações', {'fields': ('full_name', 'id_bitrix', 'recommended_medications')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(UserQuestionnaire)
class UserQuestionnaireAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'is_latest')

admin.site.register(Doctors)
admin.site.register(Patients)