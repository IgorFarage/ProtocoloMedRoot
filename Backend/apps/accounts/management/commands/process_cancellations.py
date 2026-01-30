from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Processa cancelamentos agendados (Grace Period) que venceram.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        logger.info(f"💀 [Reaper] Iniciando processamento de cancelamentos em {now}...")
        
        expired_users = User.objects.filter(
            subscription_status=User.SubscriptionStatus.GRACE_PERIOD,
            scheduled_cancellation_date__lte=now
        )
        
        count = 0
        for user in expired_users:
            try:
                logger.info(f"⚰️ Revogando acesso de {user.email} (Venceu em {user.scheduled_cancellation_date})")
                user.subscription_status = User.SubscriptionStatus.CANCELED
                user.current_plan = User.PlanType.NONE
                user.save()
                count += 1
            except Exception as e:
                logger.error(f"❌ Erro ao processar user {user.email}: {e}")
        
        self.stdout.write(self.style.SUCCESS(f'Processamento concluído. {count} usuários inativados.'))
