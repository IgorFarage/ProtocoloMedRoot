from rest_framework import serializers
from .models import PatientPhotos

class PatientPhotoSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    class Meta:
        model = PatientPhotos
        fields = ['id', 'photo', 'taken_at', 'is_public']
        read_only_fields = ['id', 'taken_at']

    def get_photo(self, obj):
        if obj.photo:
            return obj.photo.url  # Returns relative path (e.g. /media/...)
        return None

from .models import DoctorAvailability
class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_active']

