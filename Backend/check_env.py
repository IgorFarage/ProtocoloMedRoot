import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
print(f"Loading .env from {BASE_DIR / '.env'}")
load_dotenv(BASE_DIR / '.env', override=True)

print(f"DEBUG={os.getenv('DEBUG')}")
print(f"DJANGO_ENV={os.getenv('DJANGO_ENV')}")
