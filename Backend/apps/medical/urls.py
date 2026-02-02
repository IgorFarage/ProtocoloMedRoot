from django.urls import path
from .views import SlotsView, ScheduleAppointmentView, PatientEvolutionView, DoctorPatientPhotosView, DoctorDashboardStatsView

urlpatterns = [
    # Dashboard
    path('doctor/dashboard/', DoctorDashboardStatsView.as_view(), name='doctor-dashboard'),

    path('slots/', SlotsView.as_view(), name='medical-slots'),
    path('appointments/', ScheduleAppointmentView.as_view(), name='medical-appointments'),
    path('evolution/', PatientEvolutionView.as_view(), name='medical-evolution'),
    path('doctor/patients/<uuid:patient_id>/photos/', DoctorPatientPhotosView.as_view(), name='doctor-patient-photos'),
]
