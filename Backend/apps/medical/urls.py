from django.urls import path
from .views import (
    SlotsView, ScheduleAppointmentView, RescheduleAppointmentView, 
    PatientEvolutionView, 
    DoctorPatientPhotosView, DoctorDashboardStatsView, UpdateDoctorPhotoView,
    DoctorAvailabilityView, DoctorPatientDetailView, CheckEligibilityView
)

urlpatterns = [
    # Dashboard
    path('doctor/dashboard/', DoctorDashboardStatsView.as_view(), name='doctor-dashboard'),
    path('doctor/profile/photo/', UpdateDoctorPhotoView.as_view(), name='doctor-update-photo'),

    path('slots/', SlotsView.as_view(), name='medical-slots'),
    path('appointments/', ScheduleAppointmentView.as_view(), name='medical-appointments'),
    path('appointments/check-eligibility/', CheckEligibilityView.as_view(), name='medical-check-eligibility'),
    path('appointments/<int:pk>/reschedule/', RescheduleAppointmentView.as_view(), name='medical-appointment-reschedule'),
    path('evolution/', PatientEvolutionView.as_view(), name='medical-evolution'),
    path('doctor/patients/<uuid:patient_id>/photos/', DoctorPatientPhotosView.as_view(), name='doctor-patient-photos'),
    path('doctor/patients/<uuid:patient_id>/details/', DoctorPatientDetailView.as_view(), name='doctor-patient-details'),
    path('doctor/availability/', DoctorAvailabilityView.as_view(), name='doctor-availability'),
]
