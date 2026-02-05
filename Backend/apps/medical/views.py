from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime
from .services import MedicalScheduleService, AppMedicalService
from .models import Appointments, PatientPhotos
from apps.accounts.models import User
from .serializers import PatientPhotoSerializer

class SlotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({"error": "Data obrigatória (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            slots = MedicalScheduleService.get_available_slots(target_date)
            return Response({"slots": slots})
        except ValueError:
            return Response({"error": "Formato de data inválido"}, status=status.HTTP_400_BAD_REQUEST)

class ScheduleAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Listar agendamentos do usuário
        appts = Appointments.objects.filter(patient=request.user).order_by('-scheduled_at')
        data = []
        for a in appts:
            data.append({
                "id": a.id,
                "date": a.scheduled_at.strftime("%Y-%m-%d"),
                "time": a.scheduled_at.strftime("%H:%M"),
                "doctor": a.doctor.full_name if a.doctor else "Tricologista",
                "status": a.status,
                "meeting_link": a.meeting_link
            })
        return Response(data)

    def post(self, request):
        date_str = request.data.get('date')
        time_str = request.data.get('time')

        if not date_str or not time_str:
            return Response({"error": "Data e Hora obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

        result = MedicalScheduleService.book_appointment(request.user, date_str, time_str)
        
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(result, status=status.HTTP_201_CREATED)

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
            # Return relative URL so frontend proxy handles it (Fix Mixed Content/CORS)
            "photo": doctor_profile.profile_photo.url if doctor_profile and doctor_profile.profile_photo else None
        }

        # 2. Resumo de Agendamentos (Hoje)
        # 2. Resumo de Agendamentos (Hoje)
        from django.utils import timezone
        today = timezone.localtime().date()
        # FIX: Appointments.doctor é FK para User, então usamos 'doctor=request.user'
        today_appts = Appointments.objects.filter(doctor=request.user, scheduled_at__date=today)
        
        # 3. Lista de Pacientes (Por enquanto, trazer todos os roles='patient')
        patients_qs = User.objects.filter(role='patient').order_by('-created_at')[:20] 
        
        patients_data = []
        for p in patients_qs:
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
                "lastVisit": last_appt.scheduled_at.strftime("%d/%b") if last_appt else "-",
                "nextAppointment": next_appt.scheduled_at.strftime("%d/%b - %H:%M") if next_appt else "Não agendado",
                "riskLevel": risk
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
                    "time": a.scheduled_at.strftime("%H:%M"),
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
