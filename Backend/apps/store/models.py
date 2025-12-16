# apps/store/models.py

from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField # Para ArrayFields

# Referências
USER_MODEL = settings.AUTH_USER_MODEL
DOCTOR_MODEL = 'accounts.Doctors'

# =============================================================================
# 1. CATÁLOGO
# =============================================================================

class ProductTypes(models.Model):
    name = models.CharField(max_length=50)
    class Meta:
        verbose_name = 'Tipo de Produto'

class Products(models.Model):
    name = models.CharField(max_length=100)
    product_type = models.ForeignKey(ProductTypes, on_delete=models.PROTECT)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    composition_guide = models.TextField(null=True, blank=True) 
    # Usando ArrayField para tags (conforme decisão de não normalizar para simplificar)
    tags = models.CharField(max_length=255, null=True, blank=True) # Django não suporta ArrayField nativamente, usar CharField temporariamente se a biblioteca não estiver instalada.
    is_active = models.BooleanField(default=True)
    class Meta:
        verbose_name = 'Produto/Fórmula'

class PharmacyPartners(models.Model):
    name = models.CharField(max_length=100)
    cnpj = models.CharField(unique=True, max_length=20)
    email_orders = models.EmailField(max_length=150)
    api_endpoint = models.URLField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        verbose_name = 'Farmácia Parceira'

# =============================================================================
# 2. VENDAS E LOGÍSTICA
# =============================================================================

class Subscriptions(models.Model):
    patient = models.ForeignKey('accounts.Patients', on_delete=models.CASCADE)
    start_date = models.DateField(auto_now_add=True)
    next_billing_date = models.DateField()
    status = models.CharField(max_length=20, default='active')
    frequency_months = models.IntegerField(default=1)
    class Meta:
        verbose_name = 'Assinatura'

class Orders(models.Model):
    user = models.ForeignKey(USER_MODEL, on_delete=models.PROTECT)
    subscription = models.ForeignKey(Subscriptions, on_delete=models.SET_NULL, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=30, default='pending_payment')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        verbose_name = 'Pedido'

class OrderItems(models.Model):
    order = models.ForeignKey(Orders, on_delete=models.CASCADE)
    product = models.ForeignKey(Products, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1)
    price_at_moment = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta:
        verbose_name = 'Item do Pedido'

class ProductionBatches(models.Model):
    order_item = models.OneToOneField(OrderItems, on_delete=models.CASCADE)
    pharmacy = models.ForeignKey(PharmacyPartners, on_delete=models.PROTECT)
    external_batch_code = models.CharField(max_length=50)
    manufactured_at = models.DateField()
    expiration_date = models.DateField()
    received_at_hub = models.DateTimeField(auto_now_add=True)
    received_by_user = models.ForeignKey(USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    class Meta:
        verbose_name = 'Lote de Produção'

class Prescriptions(models.Model):
    order = models.OneToOneField(Orders, on_delete=models.CASCADE)
    doctor = models.ForeignKey(DOCTOR_MODEL, on_delete=models.PROTECT)
    signed_pdf_url = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        verbose_name = 'Receita Médica'


# =============================================================================
# 3. AUDITORIA E CONFIGURAÇÃO
# =============================================================================

class AuditLogs(models.Model):
    actor_user = models.ForeignKey(USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=50)
    target_table = models.CharField(max_length=50)
    target_id = models.IntegerField(null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        verbose_name = 'Log de Auditoria'

class SystemSettings(models.Model):
    key_name = models.CharField(max_length=50, primary_key=True)
    value_content = models.TextField()
    description = models.TextField(null=True, blank=True)
    last_updated_by = models.ForeignKey(USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = 'Configuração do Sistema'