# Import necessary modules
from django.contrib import admin 
from django.urls import path,include     
from chat import views
from django.conf import settings   
from django.contrib.staticfiles.urls import staticfiles_urlpatterns 
from django.conf.urls.static import static 

urlpatterns = [
    path("channel/", views.index, name="index"),
    path("channel/<str:room_name>/", views.room, name="room"),
    path('home/', views.home, name="recipes"),     
    path("admin/", admin.site.urls),          
    path('', views.login_page, name='login_page'),   
    path('register/', views.register_page, name='register'), 
    path('logout/', views.logout_view, name='logout'), 
    path('chat-widget/',views.validate_input, name='chat_widget'),
    path('privacy/',views.privacy,name="privacy"),
    path("chat-widget/chatbot_popout/", views.chatbot_popout, name="chatbot_popout"),
    path('email-template/', views.email_template_view, name='email_template'),
    path('name_change/', views.name_change_view, name='name_change_view'),
    # path('user_input_view/', views.user_input_view, name='user_input_view'),
    path('form_datas/',views.submitted_datas,name="submitted_datas"),
    path('update_name/',views.update_name,name="update_name"),
    path('update_email/',views.update_email,name="update_email"),
    # path('send/', views.send_message),
    path('chat/get_or_create_room/', views.get_or_create_chat_room, name='get_or_create_chat_room'),
    path("button-form/", views.button_form_view, name="button_form"),
    path("text-form/", views.text_form_view, name="text_form"),
    path("ckeditor5/", include('django_ckeditor_5.urls')),
    path('updated_template/',views.update_template,name="updated"),
    path("updated_template/chatbot_popout/", views.chatbot_popout, name="chatbot_popout"),
    path('employee/', views.employee_dashboard, name='employee-dashboard'),
    path("get_messages/<str:room_id>/", views.get_messages, name="chat_room"),
    path("upload-file/", views.file_upload_view, name="upload-file"),
    path("room_update_status/",views.room_update_status,name="room_update_status"),
    path("save_messages/", views.save_messages, name="save_messages"),
    path("apmadmin",views.apmadmin,name="apmadmin"),
    path('fetch-messages/<str:room_id>/', views.fetch_chat_messages, name='fetch_chat_messages'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


urlpatterns += staticfiles_urlpatterns()