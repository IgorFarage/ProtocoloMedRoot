from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    # Atualizamos 'plan' para 'plan_type', pois foi assim que definimos no model novo
    list_display = ('id', 'user', 'plan_type', 'amount', 'status', 'created_at')
    list_filter = ('status', 'plan_type', 'cycle')
    search_fields = ('user__email', 'external_reference', 'mercado_pago_id')
    readonly_fields = ('id', 'created_at', 'updated_at', 'external_reference')