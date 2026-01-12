from datetime import datetime, timedelta, date, time
from typing import List, Dict, Any, Optional
from django.db import transaction
from django.conf import settings
from .models import Appointments
from apps.accounts.models import User

class MedicalScheduleService:
    
    SLOT_DURATION_MINUTES = 60
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
    def get_available_slots(target_date: date) -> List[str]:
        """
        Gera slots de horário para o dia, removendo os já agendados.
        Retorna lista de strings ["09:00", "10:00", ...]
        """
        # 1. Regras Básicas (Dia da semana, Data passada)
        if target_date.weekday() not in MedicalScheduleService.WORK_DAYS:
            return [] # Fim de semana fechado
        
        if target_date < date.today():
             return []

        doctor = MedicalScheduleService.get_system_doctor()
        if not doctor:
            # Se não tem médico no sistema, não tem agenda
            return []

        # 2. Gerar todos os slots possíveis
        possible_slots = []
        current_time = time(MedicalScheduleService.START_HOUR, 0)
        end_time = time(MedicalScheduleService.END_HOUR, 0)
        
        while current_time <= end_time:
            possible_slots.append(current_time)
            # Add hour
            dt = datetime.combine(date.today(), current_time) + timedelta(minutes=MedicalScheduleService.SLOT_DURATION_MINUTES)
            current_time = dt.time()

        # 3. Buscar agendamentos existentes (Bloqueados)
        busy_times = Appointments.objects.filter(
            doctor=doctor,
            scheduled_at__date=target_date,
            status='scheduled'
        ).values_list('scheduled_at__time', flat=True)

        # 4. Filtrar
        available = []
        now = datetime.now()
        
        for slot in possible_slots:
            # Se for hoje, remover horários passados
            if target_date == date.today():
                if slot <= now.time():
                    continue
            
            if slot not in busy_times:
                available.append(slot.strftime("%H:%M"))

        return available

    @staticmethod
    def book_appointment(user: User, date_str: str, time_str: str) -> Dict[str, Any]:
        """
        Tenta agendar uma consulta.
        """
        try:
            # 1. Parsing
            target_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            
            # 2. Validar Médico
            doctor = MedicalScheduleService.get_system_doctor()
            if not doctor:
                return {"error": "Nenhum médico disponível no sistema."}

            # 3. Check Double Booking (Concurrency Safety)
            with transaction.atomic():
                if Appointments.objects.filter(doctor=doctor, scheduled_at=target_dt, status='scheduled').exists():
                    return {"error": "Horário indisponível. Alguém agendou antes de você."}
                
                # 4. Criar
                appt = Appointments.objects.create(
                    patient=user,
                    doctor=doctor,
                    scheduled_at=target_dt,
                    status='scheduled'
                    # meeting_link poderia ser gerado aqui
                )
                return {"success": True, "id": appt.id, "message": "Agendamento realizado com sucesso."}
        
        except ValueError:
            return {"error": "Formato de data/hora inválido."}
        except Exception as e:
            return {"error": f"Erro interno: {str(e)}"}
