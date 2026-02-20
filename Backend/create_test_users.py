from apps.accounts.models import User, Doctors
from django.utils import timezone
import uuid

def create_users():
    # 1. Create Patient User (pasciente@protocolo.com)
    # email: pasciente@protocolo.com, password: '12345678', plan: 'plus'
    
    patient_email = "pasciente@protocolo.com"
    try:
        if User.objects.filter(email=patient_email).exists():
            print(f"User {patient_email} already exists. Updating...")
            user_patient = User.objects.get(email=patient_email)
        else:
            print(f"Creating user {patient_email}...")
            user_patient = User(email=patient_email, full_name="Paciente Teste")
        
        user_patient.set_password("12345678")
        user_patient.current_plan = 'plus' # User requested "compra ja aprovada, pasciente com o plano plus"
        user_patient.status = 'active'
        user_patient.role = 'patient'
        user_patient.subscription_status = 'active' # Ensure subscription is active
        user_patient.save()
        print(f"Successfully configured {patient_email}.")
        
    except Exception as e:
        print(f"Error creating/updating {patient_email}: {e}")

    # 2. Create Doctor User (medico@protocolo.com)
    # email: medico@protocolo.com, password: '12345678'
    
    doctor_email = "medico@protocolo.com"
    try:
        if User.objects.filter(email=doctor_email).exists():
            print(f"User {doctor_email} already exists. Updating...")
            user_doctor = User.objects.get(email=doctor_email)
        else:
            print(f"Creating user {doctor_email}...")
            user_doctor = User(email=doctor_email, full_name="Dr. Medico Teste")
            
        user_doctor.set_password("12345678")
        user_doctor.role = 'doctor'
        user_doctor.save()
        
        # Ensure Doctor Profile Exists
        # Note: Doctors model uses OneToOneField as primary key
        if not Doctors.objects.filter(user=user_doctor).exists():
             print(f"Creating Doctor Profile for {doctor_email}...")
             Doctors.objects.create(
                 user=user_doctor,
                 crm="12345-SP",
                 specialty="Tricologia",
                 specialty_type='trichologist',
                 bio="Medico de Teste Automatizado"
             )
        else:
             print(f"Doctor Profile for {doctor_email} already exists.")
             
        print(f"Successfully configured {doctor_email}.")

    except Exception as e:
        print(f"Error creating/updating {doctor_email}: {e}")

if __name__ == "__main__":
    create_users()
