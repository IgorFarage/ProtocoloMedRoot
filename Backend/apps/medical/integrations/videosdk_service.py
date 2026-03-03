import requests
import jwt
import datetime
from django.conf import settings

class VideoSDKService:
    """
    Serviço encapsulado para comunicação com a API do VideoSDK.live.
    A API usa JWTs gerados localmente, não necessitando chamadas externas extras.
    """

    @staticmethod
    def generate_token(is_owner=False):
        """
        Gera o Token assinado com SHA-256 usando o Secret e a API Key do projeto.
        Se is_owner for True, injetamos pemissões nativas (mute, remove, etc).
        """
        expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        
        permissions = ['allow_join']
        if is_owner:
            permissions.extend(['allow_mod', 'ask_join']) # Moderator privileges

        payload = {
            'apikey': settings.VIDEOSDK_API_KEY,
            'permissions': permissions,
            'version': 2,
            'exp': expiration
        }
        
        # PyJWT usa str/bytes dependendo da versão, HS256 é padrão
        token = jwt.encode(payload, settings.VIDEOSDK_SECRET, algorithm='HS256')
        return token

    @staticmethod
    def create_room(custom_room_id=None):
        """
        Solicita a criação (ou confirmação se custom id) de uma Room no servidor da VideoSDK
        """
        token = VideoSDKService.generate_token(is_owner=True)
        url = "https://api.videosdk.live/v2/rooms"
        headers = {
            "Authorization": str(token),
            "Content-Type": "application/json"
        }
        
        payload = {}
        if custom_room_id:
            payload['customRoomId'] = custom_room_id

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get("roomId") # Retorna ex: "xxx-yyy-zzz"
        except requests.exceptions.RequestException as e:
            print(f"Erro no VideoSDK API (create_room): {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            return custom_room_id # Fallback silencioso para SDK tentar client-side se der
