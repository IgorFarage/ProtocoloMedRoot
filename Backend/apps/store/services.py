from datetime import date, timedelta
from django.db import transaction
from .models import Subscriptions, Orders
from apps.financial.models import Transaction

class SubscriptionService:
    @staticmethod
    @transaction.atomic
    def activate_subscription_from_transaction(transaction_obj: Transaction) -> bool:
        """
        Ativa ou Renova uma assinatura com base em uma transação APROVADA.
        """
        if transaction_obj.status != Transaction.Status.APPROVED:
            return False

        user = transaction_obj.user
        plan_type = transaction_obj.plan_type # 'standard', 'plus'
        
        # Mapping cycles to months
        months_add = 1
        if transaction_obj.cycle == Transaction.Cycle.QUARTERLY:
            months_add = 3

        # 1. Find existing subscription or create new
        # Relation User -> Patients is OneToOne. Default related_name is 'patients'
        try:
            patient_profile = user.patients
        except:
             # Fallback or error if not patient
             return False

        sub = Subscriptions.objects.filter(patient=patient_profile).first()
        
        if not sub:
            # Create new
            sub = Subscriptions.objects.create(
                patient=patient_profile,
                next_billing_date=date.today() + timedelta(days=30*months_add), # Approx
                status='active',
                frequency_months=months_add
            )
        else:
            # Renew/Update
            sub.status = 'active'
            # If expired, restart count from today. If compatible, extend. 
            # Simplified logic: Always push forward from today for now
            sub.next_billing_date = date.today() + timedelta(days=30*months_add)
            sub.frequency_months = months_add
            sub.save()

        # [FIX] Atualiza o plano no perfil do usuário para refletir no Dashboard
        if plan_type:
            user.current_plan = plan_type
            user.save()

        # 2. Link Transaction to Subscription (via Order if needed, or direct)
        # Note: In the current model, Orders link to Subscriptions.
        # Ideally we should create an Order record here too for history.
        
        return True
