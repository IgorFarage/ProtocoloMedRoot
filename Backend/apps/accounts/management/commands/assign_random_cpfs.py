from django.core.management.base import BaseCommand
from apps.accounts.models import User
import random

def generate_fake_cpf():
    """Gera um CPF numérico aleatório válido estruturalmente (fake) no formato 000.000.000-00."""
    cpf = [random.randint(0, 9) for x in range(9)]
    
    # Validador 1
    val1 = sum([x * y for x, y in zip(cpf, range(10, 1, -1))]) % 11
    cpf.append(0 if val1 < 2 else 11 - val1)
    
    # Validador 2
    val2 = sum([x * y for x, y in zip(cpf, range(11, 1, -1))]) % 11
    cpf.append(0 if val2 < 2 else 11 - val2)
    
    return f"{cpf[0]}{cpf[1]}{cpf[2]}.{cpf[3]}{cpf[4]}{cpf[5]}.{cpf[6]}{cpf[7]}{cpf[8]}-{cpf[9]}{cpf[10]}"

class Command(BaseCommand):
    help = 'Injeta CPFs fakes válidos nos usuários de teste antigos que possuem CPF nulo'

    def handle(self, *args, **kwargs):
        users_without_cpf = User.objects.filter(cpf__isnull=True)
        count = users_without_cpf.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Nenhum usuário precisa de CPF fake. Todos já possuem CPF."))
            return

        self.stdout.write(self.style.WARNING(f"Atenção: Encontrados {count} usuários sem CPF no banco de dados."))
        
        updated = 0
        for user in users_without_cpf:
            fake_cpf = generate_fake_cpf()
            
            # Garantir unicidade até achar um livre
            while User.objects.filter(cpf=fake_cpf).exists():
                fake_cpf = generate_fake_cpf()
                
            user.cpf = fake_cpf
            user.save(update_fields=['cpf'])
            updated += 1
            self.stdout.write(f"Usuário {user.email} -> CPF designado: {fake_cpf}")
            
        self.stdout.write(self.style.SUCCESS(f"Sucesso! {updated} usuários de teste foram atualizados com CPFs fakes."))
