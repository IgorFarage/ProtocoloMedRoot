import requests
import json

r1 = requests.post("http://localhost:8000/api/accounts/token/", json={"email": "plano54@teste.com", "password": "senhadoteste"})
token = r1.json().get('access')

r2 = requests.get("http://localhost:8000/api/medical/appointments/", headers={"Authorization": f"Bearer {token}"})
print(json.dumps(r2.json(), indent=2))
