from django.db import models
from django.conf import settings
import uuid

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

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    
    # Agora guardamos apenas a string do plano (ex: 'standard')
    plan_type = models.CharField(max_length=20, choices=PlanType.choices)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cycle = models.CharField(max_length=20, choices=Cycle.choices, default=Cycle.MONTHLY)
    
    # Integração
    mercado_pago_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    external_reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} - {self.plan_type} - {self.status}"