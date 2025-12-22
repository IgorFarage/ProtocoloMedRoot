from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.http import HttpResponse
from apps.accounts.services import BitrixService
import requests

class ProductCatalogView(APIView):
    """
    Retorna o catálogo de produtos vindo do Bitrix.
    Pública (AllowAny) para que possa ser vista na Home sem login.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        products = BitrixService.get_product_catalog()
        
        # Mesmo se vier vazio (erro ou sem produtos), retornamos 200 com lista vazia
        # para não quebrar o frontend.
        return Response(products, status=status.HTTP_200_OK)

class ProductImageProxyView(APIView):
    """
    Proxy para servir imagens do Bitrix.
    URL: /api/store/image/<product_id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        # Agora o serviço retorna (conteúdo, content_type)
        image_content, content_type = BitrixService.get_product_image_content(product_id)
        
        if image_content:
            return HttpResponse(image_content, content_type=content_type)
        
        return Response({"error": "Imagem não encontrada"}, status=status.HTTP_404_NOT_FOUND)