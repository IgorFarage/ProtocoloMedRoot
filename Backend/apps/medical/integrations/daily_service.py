import requests
import time
from django.conf import settings

class DailyService:
    """
    Serviço encapsulado para comunicação com a API do Daily.co.
    Responsável por criar Salas Privadas e gerar Tokens de Reunião Múltiplos.
    """
    @staticmethod
    def _get_headers():
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.DAILY_API_KEY}"
        }

    @staticmethod
    def create_room(room_name_prefix="consulta", exp_timestamp=None):
        url = f"{settings.DAILY_API_URL.rstrip('/')}/rooms"
        room_name = f"{room_name_prefix}-{int(time.time())}"
        
        payload = {
            "name": room_name,
            "privacy": "public",
            "properties": {
                "enable_chat": True,
                "start_video_off": True,
                "start_audio_off": True,
                "enable_screenshare": True,
            }
        }
        
        if exp_timestamp:
            payload["properties"]["exp"] = exp_timestamp
            
        try:
            response = requests.post(url, json=payload, headers=DailyService._get_headers(), timeout=10)
            response.raise_for_status()
            data = response.json()
            return {
                "url": data.get("url"),
                "name": data.get("name")
            }
        except requests.exceptions.RequestException as e:
            print(f"Erro no Daily.co API (create_room): {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            return None

    @staticmethod
    def create_meeting_token(room_name, is_owner=False, exp_timestamp=None):
        url = f"{settings.DAILY_API_URL.rstrip('/')}/meeting-tokens"
        
        payload = {
            "properties": {
                "room_name": room_name,
                "is_owner": is_owner
            }
        }
        
        if exp_timestamp:
            payload["properties"]["exp"] = exp_timestamp
            
        try:
            response = requests.post(url, json=payload, headers=DailyService._get_headers(), timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get("token")
        except requests.exceptions.RequestException as e:
            print(f"Erro no Daily.co API (create_meeting_token): {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            return None
