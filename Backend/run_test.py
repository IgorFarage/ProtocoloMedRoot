import sys, os
from dotenv import load_dotenv
load_dotenv()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from apps.medical.services import MedicalScheduleService
from apps.accounts.models import User
import traceback

try:
    u = User.objects.get(email='plano54@teste.com')
    res = MedicalScheduleService.book_appointment(u, '2026-03-01', '10:00', payment_method='PIX')
    print("BOOKING RESULT:", res)
except Exception as e:
    print("FATAL EXCEPTION:")
    traceback.print_exc()
