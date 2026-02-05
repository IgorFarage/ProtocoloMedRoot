
from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.accounts.services import AssignmentService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Atribui equipe médica (Tricologista/Nutricionista) para usuários antigos que não possuem.'

    def handle(self, *args, **options):
        self.stdout.write("🏥 Iniciando Backfill de Equipes Médicas...")
        
        # Filtra pacientes ativos (com role='patient')
        # Idealmente, poderíamos filtrar só quem tem plano ativo, mas a atribuição mal não faz.
        patients = User.objects.filter(role='patient')
        
        count = 0
        updated = 0
        
        total = patients.count()
        
        for user in patients:
            count += 1
            try:
                # O AssignmentService é inteligente: 
                # Ele verifica se JÁ tem médico atribuído antes de atribuir novo.
                # Então é seguro rodar em todos.
                
                profile = AssignmentService.assign_medical_team(user)
                if profile:
                    updated += 1
                    self.stdout.write(f"[{count}/{total}] ✅ {user.email} processado.")
                else:
                    self.stdout.write(f"[{count}/{total}] ⚠️ {user.email} falhou na atribuição.")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"[{count}/{total}] ❌ Erro em {user.email}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"🏁 Backfill Concluído! {updated}/{total} pacientes verificados/atualizados."))
