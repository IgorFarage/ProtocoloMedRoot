import os
import requests
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env', override=True)

api_key = os.getenv('ASAAS_API_KEY')
api_url = os.getenv('ASAAS_API_URL')

print(f"URL: {api_url}")
print(f"Key starts with: {api_key[:10] if api_key else 'None'}")

headers = {
    "access_token": api_key,
    "Content-Type": "application/json",
    "User-Agent": "TestScript/1.0"
}

try:
    response = requests.get(f"{api_url}/customers?limit=1", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
