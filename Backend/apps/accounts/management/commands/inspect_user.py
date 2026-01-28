import json
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Prefetch

from apps.accounts.models import User, Doctors, Patients, UserQuestionnaire
from apps.financial.models import Transaction, Transaction
from apps.medical.models import Appointments, PatientPhotos, AnamnesisSessions, AnamnesisAnswers
from apps.store.models import Orders, Subscriptions, Prescriptions

class Command(BaseCommand):
    help = 'Inspeciona todos os dados de um usuário (Relações com tabelas Apps)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email do usuário')
        parser.add_argument('--id', type=str, help='ID (UUID) do usuário')

    def handle(self, *args, **options):
        email = options.get('email')
        user_id = options.get('id')

        if not email and not user_id:
            self.stdout.write(self.style.ERROR('Forneça --email ou --id'))
            return

        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Usuário não encontrado.'))
            return

        # Coletar dados
        data = {
            "BASICO": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "phone": user.phone,
                "role": user.role,
                "current_plan": user.current_plan,
                "id_bitrix": user.id_bitrix,
                "customer_id_mp": user.customer_id_mp,
                "date_joined": user.created_at,
                "is_active": user.is_active,
            },
            "PERFIL": {},
            "FINANCEIRO": {
                "transactions": [],
            },
            "MEDICO": {
                "anamnese": [],
                "consultas_paciente": [],
                "consultas_medico": [],
                "fotos": []
            },
            "LOJA": {
                "pedidos": [],
                "assinaturas_loja": []
            }
        }

        # 1. Perfil Específico
        if hasattr(user, 'patients'):
            p = user.patients
            data["PERFIL"]["paciente"] = {
                "gender": p.gender,
                "assigned_doctor_id": str(p.assigned_doctor.user.id) if p.assigned_doctor else None
            }
        
        if hasattr(user, 'doctors'):
            d = user.doctors
            data["PERFIL"]["medico"] = {
                "crm": d.crm,
                "specialty": d.specialty
            }

        # 1.1 Questionários Iniciais
        questionnaires = UserQuestionnaire.objects.filter(user=user).order_by('-created_at')
        data["BASICO"]["questionarios_iniciais"] = []
        for q in questionnaires:
            data["BASICO"]["questionarios_iniciais"].append({
                "id": q.id,
                "created_at": q.created_at,
                "answers": q.answers,
                "is_latest": q.is_latest
            })

        # 2. Financeiro (Transactions)
        transactions = Transaction.objects.filter(user=user).order_by('-created_at')
        for t in transactions:
            data["FINANCEIRO"]["transactions"].append({
                "id": str(t.id),
                "amount": float(t.amount),
                "status": t.status,
                "plan_type": t.plan_type,
                "created_at": t.created_at,
                "payment_type": t.payment_type,
                "subscription_id_mp": t.subscription_id,
                "asaas_payment_id": t.asaas_payment_id, # [ASAAS ADAPTATION]
                "asaas_subscription_id": t.asaas_subscription_id, # [ASAAS ADAPTATION]
                "metadata_snapshot": t.mp_metadata # Crucial para ver os produtos
            })

        # 3. Médico
        # Anamnese
        sessions = AnamnesisSessions.objects.filter(user=user).order_by('-created_at')
        for s in sessions:
            answers = AnamnesisAnswers.objects.filter(session=s)
            data["MEDICO"]["anamnese"].append({
                "session_id": s.id,
                "date": s.created_at,
                "status": s.status,
                "ai_score_data": s.ai_score_data,
                "respostas_count": answers.count()
            })
        
        # Consultas (Paciente)
        app_pat = Appointments.objects.filter(patient=user).order_by('-scheduled_at')
        for ap in app_pat:
            data["MEDICO"]["consultas_paciente"].append({
                "id": ap.id,
                "doctor": ap.doctor.email if ap.doctor else None,
                "date": ap.scheduled_at,
                "status": ap.status
            })

        # Consultas (Médico)
        app_doc = Appointments.objects.filter(doctor=user).order_by('-scheduled_at')
        for ap in app_doc:
            data["MEDICO"]["consultas_medico"].append({
                "id": ap.id,
                "patient": ap.patient.email if ap.patient else None,
                "date": ap.scheduled_at,
                "status": ap.status
            })

        # Fotos
        if hasattr(user, 'patients'):
            photos = PatientPhotos.objects.filter(patient=user.patients)
            for ph in photos:
                data["MEDICO"]["fotos"].append({
                    "url": str(ph.photo),
                    "date": ph.taken_at
                })

        # 4. Loja
        # Orders
        orders = Orders.objects.filter(user=user).order_by('-created_at')
        for o in orders:
            data["LOJA"]["pedidos"].append({
                "id": o.id,
                "total": float(o.total_amount),
                "status": o.status,
                "date": o.created_at
            })
            
        # Assinaturas (Store)
        if hasattr(user, 'patients'):
            subs = Subscriptions.objects.filter(patient=user.patients)
            for sb in subs:
                 data["LOJA"]["assinaturas_loja"].append({
                     "id": sb.id,
                     "next_billing": sb.next_billing_date,
                     "status": sb.status
                 })

        self.stdout.write(json.dumps(data, indent=4, cls=DjangoJSONEncoder))
