from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.medical.models import Appointments
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fecha todas as consultas Abandonadas (Agendadas cujo horário marado passou de 3 horas) alterando o status para Realizado.'

    def handle(self, *args, **options):
        now = timezone.now()
        the_limit = now - timedelta(hours=3)
        
        self.stdout.write(self.style.SUCCESS(f'Iniciando varredura por consultas abandonadas (Horário limite: {the_limit.strftime("%d/%m/%Y %H:%M:%S")})...'))

        # Procura por consultas que ainda tão 'scheduled' e que o horário marcado ('scheduled_at') já tem mais de 3 horas.
        abandoned_appointments = Appointments.objects.filter(
            status='scheduled',
            scheduled_at__lte=the_limit
        )

        count = abandoned_appointments.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('Nenhuma consulta abandonada encontrada.'))
            return

        for appt in abandoned_appointments:
            appt.status = 'completed'
            appt.consultation_end = now # Simula que a consulta terminou agora, no momento do auto-fix.
            appt.save(update_fields=['status', 'consultation_end'])
            self.stdout.write(self.style.WARNING(f'Consulta {appt.id} de {appt.patient.full_name if appt.patient else "Desconhecido"} alterada de "scheduled" para "completed".'))

        self.stdout.write(self.style.SUCCESS(f'\nConcluído! {count} consultas abandonadas foram fechadas no banco de dados.'))
