from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User, Doctors

class Command(BaseCommand):
    help = 'Cria um usuário Médico para testes'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True)
        parser.add_argument('--password', type=str, required=True)
        parser.add_argument('--name', type=str, default='Dr. Teste')
        parser.add_argument('--crm', type=str, default='12345/SP')
        parser.add_argument('--specialty', type=str, default='Tricologia')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        name = options['name']
        crm = options['crm']
        specialty = options['specialty']

        try:
            with transaction.atomic():
                # 1. Criar Usuário (ou pegar se existir)
                user, created = User.objects.get_or_create(email=email)
                user.set_password(password)
                user.full_name = name
                user.role = 'doctor'
                user.save()

                if created:
                    self.stdout.write(self.style.SUCCESS(f'Usuário {email} criado.'))
                else:
                    self.stdout.write(self.style.WARNING(f'Usuário {email} já existia. Senha atualizada.'))

                # 2. Criar Perfil Médico
                doctor, doc_created = Doctors.objects.get_or_create(
                    user=user,
                    defaults={'crm': crm, 'specialty': specialty}
                )

                if doc_created:
                    self.stdout.write(self.style.SUCCESS(f'Perfil médico criado (CRM: {crm}).'))
                else:
                    doctor.crm = crm
                    doctor.specialty = specialty
                    doctor.save()
                    self.stdout.write(self.style.WARNING('Perfil médico atualizado.'))

                self.stdout.write(self.style.SUCCESS('✅ Médico configurado com sucesso!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao criar médico: {str(e)}'))
