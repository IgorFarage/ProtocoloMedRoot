from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .services import GeminiService
import logging

logger = logging.getLogger(__name__)

class ChatbotView(APIView):
    """
    Endpoint para interação com o Chatbot AI.
    """
    # Dependendo da regra de negócio, pode ser IsAuthenticated ou AllowAny
    # Como é um assistente para usuários da plataforma, IsAuthenticated faz sentido.
    permission_classes = [IsAuthenticated] 

    def post(self, request):
        """
        Recebe uma mensagem do usuário e retorna a resposta da IA.
        Payload esperado: {"message": "Minha pergunta"}
        """
        message = request.data.get("message")
        
        if not message:
            return Response(
                {"error": "O campo 'message' é obrigatório."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Chama o serviço para obter a resposta da IA, passando o usuário para contexto (ex: verificação de plano)
            response_text = GeminiService.generate_response(message, user=request.user)
            
            return Response({"response": response_text}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erro no ChatbotView: {e}")
            return Response(
                {"error": "Erro ao processar sua solicitação."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
