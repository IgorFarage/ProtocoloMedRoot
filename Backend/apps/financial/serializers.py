from rest_framework import serializers

class CheckoutSerializer(serializers.Serializer):
    plan_id = serializers.ChoiceField(choices=['standard', 'plus'])
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'quarterly'])