# chat/models.py
from django.db import models
from django.contrib.auth.models import User
from django_ckeditor_5.fields import CKEditor5Field
import uuid

class ChatRoom(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('closed', 'Closed'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_chats')
    assigned_employee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_chats')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom {self.id} - {self.status}"

class Message(models.Model):
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages',null=True, blank=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    visible_to_all = models.BooleanField(default=False)

    def __str__(self):
        return f"Message by {self.sender.username} at {self.timestamp}"

class Notification(models.Model):
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='notifications')
    employee = models.ForeignKey(User, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.employee.username} - ChatRoom {self.chat_room.id}"
    

class ButtonDetails(models.Model):
    id = models.AutoField(primary_key=True)
    button = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    parent_id = models.IntegerField(default=0)  # Default set to 0

    def __str__(self):
        return self.button


class TextDetails(models.Model):
    id = models.AutoField(primary_key=True)
    text=CKEditor5Field('Text', config_name='extends', default="")
    reference_button = models.ForeignKey(ButtonDetails, on_delete=models.CASCADE, related_name="text_details")

    def __str__(self):
        return f"Text for {self.reference_button.button}"
    

class ChatRoom_update(models.Model):
    room_id = models.CharField(max_length=255, unique=True)
    employee_joined = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('active', 'Active'),('completed', 'Completed')], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.status

class Message_update(models.Model):
    room = models.ForeignKey(ChatRoom_update, on_delete=models.CASCADE)
    content = models.TextField()
    sender = models.CharField(max_length=10, choices=[('user', 'User'), ('employee', 'Employee')])
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.content
    

class ChatFile(models.Model):
    sender = models.CharField(max_length=10)
    room_name = models.CharField(max_length=255)
    file = models.FileField(upload_to="chat_files/")
    timestamp = models.DateTimeField(auto_now_add=True)


    