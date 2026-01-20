from rest_framework import serializers
from .models import Transaction

class AddressSerializer(serializers.Serializer):
    street = serializers.CharField(max_length=255)
    number = serializers.CharField(max_length=20)
    neighborhood = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=2)
    cep = serializers.CharField(max_length=9)
    complement = serializers.CharField(max_length=100, required=False, allow_blank=True)

class ProductItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)

class PurchaseSerializer(serializers.Serializer):
    # Personal Info
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    cpf = serializers.CharField(min_length=11, max_length=14)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Order Info
    plan_id = serializers.CharField(max_length=50) # 'standard', 'plus' or custom
    products = ProductItemSerializer(many=True, required=False)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'quarterly'], default='monthly')
    
    # Address
    address_data = AddressSerializer()
    
    # Payment
    payment_method_id = serializers.CharField(max_length=50) # 'pix', 'visa', etc.
    token = serializers.CharField(required=False, allow_null=True)
    installments = serializers.IntegerField(default=1)
    
    # Answers (JSON)
    questionnaire_data = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)

    def validate_cpf(self, value):
        return value.replace('.', '').replace('-', '')