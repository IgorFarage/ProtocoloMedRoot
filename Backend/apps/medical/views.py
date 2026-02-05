from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime
from .services import MedicalScheduleService, AppMedicalService
from .models import Appointments, PatientPhotos
from apps.accounts.models import User
from apps.accounts.models import User
from .serializers import PatientPhotoSerializer
from django.db import transaction

class SlotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({"error": "Data obrigatória (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            # Determinar médico
            doctor_id_param = request.query_params.get('doctor_id')
            doctor_user = None

            if doctor_id_param:
                # Validar se o médico pertence à equipe do paciente
                try:
                    target_doctor_id = str(doctor_id_param) # ID do USER do médico (UUID)
                    patient_profile = request.user.patients
                    
                    is_assigned = False
                    if patient_profile.assigned_trichologist and str(patient_profile.assigned_trichologist.user.id) == target_doctor_id:
                        is_assigned = True
                        doctor_user = patient_profile.assigned_trichologist.user
                    elif patient_profile.assigned_nutritionist and str(patient_profile.assigned_nutritionist.user.id) == target_doctor_id:
                        is_assigned = True
                        doctor_user = patient_profile.assigned_nutritionist.user
                    
                    if not is_assigned:
                        return Response({"error": "Médico não atribuído a este paciente."}, status=status.HTTP_403_FORBIDDEN)
                        
                except Exception:
                     return Response({"error": "ID de médico inválido"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Fallback: Prioriza Tricologista
                if hasattr(request.user, 'patients'):
                    if request.user.patients.assigned_trichologist:
                        doctor_user = request.user.patients.assigned_trichologist.user
                    elif request.user.patients.assigned_nutritionist:
                        doctor_user = request.user.patients.assigned_nutritionist.user
            
            # Se ainda assim não tiver médico (ex: paciente sem time), retorna vazio mas sem erro critico para não quebrar front antigo
            if not doctor_user:
                 return Response({"slots": []}) # Ou erro explícito

            slots = MedicalScheduleService.get_available_slots(target_date, doctor_user=doctor_user)
            return Response({"slots": slots, "doctor_name": doctor_user.full_name, "doctor_id": doctor_user.id})
        except ValueError:
            return Response({"error": "Formato de data inválido"}, status=status.HTTP_400_BAD_REQUEST)

class ScheduleAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'doctor':
             # Médico vê sua própria agenda
             appts = Appointments.objects.filter(doctor=request.user).order_by('-scheduled_at')
        else:
             # Paciente vê seus agendamentos
             appts = Appointments.objects.filter(patient=request.user).order_by('-scheduled_at')

        data = []
        from django.utils import timezone as tz
        for a in appts:
            data.append({
                "id": a.id,
                "date": tz.localtime(a.scheduled_at).strftime("%Y-%m-%d"),
                "time": tz.localtime(a.scheduled_at).strftime("%H:%M"),
                # Se for médico, mostrar nome do paciente. Se for paciente, nome do médico.
                "patient_name": a.patient.full_name if a.patient else "Paciente Removido",
                "doctor_name": a.doctor.full_name if a.doctor else "Tricologista",
                "status": a.status,
                "meeting_link": a.meeting_link
            })
        return Response(data)

    def post(self, request):
        date_str = request.data.get('date')
        time_str = request.data.get('time')
        doctor_id_param = request.data.get('doctor_id') # Changed from inferred to explicit optional

        if not date_str or not time_str:
            return Response({"error": "Data e Hora obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

        # Determinar e validar médico
        doctor_id = None
        if doctor_id_param:
             try:
                target_doctor_id = str(doctor_id_param)
                patient_profile = request.user.patients
                
                is_assigned = False
                if patient_profile.assigned_trichologist and str(patient_profile.assigned_trichologist.user.id) == target_doctor_id:
                    is_assigned = True
                    doctor_id = target_doctor_id
                elif patient_profile.assigned_nutritionist and str(patient_profile.assigned_nutritionist.user.id) == target_doctor_id:
                    is_assigned = True
                    doctor_id = target_doctor_id
                
                if not is_assigned:
                    return Response({"error": "Médico não atribuído a este paciente."}, status=status.HTTP_403_FORBIDDEN)
             except Exception:
                 return Response({"error": "ID de médico inválido"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Fallback if no doctor_id provided (maintain backward compatibility or auto-assign)
        if not doctor_id:
            if hasattr(request.user, 'patients') and request.user.patients.assigned_trichologist:
                doctor_id = request.user.patients.assigned_trichologist.user.id

        result = MedicalScheduleService.book_appointment(request.user, date_str, time_str, doctor_id=doctor_id)
        
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(result, status=status.HTTP_201_CREATED)

class RescheduleAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        date_str = request.data.get('date')
        time_str = request.data.get('time')
        
        if not date_str or not time_str:
             return Response({"error": "Nova Data e Hora são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

        result = MedicalScheduleService.reschedule_appointment(request.user, pk, date_str, time_str)
        
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(result, status=status.HTTP_200_OK)

class PatientEvolutionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        photos = AppMedicalService.get_patient_photos(request.user)
        serializer = PatientPhotoSerializer(photos, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        file_obj = request.FILES.get('photo')
        if not file_obj:
            return Response({"error": "Nenhuma imagem fornecida."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # TODO: Receber is_public do request se necessário
            photo = AppMedicalService.create_evolution_entry(request.user, file_obj)
            serializer = PatientPhotoSerializer(photo, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DoctorPatientPhotosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        # 1. Segurança: Apenas Médicos
        if request.user.role != 'doctor':
             return Response({"error": "Acesso negado. Apenas médicos podem acessar este recurso."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Buscar Fotos
        # Importante: O 'patient_id' aqui se refere ao ID do usuário (User Table) ou da tabela Patients?
        # Pela convenção do projeto, geralmente nas rotas passamos o User ID.
        # O Service espera um User object ou faz a query via Patient Profile.
        
        # Vamos buscar via Model diretamente para ter certeza
        # photos = PatientPhotos.objects.filter(patient__user__id=patient_id).order_by('-taken_at')
        
        # O PatientPhotos tem relação com 'accounts.Patients' via 'patient' field.
        # accounts.Patients tem 'user' como OneToOnePK.
        # Logo: patient_id (User UUID) == accounts.Patients PK.
        
        photos = PatientPhotos.objects.filter(patient_id=patient_id).order_by('-taken_at')
        
        serializer = PatientPhotoSerializer(photos, many=True, context={'request': request})
        return Response(serializer.data)

class DoctorDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'doctor':
             return Response({"error": "Acesso negado."}, status=status.HTTP_403_FORBIDDEN)
        
        # 1. Dados do Médico
        # Tenta buscar perfil médico explicitamente
        doctor_profile = None
        try:
            # Import local para evitar problemas de ciclo se houver, ou apenas garantir acesso
            from apps.accounts.models import Doctors
            doctor_profile = Doctors.objects.get(user=request.user)
        except Exception:
            doctor_profile = None

        doctor_info = {
            "name": request.user.full_name,
            "email": request.user.email,
            "crm": doctor_profile.crm if doctor_profile else "N/A",
            "specialty": doctor_profile.specialty if doctor_profile else "Geral",
            "specialty_type": doctor_profile.get_specialty_type_display() if doctor_profile else "N/A",
            # Return relative URL so frontend proxy handles it (Fix Mixed Content/CORS)
            "photo": doctor_profile.profile_photo.url if doctor_profile and doctor_profile.profile_photo else None
        }

        # 2. Resumo de Agendamentos (Hoje)
        # 2. Resumo de Agendamentos (Hoje)
                # 2. Resumo de Agendamentos (Hoje)
        from django.utils import timezone
        today = timezone.localtime().date()
        # FIX: Appointments.doctor é FK para User, então usamos 'doctor=request.user'
        today_appts = Appointments.objects.filter(doctor=request.user, scheduled_at__date=today)
        
        # 3. Lista de Pacientes (Meus pacientes atribuídos)
        from django.db.models import Q
        from apps.accounts.models import Patients

        my_patients_qs = []
        if doctor_profile:
             my_patients_qs = Patients.objects.filter(
                Q(assigned_trichologist=doctor_profile) | Q(assigned_nutritionist=doctor_profile)
             ).select_related('user').order_by('-user__created_at')
        
        patients_data = []
        for profile in my_patients_qs:
            p = profile.user
            
            # Determina papel que eu exerço para este paciente
            roles = []
            if profile.assigned_trichologist_id == doctor_profile.user.id:
                roles.append("Tricologista")
            if profile.assigned_nutritionist_id == doctor_profile.user.id:
                roles.append("Nutricionista")
            
            role_display = " & ".join(roles)

            # Tenta achar último agendamento
            last_appt = Appointments.objects.filter(patient=p, status='completed').order_by('-scheduled_at').first()
            next_appt = Appointments.objects.filter(patient=p, status='scheduled', scheduled_at__gte=timezone.now()).order_by('scheduled_at').first()
            
            # Risco Simulado
            risk = 'Baixo'
            if p.questionnaires.exists():
                risk = 'Moderado'
            
            patients_data.append({
                "id": str(p.id),
                "name": p.full_name,
                "email": p.email,
                "lastVisit": timezone.localtime(last_appt.scheduled_at).strftime("%d/%b") if last_appt else "-",
                "nextAppointment": timezone.localtime(next_appt.scheduled_at).strftime("%d/%b - %H:%M") if next_appt else "Não agendado",
                "riskLevel": risk,
                "myRole": role_display
            })

        return Response({
            "doctor": doctor_info,
            "stats": {
                "total_patients": User.objects.filter(role='patient').count(),
                "appointments_today": today_appts.count()
            },
            "patients": patients_data,
            "appointments_today_list": [
                {
                    "id": a.id, 
                    "patient_name": a.patient.full_name, 
                    "time": timezone.localtime(a.scheduled_at).strftime("%H:%M"),
                    "status": a.status
                } for a in today_appts
            ]
        })

class UpdateDoctorPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        if request.user.role != 'doctor':
             return Response({"error": "Acesso negado."}, status=status.HTTP_403_FORBIDDEN)
             
        file_obj = request.FILES.get('photo')
        if not file_obj:
            return Response({"error": "Nenhuma imagem fornecida."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from apps.accounts.models import Doctors
            doctor, created = Doctors.objects.get_or_create(user=request.user)
            
            # Remove imagem antiga se for substituir? O Django faz isso automaticamente se sobrescrever? 
            # Depende do storage backend, mas geralmente não deleta o arquivo físico.
            # Por simplicidade MVP, apenas atualizamos.
            
            doctor.profile_photo = file_obj
            doctor.save()
            
            # Return relative URL
            new_url = doctor.profile_photo.url
            return Response({"message": "Foto atualizada", "photo_url": new_url}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"Erro ao salvar foto: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from .serializers import DoctorAvailabilitySerializer
from .models import DoctorAvailability

class DoctorAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'doctor':
             return Response({"error": "Acesso negado."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            from apps.accounts.models import Doctors
            doctor = Doctors.objects.get(user=request.user)
            availabilities = DoctorAvailability.objects.filter(doctor=doctor)
            serializer = DoctorAvailabilitySerializer(availabilities, many=True)
            return Response(serializer.data)
        except Doctors.DoesNotExist:
             return Response({"error": "Perfil médico não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        if request.user.role != 'doctor':
             return Response({"error": "Acesso negado."}, status=status.HTTP_403_FORBIDDEN)

        try:
            from apps.accounts.models import Doctors
            doctor = Doctors.objects.get(user=request.user)
            
            # Expecting a list of rules or a single rule? Let's assume full replacement for simplicity or single add?
            # Let's support bulk update/replace for MVP simplicity on frontend
            # If "replace_all": true in data, we wipe and set.
            
            data = request.data
            if isinstance(data, list):
                # Bulk replace
                with transaction.atomic():
                    DoctorAvailability.objects.filter(doctor=doctor).delete()
                    serializer = DoctorAvailabilitySerializer(data=data, many=True)
                    if serializer.is_valid():
                        serializer.save(doctor=doctor)
                        return Response(serializer.data, status=status.HTTP_201_CREATED)
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                 # Single Add
                serializer = DoctorAvailabilitySerializer(data=data)
                if serializer.is_valid():
                    serializer.save(doctor=doctor)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Doctors.DoesNotExist:
             return Response({"error": "Perfil médico não encontrado."}, status=status.HTTP_404_NOT_FOUND)

