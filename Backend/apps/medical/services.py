from datetime import datetime, timedelta, date, time
from typing import List, Dict, Any, Optional
from django.db import transaction
from django.conf import settings
import uuid
from .models import Appointments, PatientPhotos
from apps.accounts.models import User

class MedicalScheduleService:
    
    SLOT_DURATION_MINUTES = 30
    START_HOUR = 9  # 09:00
    END_HOUR = 17   # 17:00 (Last slot starts at 17:00? Or ends at 17:00? Let's say ends at 18:00)
    WORK_DAYS = [0, 1, 2, 3, 4] # Seg a Sex

    @staticmethod
    def get_system_doctor() -> Optional[User]:
        """
        Retorna um médico padrão do sistema para agendamentos.
        Idealmente buscaria um Doctor disponível, mas no MVP pegamos o primeiro role='doctor'.
        """
        return User.objects.filter(role='doctor').first()

    @staticmethod
    def get_available_slots(target_date: date, doctor_user: User = None) -> List[str]:
        """
        Gera slots de horário para o dia, baseados na disponibilidade do médico.
        """
        from .models import DoctorAvailability
        from apps.accounts.models import Doctors

        if target_date < date.today():
             return []

        # 1. Determinar Médico
        if not doctor_user:
            # Fallback para MVP: Médico do Sistema
            doctor_user = MedicalScheduleService.get_system_doctor()
        
        if not doctor_user:
            return []

        # 2. Buscar Regras de Disponibilidade
        try:
            doctor_profile = Doctors.objects.get(user=doctor_user)
            weekday = target_date.weekday() # 0=Seg, 6=Dom
            
            rules = DoctorAvailability.objects.filter(
                doctor=doctor_profile, 
                day_of_week=weekday, 
                is_active=True
            ).order_by('start_time')
            
            if not rules.exists():
                # Se não tem regra, assumimos fechado? Ou mantemos o default MVP (Seg-Sex 9-17) se não houver NENHUMA regra cadastrada para o médico?
                # Para evitar quebra imediata, vamos manter o fallback se não houver NENHUMA regra para esse médico.
                if DoctorAvailability.objects.filter(doctor=doctor_profile).exists():
                    # Médico tem regras, mas não para hoje -> Fechado hoje.
                    return []
                else:
                    # Médico não configurou nada -> Fallback MVP (Seg-Sex 09:00-17:00)
                    if weekday not in MedicalScheduleService.WORK_DAYS:
                        return []
                    rules = [
                        {'start': time(9,0), 'end': time(17,0)} # Fake object
                    ]
        except Exception:
            # Fallback erro
            return []

        # 3. Gerar slots baseados nas regras
        possible_slots = []
        
        for rule in rules:
            # Handle both Django Model object and Dict (fallback)
            start = rule.start_time if hasattr(rule, 'start_time') else rule['start']
            end = rule.end_time if hasattr(rule, 'end_time') else rule['end']
            
            current_time = start
            # Loop até encaixar o último slot de 1h
            # Se end=17:00, ultimo slot começa as 16:00
            
            while True:
                # Calc end of this slot
                slot_end_dt = datetime.combine(date.today(), current_time) + timedelta(minutes=MedicalScheduleService.SLOT_DURATION_MINUTES)
                if slot_end_dt.time() > end and slot_end_dt.time() != time(0,0): # time(0,0) handle overflow if needed
                     break
                
                possible_slots.append(current_time)
                current_time = slot_end_dt.time()
                
                if current_time >= end and current_time != time(0,0):
                    break

        # 4. Buscar agendamentos existentes (Bloqueados)
        busy_times = Appointments.objects.filter(
            doctor=doctor_user,
            scheduled_at__date=target_date,
            status='scheduled'
        ).values_list('scheduled_at__time', flat=True)

        # 5. Filtrar
        available = []
        from django.utils import timezone
        now = timezone.localtime()
        
        for slot in possible_slots:
            if target_date == date.today():
                if slot <= now.time():
                    continue
            
            if slot not in busy_times:
                available.append(slot.strftime("%H:%M"))

        return available

    @staticmethod
    def book_appointment(user: User, date_str: str, time_str: str, doctor_id: str = None) -> Dict[str, Any]:
        """
        Tenta agendar uma consulta.
        """
        try:
            # 1. Parsing and making Timezone Aware
            from django.utils import timezone
            
            naive_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            target_dt = timezone.make_aware(naive_dt)

            # 2. Validar Médico
            # Se doctor_id for passado, usamos. Se não, fallback.
            doctor = None
            if doctor_id:
                try:
                    # doctor_id pode ser ID do User ou do Profile?
                    # O Frontend geralmente tem o ID do Profile ou User.
                    # Vamos assumir User ID (UUID)
                    doctor = User.objects.get(id=doctor_id, role='doctor')
                except:
                    pass
            
            if not doctor:
                doctor = MedicalScheduleService.get_system_doctor()
            
            if not doctor:
                return {"error": "Nenhum médico disponível."}

            # 2.5 Validation: One appointment per month per doctor
            existing_appt = Appointments.objects.filter(
                patient=user,
                doctor=doctor,
                scheduled_at__year=target_dt.year,
                scheduled_at__month=target_dt.month
            ).exclude(status='cancelled').first()

            if existing_appt:
                 # Return specialized error payload
                 return {
                     "error": "MONTHLY_LIMIT", 
                     "message": "Limite mensal atingido.",
                     "existing_id": existing_appt.id,
                     "existing_date": existing_appt.scheduled_at
                 }

            # 3. Check Double Booking (Concurrency Safety)
            with transaction.atomic():
                if Appointments.objects.filter(doctor=doctor, scheduled_at=target_dt, status='scheduled').exists():
                    return {"error": "Horário indisponível. Alguém agendou antes de você."}
                
                # 4. Criar
                # [STANDARD PLAN LOGIC] Check if payment is required
                is_standard = (user.current_plan == 'standard')
                status_initial = 'waiting_payment' if is_standard else 'scheduled'
                price = 0.0
                pix_data = None
                payment_id = None
                
                if is_standard:
                    # Fetch Price from Bitrix
                    from apps.accounts.config import BitrixConfig
                    from apps.accounts.services import BitrixService
                    
                    # Determine Product ID
                    product_id = BitrixConfig.APPOINTMENT_PRODUCT_IDS.get('tricologia', 296) # Default
                    if hasattr(doctor, 'doctor_profile') and doctor.doctor_profile.specialty_type == 'nutritionist':
                        product_id = BitrixConfig.APPOINTMENT_PRODUCT_IDS.get('nutricao', 298)
                        
                    price = BitrixService.get_product_price(product_id)
                    if price <= 0: price = 150.00 # Safety Fallback
                    
                    # Create Asaas Transaction
                    from apps.financial.services import AsaasService
                    asaas = AsaasService()
                    
                    # Ensure customer
                    customer_id = user.asaas_customer_id
                    if not customer_id:
                        customer_id = asaas.get_or_create_customer({
                            "name": user.full_name, "email": user.email, "cpf": "", "phone": ""
                        })
                        if customer_id:
                            user.asaas_customer_id = customer_id
                            user.save()
                    
                    if customer_id:
                        payment_res = asaas.create_payment(
                            customer_id=customer_id,
                            billing_type="PIX",
                            value=price,
                            description=f"Consulta Avulsa - {user.full_name}"
                        )
                        
                        if payment_res and 'id' in payment_res:
                            pix_data = {
                                "qr_code": payment_res.get('payload'),
                                "qr_code_base64": payment_res.get('encodedImage'),
                                "ticket_url": payment_res.get('invoiceUrl')
                            }
                            payment_id = payment_res['id']
                
                appt = Appointments.objects.create(
                    patient=user,
                    doctor=doctor,
                    scheduled_at=target_dt,
                    status=status_initial
                    # meeting_link poderia ser gerado aqui
                )
                
                # Save Transaction Record if Standard
                if is_standard and payment_id:
                    from apps.financial.models import Transaction
                    Transaction.objects.create(
                        user=user,
                        plan_type='standard', # Context
                        amount=price,
                        cycle='one_off',
                        external_reference=str(uuid.uuid4()),
                        status='pending',
                        payment_type='bank_transfer', # Pix
                        asaas_payment_id=payment_id,
                        # Save Appt ID in metadata to link in Webhook
                        mp_metadata={"appointment_id": appt.id}
                    )
                
                # [BITRIX INTEGRATION] Sync Appointment to CRM Pipeline 12 (Normalized 1:N)
                try:
                    # Determine specialty based on doctor's profile/specialty_type
                    specialty = 'consulta' # Default
                    if hasattr(doctor, 'doctor_profile'):
                        specialty = (doctor.doctor_profile.specialty_type or 'consulta')
                    
                    from apps.accounts.services import BitrixService
                    # Creates a NEW Deal for every appointment to maintain history
                    BitrixService.create_appointment_deal(user, appt, specialty)
                except Exception as e:
                    # Log but don't fail the booking
                    print(f"⚠️ Bitrix Sync Error: {e}") 

                if is_standard and pix_data:
                    return {
                        "payment_required": True,
                        "price": price,
                        "pix_data": pix_data,
                        "message": "Aguardando pagamento para confirmar."
                    }

                return {"success": True, "id": appt.id, "message": "Agendamento realizado com sucesso."}
        
        except ValueError:
            return {"error": "Formato de data/hora inválido."}
        except Exception as e:
            return {"error": f"Erro interno: {str(e)}"}

    @staticmethod
    def reschedule_appointment(user: User, appointment_id: int, new_date_str: str, new_time_str: str) -> Dict[str, Any]:
        """
        Reagenda uma consulta existente para um novo horário.
        """
        try:
            from django.utils import timezone
            
            # 1. Buscar Appointment
            try:
                appt = Appointments.objects.get(id=appointment_id, patient=user)
            except Appointments.DoesNotExist:
                return {"error": "Agendamento não encontrado."}

            if appt.status != 'scheduled':
                return {"error": "Apenas agendamentos ativos podem ser reagendados."}

            # 2. Parse New Date
            naive_dt = datetime.strptime(f"{new_date_str} {new_time_str}", "%Y-%m-%d %H:%M")
            target_dt = timezone.make_aware(naive_dt)

            # 3. Validar Disponibilidade do Médico
            if Appointments.objects.filter(doctor=appt.doctor, scheduled_at=target_dt, status='scheduled').exists():
                return {"error": "O novo horário escolhido já está ocupado."}

            # 4. Atualizar (Atomic)
            with transaction.atomic():
                appt.scheduled_at = target_dt
                appt.save()
                
            return {"success": True, "message": "Agendamento reagendado com sucesso."}

        except ValueError:
            return {"error": "Formato de data/hora inválido."}
        except Exception as e:
            return {"error": f"Erro interno: {str(e)}"}

class AppMedicalService:
    @staticmethod
    def create_evolution_entry(patient_user: User, image_file, is_public: bool = False) -> PatientPhotos:
        """
        Salva uma foto de evolução para o paciente.
        """
        # Validar se o usuário é paciente ou tem perfil de paciente associado
        # O model PatientPhotos espera uma instância de 'accounts.Patients'
        # Assumindo que o User tem relação one-to-one com Patients (user.patients)
        
        patient_profile = getattr(patient_user, 'patients', None)
        if not patient_profile:
            # Lazy creation: se não existe, cria agora (recuperação automática)
            from apps.accounts.models import Patients
            patient_profile, _ = Patients.objects.get_or_create(user=patient_user)
            
        if not patient_profile:
             raise ValueError("Falha sistêmica: Não foi possível criar/recuperar perfil de Paciente.")

        photo_entry = PatientPhotos.objects.create(
            patient=patient_profile,
            photo=image_file,
            is_public=is_public
        )
        return photo_entry

    @staticmethod
    def get_patient_photos(patient_user: User):
        patient_profile = getattr(patient_user, 'patients', None)
        if not patient_profile:
            return []
        return patient_profile.photos.all().order_by('-taken_at')
