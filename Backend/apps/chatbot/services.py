import requests
import logging
from django.conf import settings
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

class GeminiService:
    """
    Serviço responsável pela comunicação com a API do Google Gemini.
    """
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    
    @classmethod
    def generate_response(cls, message: str) -> str:
        """
        Envia uma mensagem para o Gemini e retorna a resposta gerada.
        """
        # --- MOCK MODE (Para economizar cota da API) ---
        if getattr(settings, 'CHATBOT_MOCK_MODE', False):
            import random
            logger.info("CHATBOT_MOCK_MODE ativado. Retornando resposta simulada.")
            mock_responses = [
                "🤖 [MOCK] Olá! Sou o assistente virtual do ProtocoloMedRoot. Como posso ajudar com seus pacientes hoje?",
                "🤖 [MOCK] Entendi sua pergunta. No momento estou em modo de teste para economizar recursos, mas em produção eu responderia isso com precisão via IA!",
                "🤖 [MOCK] O protocolo para este caso geralmente envolve a prescrição de...",
                "🤖 [MOCK] Esta é uma funcionalidade incrível! Posso listar os medicamentos disponíveis na nossa loja."
            ]
            return random.choice(mock_responses)

        api_key = settings.CHATBOT_API_KEY
        if not api_key:
            logger.error("CHATBOT_API_KEY não configurada no settings.")
            raise APIException("Erro de configuração do servidor: Chave de API ausente.")

        url = f"{cls.BASE_URL}?key={api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Estrutura do payload conforme documentação da API
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": message}
                    ]
                }
            ]
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Extração segura da resposta
            try:
                # O formato de resposta padrão do Gemini é:
                # candidates[0].content.parts[0].text
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as e:
                logger.error(f"Erro ao parsear resposta do Gemini: {e}. Resposta: {data}")
                return "Desculpe, não consegui entender a resposta do cérebro eletrônico."
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                logger.warning("Quota do Gemini excedida (429).")
                return "Minha conexão com o cérebro eletrônico está congestionada (Muitas requisições). Por favor, tente novamente em 1 minuto."
            
            logger.error(f"Erro HTTP do Gemini: {e}")
            raise APIException("Falha na comunicação com o serviço de IA.")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição ao Gemini: {e}")
            raise APIException("Falha na comunicação com o serviço de IA.")
