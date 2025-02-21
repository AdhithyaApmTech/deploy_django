from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth import authenticate, login,logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from .models import *
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
# from .forms import UserInputForm
from chat.models import Message
import json
from openai import OpenAI
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ButtonDetails, TextDetails, ChatFile, ChatRoom_update
from .forms import ButtonDetailsForm, TextDetailsForm
from django.core.files.base import ContentFile
from django.conf import settings
from django.core.files.storage import default_storage
import os

# @api_view(["POST"])
# def send_message(request):
#     user_id = request.data.get("user_id")
#     content = request.data.get("content")

#     session, created = ChatSession.objects.get_or_create(user_id=user_id, is_active=True)
#     message = Message.objects.create(session=session, sender_id=user_id, content=content)

#     return Response({"message": "Message sent", "session_id": session.id})

def index(request):
    return render(request, "chat/index.html")


def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})


def home(request):
    return render(request, 'home.html')

# Define a view function for the login page
def login_page(request):
    # Check if the HTTP request method is POST (form submission)
    if request.method == "POST":
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # Check if a user with the provided username exists
        if not User.objects.filter(username=username).exists():
            # Display an error message if the username does not exist
            messages.error(request, 'Invalid Username')
            return redirect('login_page')
        
        # Authenticate the user with the provided username and password
        user = authenticate(username=username, password=password)
        
        if user is None:
            # Display an error message if authentication fails (invalid password)
            messages.error(request, "Invalid Password")
            return redirect('login_page')
        else:
            # Log in the user and redirect to the home page upon successful login
            if user.is_staff:  # Assuming staff are employees
                # available_chats = ChatSession.objects.filter(is_active=True, employee=None).exclude(user=request.user)
                # assigned_chats = ChatSession.objects.filter(employee=request.user)
                print(user.username)
                return render(request, "home.html", {
                    "name":user
                })
            else:
                # user_chat = ChatSession.objects.filter(user=request.user).first()
                return render(request, "user.html",{"name":user})
    
    # Render the login page template (GET request)
    return render(request, 'login.html')

# Define a view function for the registration page
def register_page(request):
    # Check if the HTTP request method is POST (form submission)
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # Check if a user with the provided username already exists
        user = User.objects.filter(username=username)
        
        if user.exists():
            # Display an information message if the username is taken
            messages.info(request, "Username already taken!")
            return redirect('register')
        
        # Create a new User object with the provided information
        user = User.objects.create_user(
            first_name=first_name,
            last_name=last_name,
            username=username
        )
        
        # Set the user's password and save the user object
        user.set_password(password)
        user.save()
        
        # Display an information message indicating successful account creation
        messages.info(request, "Account created Successfully!")
        return redirect('register')
    
    # Render the registration page template (GET request)
    return render(request, 'register.html')


def logout_view(request):
    logout(request)
    return redirect('login_page')

@csrf_exempt
def validate_input(request):
    buttons = ButtonDetails.objects.filter(parent_id=0)
    child_buttons = ButtonDetails.objects.exclude(parent_id=0)
    child_buttons_list = []
    for button in child_buttons:
        child_buttons_list.append(int(button.button))
    print(child_buttons_list)
    if request.method == "POST": 
        # Get the user input from the POST data
        user_input = request.POST.get("input", "")
        print(f'{user_input} this is user input')
        check = ButtonDetails.objects.filter(name=user_input)
        for i in check:
            print(i.button)
            condition = int(i.button)
        if condition in child_buttons_list:
            print("inside correct check")
            text_data = TextDetails.objects.filter(reference_button__button=condition).values("text")

            text_list = [item["text"] for item in text_data]
            response = {
                "response": text_list,  # ✅ Send list of text messages
                "type": "html"  # ✅ Indicates response contains text
            }
            
        elif condition != 0:
            print("from child buttons")
            parent_button = ButtonDetails.objects.filter(parent_id=condition)
            print(parent_button)
            response = {
                "response": [button["name"] for button in parent_button.values("name")] ,"type":"button" # ✅ Convert to list of strings
            }
        elif "status" in user_input.lower():
            # Initialize the OpenAI client
            client = OpenAI(api_key="sk-ba261cbb6c224b708f537dc547f685f3", base_url="https://api.deepseek.com")

            # Prepare the prompt for the AI model
            prompt = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_input},
            ]

            try:
                # Send the input to the AI model and get the response
                ai_response = client.chat.completions.create(
                    model="deepseek-chat",
                    messages=prompt,
                    stream=False
                )

                # Extract the assistant's response
                ai_output = ai_response.choices[0].message["content"]
                response = {"response": ai_output}
                print(response)
            except Exception as e:
                response = {"response": f"Error: {str(e)}"}
                print(response)
        else:
            response = {"response": "The word 'validity' or 'status' was not found in your input."}

        # Return the response as JSON
        print(f"sending format of response :{response}")
        return JsonResponse(response)

    # Render the chatbot template for GET requests
    return render(request, "chatbot.html",{"buttons": buttons})


def privacy(request):
    return render(request,"privacy.html")

def chatbot_popout(request):
    buttons = ButtonDetails.objects.filter(parent_id=0)
    child_buttons = ButtonDetails.objects.exclude(parent_id=0)
    child_buttons_list = []
    for button in child_buttons:
        child_buttons_list.append(int(button.button))
    print(child_buttons_list)
    return render(request, "popoutbot.html",{"buttons": buttons}) 

def email_template_view(request):
    # data = UserInput.objects.all()
    # latest = list(data)
    # data1=latest[-1]
    # {"name":data1}
    return render(request, 'email_template.html')

def name_change_view(request):
    # data = UserInput.objects.all()
    # latest = list(data)
    # data1=latest[-1] {"name":data1}
    return render(request, 'name_change.html')


# def user_input_view(request):
#     if request.method == 'POST':
#         form = UserInputForm(request.POST)
#         if form.is_valid():
#             form.save()
#             return JsonResponse({"status": "success", "message": "Form submitted successfully!"})
#         else:
#             # Convert errors to a readable JSON format
#             errors = {field: error.get_json_data() for field, error in form.errors.items()}
#             return JsonResponse({'status': 'error', 'message': 'Invalid form data.', 'errors': errors}, status=400)
        
def submitted_datas(request):
    # data = UserInput.objects.all() {"data":data}
    return render(request,"form_details.html")

def update_name(request):
    if request.method == "POST":
        try:
            # Parse the incoming JSON data from the request body
            data = json.loads(request.body)
            new_name = data.get("name")  # Get the name from the parsed data

            if not new_name:
                return JsonResponse({"status": "error", "message": "Name cannot be empty"}, status=400)

            # Use the latest entry in the database to update the name
            # latest_entry = UserInput.objects.last()

            # if not latest_entry:
            #     return JsonResponse({"status": "error", "message": "No existing data found to update"}, status=404)

            # # Update the name and save
            # latest_entry.name = new_name
            # latest_entry.save()

            return JsonResponse({"status": "success", "message": "Name updated successfully!"})

        except json.JSONDecodeError:
            return JsonResponse({"status": "error", "message": "Invalid JSON received"}, status=400)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=400)

def update_email(request):
    if request.method == "POST":
        try:
            # Parse the incoming JSON data from the request body
            data = json.loads(request.body)
            new_email = data.get("email")  # Get the name from the parsed data

            if not new_email:
                return JsonResponse({"status": "error", "message": "Email cannot be empty"}, status=400)

            # Use the latest entry in the database to update the name
            # latest_entry = UserInput.objects.last()

            # if not latest_entry:
            #     return JsonResponse({"status": "error", "message": "No existing data found to update"}, status=404)

            # # Update the name and save
            # latest_entry.email = new_email
            # latest_entry.save()

            return JsonResponse({"status": "success", "message": "Email updated successfully!"})

        except json.JSONDecodeError:
            return JsonResponse({"status": "error", "message": "Invalid JSON received"}, status=400)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=400)

@csrf_exempt  # 🚨 Only use if CSRF token causes issues, otherwise prefer CSRF tokens
@login_required
def get_or_create_chat_room(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')

            if not user_id:
                return JsonResponse({'error': 'User ID is required'}, status=400)

            user = User.objects.get(id=user_id)
            chat_room, created = ChatRoom.objects.get_or_create(user=user, status='open')

            return JsonResponse({'chat_room_id': chat_room.id})
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def button_form_view(request):
    if request.method == "POST":
        form = ButtonDetailsForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("button_form")  # Redirect after successful submission
    else:
        form = ButtonDetailsForm()
    
    buttons = ButtonDetails.objects.all()  # Fetch all button details
    return render(request, "button_form.html", {"form": form, "buttons": buttons})


def text_form_view(request):
    if request.method == "POST":
        form = TextDetailsForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("text_form")  # Redirect after successful submission
    else:
        form = TextDetailsForm()

    texts = TextDetails.objects.filter(reference_button__parent_id=1).order_by("-id")
    return render(request, "text_form.html", {"form": form, "texts": texts})

def update_template(request):
    buttons = ButtonDetails.objects.filter(parent_id=0)
    return render(request,'updated_bot.html',{"buttons":buttons})


def employee_dashboard(request):
    return render(request, 'update_employee.html')


@csrf_exempt
def get_messages(request, room_id):
    try:
        room = ChatRoom_update.objects.get(room_id=room_id)
        messages = Message_update.objects.filter(room=room).order_by("timestamp")
        files = ChatFile.objects.filter(room_name=room_id).order_by("timestamp")  # Fetch files for the room

        # Convert messages to JSON
        messages_data = [
            {
                "content": msg.content,
                "sender": msg.sender,
                "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            }
            for msg in messages
        ]

        # Convert files to JSON
        files_data = [
            {
                "filename": os.path.basename(file.file.name),
                "file_url": file.file.url,
                "sender": file.sender,
                "timestamp": file.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            }
            for file in files
        ]

        return JsonResponse({"messages": messages_data, "files": files_data}, status=200)

    except ChatRoom_update.DoesNotExist:
        return JsonResponse({"error": "Room not found"}, status=404)

    

@csrf_exempt  # Remove in production if CSRF is handled properly
def file_upload_view(request):
    if request.method == "POST" and request.FILES.get("file"):
        uploaded_file = request.FILES["file"]
        sender_id = request.POST.get("sender")
        room_name = request.POST.get("room_name")

        # Save file in ChatFile model
        chat_file = ChatFile.objects.create(sender=sender_id, room_name=room_name, file=uploaded_file)

        return JsonResponse({"file": chat_file.file.url}, status=201)

    return JsonResponse({"error": "No file uploaded"}, status=400)

@csrf_exempt
def room_update_status(request):
    if request.method == "POST":
        id = request.POST.get("room_id")
        room = ChatRoom_update.objects.get(room_id=id)
        room.status ='completed'
        room.save()
        return JsonResponse({"status": "Success"}, status=200)

    return JsonResponse({"error": "No room updated"}, status=400)

@csrf_exempt
def save_messages(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            messages = data.get("messages", [])

            for msg in messages:
                room = ChatRoom_update.objects.get(room_id=msg["room_id"])
                Message_update.objects.create(
                    room=room,
                    content=msg["content"],
                    sender=msg["sender"]
                )

            return JsonResponse({"status": "success", "message": "Messages saved!"}, status=201)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "Invalid request"}, status=400)


def apmadmin(request):
    pending_chats = ChatRoom_update.objects.filter(status="pending")
    active_chats = ChatRoom_update.objects.filter(status="active")
    completed_chats = ChatRoom_update.objects.filter(status="completed")

    return render(request, 'apmadmin.html', {
        'pending_chats': pending_chats,
        'active_chats': active_chats,
        'completed_chats': completed_chats
    })

def fetch_chat_messages(request, room_id):
    chat_room = get_object_or_404(ChatRoom_update, room_id=room_id)
    messages = Message_update.objects.filter(room=chat_room).order_by('timestamp')

    messages_data = [
        {"sender": msg.sender, "content": msg.content, "timestamp": msg.timestamp.strftime("%Y-%m-%d %H:%M")}
        for msg in messages
    ]

    return JsonResponse({"room_id": room_id, "messages": messages_data})