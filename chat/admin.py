from django.contrib import admin
from .models import ChatRoom,Message,Notification,ButtonDetails, TextDetails,ChatRoom_update,Message_update,ChatFile

admin.site.register(ChatRoom)
admin.site.register(Message)
admin.site.register(Notification)
admin.site.register(ButtonDetails)
admin.site.register(TextDetails)
admin.site.register(ChatRoom_update)
admin.site.register(Message_update)
admin.site.register(ChatFile)