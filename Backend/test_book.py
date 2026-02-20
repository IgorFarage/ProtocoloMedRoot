import os, django, sys
sys.path.append('/home/ubuntu/Projetos/ProtocoloMedRoot/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.medical.services import MedicalScheduleService
from apps.accounts.models import User
import traceback

try:
    u = User.objects.get(email='plano54@teste.com')
    res = MedicalScheduleService.book_appointment(u, '2026-03-01', '10:00', payment_method='PIX')
    print('BOOKING RESULT:', res)
except Exception as e:
    traceback.print_exc()
