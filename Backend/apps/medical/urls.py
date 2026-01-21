from django.urls import path
from .views import SlotsView, ScheduleAppointmentView, PatientEvolutionView

urlpatterns = [
    path('slots/', SlotsView.as_view(), name='medical-slots'),
    path('appointments/', ScheduleAppointmentView.as_view(), name='medical-appointments'),
    path('evolution/', PatientEvolutionView.as_view(), name='medical-evolution'),
]
