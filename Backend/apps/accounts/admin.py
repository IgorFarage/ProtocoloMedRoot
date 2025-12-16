# apps/accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Doctors, Patients, Addresses, FederativeUnits, Cities, UserContacts
)

# 1. Customização do Usuário (Para exibir nossos campos)
class CustomUserAdmin(BaseUserAdmin):
    # Campos que serão exibidos na lista de usuários
    list_display = ('email', 'full_name', 'role', 'is_active', 'is_staff')
    
    # Adiciona campos de busca
    search_fields = ('email', 'full_name', 'cpf')
    ordering = ('email',)

    # Define os campos que aparecem na tela de edição
    fieldsets = (
        (None, {'fields': ('email', 'password', 'role')}),
        ('Informações Pessoais', {'fields': ('full_name', 'cpf', 'phone')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    # Adiciona filtros laterais
    list_filter = ('role', 'is_staff', 'is_active')
    
    # Remove o campo 'username' que não usamos como principal
    filter_horizontal = ('groups', 'user_permissions')

admin.site.register(User, CustomUserAdmin)


# 2. Registro dos outros modelos de perfil e localização
@admin.register(Doctors)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('user', 'crm', 'specialty')
    search_fields = ('crm', 'user__full_name')

@admin.register(Patients)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('user', 'gender', 'assigned_doctor')
    list_filter = ('gender', 'assigned_doctor')
    search_fields = ('user__full_name',)

@admin.register(Addresses)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'cep', 'city', 'logradouro')
    search_fields = ('cep', 'user__full_name')

@admin.register(FederativeUnits)
class UFAdmin(admin.ModelAdmin):
    list_display = ('name', 'acronym')

@admin.register(Cities)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'state')
    list_filter = ('state',)

@admin.register(UserContacts)
class UserContactAdmin(admin.ModelAdmin):
    list_display = ('user', 'contact_type', 'contact_value', 'is_main')