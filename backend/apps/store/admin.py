# apps/store/admin.py

from django.contrib import admin
from .models import (
    Products, ProductTypes, PharmacyPartners, Orders, OrderItems, 
    Subscriptions, ProductionBatches, SystemSettings, AuditLogs
)

@admin.register(Products)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'product_type', 'price', 'is_active')
    list_filter = ('product_type', 'is_active')
    search_fields = ('name', 'composition_guide')

@admin.register(Orders)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'id')

@admin.register(OrderItems)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'quantity')
    list_filter = ('product',)

@admin.register(PharmacyPartners)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'cnpj', 'is_active')
    search_fields = ('cnpj', 'name')

@admin.register(SystemSettings)
class SettingAdmin(admin.ModelAdmin):
    list_display = ('key_name', 'value_content', 'last_updated_by')
    search_fields = ('key_name',)

# Registre as demais tabelas
admin.site.register(ProductTypes)
admin.site.register(Subscriptions)
admin.site.register(ProductionBatches)
admin.site.register(AuditLogs)