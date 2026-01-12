from django.urls import path
from .views import SlotsView, ScheduleAppointmentView

urlpatterns = [
    path('slots/', SlotsView.as_view(), name='medical-slots'),
    path('appointments/', ScheduleAppointmentView.as_view(), name='medical-appointments'),
]
