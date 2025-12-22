from django.urls import path
from .views import ProductCatalogView, ProductImageProxyView

urlpatterns = [
    path('catalog/', ProductCatalogView.as_view(), name='product_catalog'),
    path('image/<int:product_id>/', ProductImageProxyView.as_view(), name='product_image_proxy'),
]