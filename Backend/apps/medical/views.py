from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime
from .services import MedicalScheduleService, AppMedicalService
from .models import Appointments
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
