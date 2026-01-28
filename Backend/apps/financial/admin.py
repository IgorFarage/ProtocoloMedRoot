from django.contrib import admin
from .models import Transaction, Coupon

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'value', 'active', 'current_uses', 'valid_to')
    list_filter = ('active', 'discount_type', 'valid_from', 'valid_to')
    search_fields = ('code',)
    readonly_fields = ('current_uses', 'created_at')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    # Atualizamos 'plan' para 'plan_type', pois foi assim que definimos no model novo
    list_display = ('id', 'user', 'plan_type', 'amount', 'status', 'created_at', 'coupon')
    list_filter = ('status', 'plan_type', 'cycle')
    search_fields = ('user__email', 'external_reference', 'mercado_pago_id')
    readonly_fields = ('id', 'created_at', 'updated_at', 'external_reference')