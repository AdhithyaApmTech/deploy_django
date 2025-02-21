from rest_framework import serializers
from .models import ChatFile

class FileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatFile
        fields = ['file', 'sender', 'room_name']
