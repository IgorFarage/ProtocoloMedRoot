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
    def get_appointment_eligibility(user: User, specialty_type: str = 'tricologia') -> Dict[str, Any]:
        """
        Calcula elegibilidade para consulta gratuita e preço.
        Retorna: {
            "is_free": bool,
            "days_remaining": int (0 se disponível),
            "price": float,
            "last_appointment_date": datetime,
            "message": str
        }
        """
        # 1. Obter Preço Base (Bitrix)
        from apps.accounts.config import BitrixConfig
        from apps.accounts.services import BitrixService
        
        product_id = BitrixConfig.APPOINTMENT_PRODUCT_IDS.get('tricologia', 296)
        if specialty_type in ['nutricao', 'nutritionist']:
             product_id = BitrixConfig.APPOINTMENT_PRODUCT_IDS.get('nutricao', 298)
        
        price = BitrixService.get_product_price(product_id)
        if price <= 0:
            # Fallback removido conforme solicitação: O valor deve vir do Bitrix.
            # Se for 0.0, a lógica de pagamento deve tratar ou o Asaas rejeitará.
            pass

        # [REFACTORED] Buscar última consulta ANTES de checar o plano
        from django.utils import timezone
        from apps.medical.models import Appointments
        
        # Pega a ultima consulta independente da data
        last_appt = Appointments.objects.filter(
            patient=user,
            status__in=['scheduled', 'completed', 'waiting_payment']
        ).order_by('-scheduled_at') # Mais recente primeiro

        last_valid_appt = None
        for appt in last_appt:
            if appt.doctor and hasattr(appt.doctor, 'doctors'):
                doc_spec = appt.doctor.doctors.specialty_type
                # Normaliza
                is_target = False
                if specialty_type in ['tricologia', 'trichologist'] and doc_spec in ['tricologia', 'trichologist']: is_target = True
                elif specialty_type in ['nutricao', 'nutritionist'] and doc_spec in ['nutricao', 'nutritionist']: is_target = True
                
                if is_target:
                    last_valid_appt = appt
                    break
        
        # Check for Active Appointment (Future)
        active_appointment_data = None
        if last_valid_appt and last_valid_appt.scheduled_at > timezone.now():
             local_scheduled = timezone.localtime(last_valid_appt.scheduled_at)
             active_appointment_data = {
                "id": last_valid_appt.id,
                "date": local_scheduled.strftime('%Y-%m-%d'),
                "time": local_scheduled.strftime('%H:%M')
             }

        # 2. Regra Standard
        if user.current_plan != 'plus':
            return {
                "is_free": False,
                "days_remaining": 0,
                "price": price,
                "message": "Plano Standard: Consultas são cobradas à parte.",
                "active_appointment": active_appointment_data 
            }

        # 3. Regra Plus (90 dias) - Se não tem consulta, é grátis
        if not last_valid_appt:
            return {
                "is_free": True,
                "days_remaining": 0,
                "price": price,
                "message": "Sua consulta gratuita está disponível!"
            }

        # Calcular Delta
        now = timezone.now()
        # Se for futura (scheduled), delta é negativo? Não, a regra é 90 dias da ULTIMA.
        # Se tem uma futura agendada, já gastou a cota.
        # Se last_valid_appt.scheduled_at > now, então days_remaining deve considerar essa data?
        # REGRA SIMPLIFICADA: Se tem scheduled/waiting_payment FUTURO, não pode agendar outro gratis, certo?
        # A regra diz "diferença de dias entre a data atual e a data da última consulta".
        
        last_date = last_valid_appt.scheduled_at
        
        # Se a última consulta é futura, então com certeza não pode agendar outra grátis agora.
        if last_date > now:
             # Mas qto tempo falta? Falta 90 dias A PARTIR daquela data?
             # Vamos assumir 90 dias de intervalo entre consultas.
             next_free_date = last_date + timedelta(days=90)
             delta = (next_free_date - now).days
             return {
                "is_free": False,
                "days_remaining": max(0, delta),
                "price": price,
                "last_appointment_date": last_date,
                "active_appointment": {
                    "id": last_valid_appt.id,
                    "date": last_valid_appt.scheduled_at.strftime('%Y-%m-%d'),
                    "time": last_valid_appt.scheduled_at.strftime('%H:%M')
                },
                "message": f"Você já possui um agendamento. Próxima gratuidade em {max(0, delta)} dias."
             }

        # Se é passada
        delta_days = (now - last_date).days
        if delta_days >= 90:
             return {
                "is_free": True,
                "days_remaining": 0,
                "price": price,
                "message": "Sua consulta gratuita está disponível!"
            }
        else:
             days_remaining = 90 - delta_days
             return {
                "is_free": False,
                "days_remaining": days_remaining,
                "price": price,
                "last_appointment_date": last_date,
                "message": f"Carência de 90 dias ativa. Faltam {days_remaining} dias."
             }

    @staticmethod
    def book_appointment(user: User, date_str: str, time_str: str, doctor_id: str = None, payment_method: str = 'PIX', card_data: dict = None, idempotency_key: str = None) -> Dict[str, Any]:
        """
        Tenta agendar uma consulta. Suporta Pix e Cartão. Verifica elegibilidade Plus.
        Padrão Async: Cria -> Destrava -> Cobra -> Atualiza.
        """
        print(f"SERVICE LOG: book_appointment called with method={payment_method}, key={idempotency_key}")
        try:
            # 1. Parsing and making Timezone Aware
            from django.utils import timezone
            from apps.accounts.services import BitrixService
            
            naive_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            target_dt = timezone.make_aware(naive_dt)

            # 2. Validar Médico
            doctor = None
            if doctor_id:
                try:
                    doctor = User.objects.get(id=doctor_id, role='doctor')
                except:
                    pass
            
            if not doctor:
                doctor = MedicalScheduleService.get_system_doctor()
            
            if not doctor:
                return {"error": "Nenhum médico disponível."}

            # 2.5 Idempotency Check (Prevent Double Charge)
            if idempotency_key:
                 # Check if transaction already exists with this Key? 
                 # Or just user+time+doctor?
                 # ideally we save custom key in metadata. For MVP, we skip sophisticated check 
                 # but Frontend sends it to be safe.
                 pass

            # 3. Step A: Reserve Slot (Database Lock Scope)
            appt = None
            eligibility = None
            is_free = False
            price = 0.0
            
            with transaction.atomic():
                # Check for ANY existing appointment in this slot
                existing_appt = Appointments.objects.select_for_update().filter(doctor=doctor, scheduled_at=target_dt).first()
                if existing_appt:
                    if existing_appt.status == 'cancelled':
                        existing_appt.delete()
                    elif existing_appt.status == 'waiting_payment' and existing_appt.patient == user:
                        # Same user retrying? Delete old to create new (reset timer)
                        existing_appt.delete()
                    else:
                        return {"error": "Horário indisponível. Alguém agendou antes de você."}

                if Appointments.objects.filter(doctor=doctor, scheduled_at=target_dt).exists():
                     return {"error": "Horário indisponível. Erro de concorrência."}
                
                # Precificação
                specialty = 'tricologia'
                if hasattr(doctor, 'doctor_profile') and doctor.doctor_profile.specialty_type == 'nutritionist':
                    specialty = 'nutricao'
                
                eligibility = MedicalScheduleService.get_appointment_eligibility(user, specialty)
                is_free = eligibility['is_free']
                price = eligibility['price']

                # Create "Waiting" Appointment
                appt = Appointments.objects.create(
                    patient=user,
                    doctor=doctor,
                    scheduled_at=target_dt,
                    status='waiting_payment' # Default -> Async Check will confirm
                )
            
            # --- DB Transaction ENDS Here (Slot Reserved) ---
            
            # 4. Step B: External API Call (No DB Lock)
            try:
                # If Free (Plus Benefit) => Confirm Immediately
                if is_free:
                     appt.status = 'scheduled'
                     appt.save()
                     # Sync Bitrix Async (or here)
                     try:
                        BitrixService.create_appointment_deal(user, appt, specialty)
                     except: pass
                     return {"success": True, "id": appt.id, "message": "Agendamento confirmado (Plano Plus)."}

                # If Paid => Call Asaas
                from apps.financial.services import AsaasService
                asaas = AsaasService()
                
                customer_id = user.asaas_customer_id
                if not customer_id:
                    customer_id = asaas.get_or_create_customer({
                        "name": user.full_name, "email": user.email, "cpf": "", "phone": ""
                    })
                    if customer_id:
                        user.asaas_customer_id = customer_id
                        user.save()

                pm_upper = str(payment_method).upper()
                billing_type_asaas = "CREDIT_CARD" if pm_upper == 'CREDIT_CARD' else "PIX"
                
                # Enrich Card info
                if billing_type_asaas == 'CREDIT_CARD' and card_data:
                    card_data['holderInfo'] = {
                        "name": user.full_name or "Usuario",
                        "email": user.email or "email@teste.com",
                        "cpfCnpj": card_data.get('cpf') or user.cpf or "00000000000",
                        "postalCode": "22775-040", 
                        "addressNumber": "100",
                        "phone": user.phone or "21999999999",
                        "mobilePhone": user.phone or "21999999999"
                    }

                payment_res = asaas.create_payment(
                    customer_id=customer_id,
                    billing_type=billing_type_asaas,
                    value=price,
                    card_data=card_data if billing_type_asaas == "CREDIT_CARD" else None,
                    description=f"Consulta {specialty.capitalize()} - {user.full_name}"
                )
                
                if not payment_res or 'id' not in payment_res:
                     # Failed to create payment -> Rollback Slot
                     appt.delete() 
                     error_msg = payment_res.get('error') or "Erro na operadora de pagamento."
                     return {"error": error_msg}

                payment_id = payment_res['id']
                status_asaas = payment_res.get('status')
                
                # 5. Persist Transaction Record
                from apps.financial.models import Transaction
                # Map Status
                tx_status = Transaction.Status.PENDING
                if status_asaas in ['CONFIRMED', 'RECEIVED']: tx_status = Transaction.Status.APPROVED

                Transaction.objects.create(
                    user=user,
                    plan_type='standard',
                    amount=price,
                    cycle='one_off',
                    external_reference=str(uuid.uuid4()),
                    status=tx_status,
                    payment_type=Transaction.PaymentType.CREDIT_CARD if payment_method == 'CREDIT_CARD' else Transaction.PaymentType.PIX,
                    asaas_payment_id=payment_id,
                    mp_metadata={"appointment_id": appt.id}
                )

                # 6. Update Appointment Status based on Payment
                if tx_status == Transaction.Status.APPROVED:
                    appt.status = 'scheduled'
                    appt.save()
                    # Sync Bitrix
                    try:
                        deal_id = BitrixService.create_appointment_deal(user, appt, specialty)
                    except: pass
                    
                    return {"success": True, "id": appt.id, "message": "Agendamento confirmado."}
                
                else: 
                    # Pending (Pix or CC Analysis)
                    # Appt is already 'waiting_payment' (default)
                    
                    pix_data = None
                    if billing_type_asaas == "PIX":
                        pix_data = {
                            "qr_code": payment_res.get('payload'),
                            "qr_code_base64": payment_res.get('encodedImage'),
                            "ticket_url": payment_res.get('invoiceUrl')
                        }

                    # Sync Bitrix as Pending Deal? Yes.
                    try:
                        BitrixService.create_appointment_deal(user, appt, specialty)
                    except: pass

                    return {
                        "payment_required": True,
                        "price": price,
                        "pix_data": pix_data,
                        "message": "Aguardando pagamento Pix." if pix_data else "Processando pagamento do cartão."
                    }

            except Exception as e:
                # Critical Error during API Call -> Rollback Slot manual
                if appt: appt.delete()
                print(f"❌ Critical Error in Async Payment: {e}")
                return {"error": f"Erro interno: {str(e)}"}
        
        except ValueError:
            return {"error": "Formato de data/hora inválido."}
        except Exception as e:
            return {"error": f"Erro interno: {str(e)}"}

    @staticmethod
    def reschedule_appointment(user: User, appointment_id: int, new_date_str: str, new_time_str: str) -> Dict[str, Any]:
        """
        Reagenda uma consulta.
        Regra: Só permitido se > 24h de antecedência.
        Lógica: Cancela atual e cria nova (mantendo vinculo financeiro se possível via obs).
        """
        try:
            from django.utils import timezone
            
            # 1. Buscar Appointment
            try:
                appt = Appointments.objects.get(id=appointment_id, patient=user)
            except Appointments.DoesNotExist:
                return {"error": "Agendamento não encontrado."}

            # 2. Regra de 24h (Check if OLD appointment is too close)
            now = timezone.localtime()
            
            if appt.scheduled_at < now:
                return {"error": "Não é possível reagendar compromissos passados."}

            diff = appt.scheduled_at - now
            if diff < timedelta(hours=24):
                 return {"error": "Reagendamento permitido apenas com 24h de antecedência."}

            # 3. Parse New Date
            # Input format expected: YYYY-MM-DD and HH:MM
            try:
                # Cria data naive e converte para aware
                naive_dt = datetime.strptime(f"{new_date_str} {new_time_str}", "%Y-%m-%d %H:%M")
                target_dt = timezone.make_aware(naive_dt)
            except ValueError:
                return {"error": "Formato de data inválido."}

            # 3.1 Validar Disponibilidade
            if Appointments.objects.filter(doctor=appt.doctor, scheduled_at=target_dt, status='scheduled').exists():
                 return {"error": "O novo horário escolhido já está ocupado."}

            # 4. Atualizar (Atomic Exchange)
            with transaction.atomic():
                # Cancelar antigo
                appt.status = 'cancelled'
                appt.save()
                
                # Criar Novo
                new_appt = Appointments.objects.create(
                    patient=user,
                    doctor=appt.doctor,
                    scheduled_at=target_dt,
                    status='scheduled',
                    meeting_link=appt.meeting_link 
                )
                
                try:
                    specialty = 'consulta'
                    if hasattr(appt.doctor, 'doctors'):
                         # FIX: Access via related_name or OneToOne defaults
                         # The model Doctors has OneToOne to User.
                         # related_name default is 'doctors' because model name is Doctors? 
                         # Actually model is Doctors, so user.doctors is the way.
                        specialty = (appt.doctor.doctors.specialty_type or 'consulta')
                    
                    from apps.accounts.services import BitrixService
                    # Marca Deal antigo como perdido/reagendado? Ou deixa lá?
                    # Cria novo deal
                    BitrixService.create_appointment_deal(user, new_appt, specialty)
                except: pass
                
            return {"success": True, "message": "Reagendamento confirmado (Novo ID gerado)."}

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
