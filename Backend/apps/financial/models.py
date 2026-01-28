from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Porcentagem (%)'
        FIXED = 'fixed', 'Valor Fixo (R$)'

    code = models.CharField(max_length=50, unique=True, help_text="Código do cupom (ex: VERAO2026)")
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.FIXED)
    value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Valor do desconto (em R$ ou %)")
    
    active = models.BooleanField(default=True, verbose_name="Ativo?")
    valid_from = models.DateTimeField(default=timezone.now, verbose_name="Válido a partir de")
    valid_to = models.DateTimeField(null=True, blank=True, verbose_name="Válido até")
    
    max_uses = models.PositiveIntegerField(null=True, blank=True, help_text="Limite global (vazio = ilimitado)")
    max_uses_per_user = models.PositiveIntegerField(default=1, help_text="Limite por usuário (CPF)")
    min_purchase_value = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Valor mínimo")
    
    current_uses = models.PositiveIntegerField(default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} ({self.value} {self.discount_type})"

    def is_valid_for_user(self, user):
        now = timezone.now()
        if not self.active: return False, "Cupom inativo."
        if self.valid_to and now > self.valid_to: return False, "Cupom expirado."
        if self.valid_from and now < self.valid_from: return False, "Cupom ainda não vigente."
        if self.max_uses is not None and self.current_uses >= self.max_uses: return False, "Cupom esgotado."
        return True, "Válido"

class Transaction(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendente'
        APPROVED = 'approved', 'Aprovado'
        REJECTED = 'rejected', 'Rejeitado'
        CANCELLED = 'cancelled', 'Cancelado'
        REFUNDED = 'refunded', 'Estornado'

    class PlanType(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        PLUS = 'plus', 'Plus'

    class Cycle(models.TextChoices):
        MONTHLY = 'monthly', 'Mensal'
        QUARTERLY = 'quarterly', 'Trimestral'
        ONE_OFF = 'one_off', 'Pagamento Único'

    class PaymentType(models.TextChoices):
        CREDIT_CARD = 'credit_card', 'Cartão de Crédito'
        DEBIT_CARD = 'debit_card', 'Cartão de Débito' # Adicionado
        TICKET = 'ticket', 'Boleto'
        PIX = 'bank_transfer', 'Pix'
        STARTUP_CREDIT = 'wallet_purchase', 'Crédito MP'
        UNKNOWN = 'unknown', 'Desconhecido'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    
    # Agora guardamos apenas a string do plano (ex: 'standard')
    plan_type = models.CharField(max_length=20, choices=PlanType.choices)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Valor Original (Sugerido)")
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Valor Efetivamente Pago")
    cycle = models.CharField(max_length=20, choices=Cycle.choices, default=Cycle.MONTHLY)
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices, default=PaymentType.UNKNOWN)

    # Cupom e Desconto
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Valor economizado")

    # Integração
    mercado_pago_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    subscription_id = models.CharField(max_length=100, null=True, blank=True, help_text="ID da Assinatura (Preapproval) no MP")
    asaas_payment_id = models.CharField(max_length=100, unique=True, null=True, blank=True, help_text="ID do Pagamento no Asaas")
    asaas_subscription_id = models.CharField(max_length=100, null=True, blank=True, help_text="ID da Assinatura no Asaas")
    external_reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Bitrix Sync & Audit
    bitrix_deal_id = models.CharField(max_length=100, null=True, blank=True)
    bitrix_sync_status = models.CharField(
        max_length=20, 
        choices=[('pending', 'Pendente'), ('synced', 'Sincronizado'), ('failed', 'Falhou')],
        default='pending'
    )
    bitrix_sync_attempts = models.IntegerField(default=0)
    last_sync_attempt = models.DateTimeField(null=True, blank=True)
    mp_metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} - {self.plan_type} - {self.status}"