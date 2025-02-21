import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import ChatRoom_update, Message_update

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        # Try to get the existing chat room
        self.room = await ChatRoom_update.objects.filter(room_id=self.room_id).afirst()

        if not self.room:
            self.room = await ChatRoom_update.objects.acreate(
                room_id=self.room_id,
                employee_joined=''
            )
        # Notify employees about the new room
            await self.channel_layer.group_send(
                "employees",
                {
                    'type': 'send_notification',
                    'room_id': self.room_id
                }
            )
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"WebSocket connected to room {self.room_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected from room {self.room_id}")

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json.get('message')
            sender = text_data_json.get('sender')
            message_type  = text_data_json.get('type')

            if not self.room:
                logger.error(f"Room {self.room_id} does not exist. Message cannot be saved.")
                return

            
            
            if message_type == "file_upload":
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "message_type": "file_upload",
                        "filename": text_data_json["filename"],
                        "file_url": text_data_json["file_url"],
                        "sender":text_data_json["sender"]
                    }
                )
            elif message_type == "audio_upload":
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "message_type": "audio_upload",
                        "filename": text_data_json["filename"],
                        "file_url": text_data_json["file_url"],
                        "sender":text_data_json["sender"]
                    }
                )

            elif message_type in ["offer", "answer", "ice-candidate","call-ended","share","accept","stop-sharing","request","request_cancel"]:
                # WebRTC signaling messages (Offer, Answer, ICE Candidate)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "webrtc_signal",
                        "message_type": message_type,
                        "message": text_data_json["message"],
                        "sender": text_data_json.get("sender"),
                    }
                )
            elif message_type == "chat_transfer":
                room = text_data_json["roomid"]
                room_data = await ChatRoom_update.objects.filter(room_id=room).afirst()
                if room_data:
                    room_data.status = 'pending'
                    room_data.employee_joined = ''
                    await room_data.asave()
                await self.channel_layer.group_send(
                "employees",
                {
                    'type': 'send_notification',
                    'room_id':room,
                }
            )
            else:
                # Save the message
                await Message_update.objects.acreate(
                    room=self.room,
                    content=message,
                    sender=sender
                )
                # Broadcast message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'sender': sender
                    }
                )
            
        except Exception as e:
            logger.error(f"Error in receive method: {str(e)}")
    
    async def chat_message(self, event):

        if event.get("message_type") == "file_upload":
            await self.send(text_data=json.dumps({
                "message_type": "file_upload",
                "filename": event.get("filename", "Unknown File"),
                "file_url": event.get("file_url", ""),
                'sender': event.get('sender')
            }))
        elif event.get("message_type")=="audio_upload":
            await self.send(text_data=json.dumps({
                "message_type": "audio_upload",
                "filename": event.get("filename", "Unknown File"),
                "file_url": event.get("file_url", ""),
                'sender': event.get('sender')
            }))
        else:
            await self.send(text_data=json.dumps({
                'message': event['message'],
                'sender': event['sender']
            }))

    async def webrtc_signal(self, event):
        print(event.get("sender"),event["message_type"])
        """Handles WebRTC signaling messages (offer, answer, ICE candidates)"""
        await self.send(text_data=json.dumps({
            "message_type": event["message_type"],
            "message": event["message"],
            "sender": event.get("sender"),
        }))


class EmployeeDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("employees", self.channel_name)
        await self.accept()

        # Send existing pending rooms
        rooms = await self.get_pending_rooms()
        for room in rooms:
            await self.send(text_data=json.dumps({
                'type': 'new_room',
                'room_id': room.room_id
            }))

    async def get_pending_rooms(self):
        return [room async for room in ChatRoom_update.objects.filter(status='pending')]

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("employees", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'accept_room':
                room = await ChatRoom_update.objects.filter(room_id=data['room_id']).afirst()
                
                if room:
                    room.status = 'active'
                    room.employee_joined = data['employee_id']
                    await room.asave()
                    await self.channel_layer.group_send(
                        "employees",
                        {
                            'type': 'room_accepted',
                            'room_id': data['room_id']
                        }
                    )
                    await self.send(text_data=json.dumps({
                        'type': 'room_accepted',
                        'room_id': data['room_id'],
                        'employee':data['employee_id']
                    }))
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Room not found'
                    }))
        except Exception as e:
            logger.error(f"Error in EmployeeDashboardConsumer receive: {str(e)}")

    async def send_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_room',
            'room_id': event['room_id']
        }))

    async def room_accepted(self, event):
        # Send a message to all employees to remove the notification
        await self.send(text_data=json.dumps({
            'type': 'room_accepted',
            'room_id': event['room_id']
        }))
    