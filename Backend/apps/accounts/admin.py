from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserQuestionnaire, Doctors, Patients
from .forms import CustomUserCreationForm, CustomUserChangeForm

class CustomUserAdmin(BaseUserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User
    list_display = ('email', 'full_name', 'phone', 'role', 'is_active')
    search_fields = ('email', 'full_name', 'phone')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password', 'role')}),
        ('Informações', {'fields': ('full_name', 'phone', 'id_bitrix', 'recommended_medications')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'full_name', 'phone')}
        ),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(UserQuestionnaire)
class UserQuestionnaireAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'is_latest')

admin.site.register(Doctors)
admin.site.register(Patients)

from .models import DoctorInvite
from .services import DoctorInviteService

@admin.register(DoctorInvite)
class DoctorInviteAdmin(admin.ModelAdmin):
    list_display = ('code', 'is_used', 'used_by', 'created_at', 'get_status_display')
    readonly_fields = ('used_by', 'used_at', 'created_at', 'created_by')
    search_fields = ('code',)
    list_filter = ('is_used', 'created_at')

    def save_model(self, request, obj, form, change):
        if not obj.pk: # Criação
            obj.created_by = request.user
            if not obj.code:
                obj.code = DoctorInviteService.generate_code()
        super().save_model(request, obj, form, change)

    def get_status_display(self, obj):
        return  "🔴 Usado" if obj.is_used else "🟢 Disponível"
    get_status_display.short_description = "Status"