from django import forms
from .models import ButtonDetails, TextDetails
from django_ckeditor_5.widgets import CKEditor5Widget

class ButtonDetailsForm(forms.ModelForm):
    class Meta:
        model = ButtonDetails
        fields = ['button', 'name', 'parent_id']

class TextDetailsForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super(TextDetailsForm, self).__init__(*args, **kwargs)
        self.fields["text"].required = False
        # Filter reference_button dropdown to only show buttons with parent_id = 1
        self.fields["reference_button"].queryset = ButtonDetails.objects.exclude(parent_id=0)
        self.fields["reference_button"].label_from_instance = lambda obj: f"{obj.button} - {obj.name}"

    class Meta:
        model = TextDetails
        fields = ("text","reference_button")
        widgets = {
            "text": CKEditor5Widget(
                attrs={"class": "django_ckeditor_5"}, config_name="extends"
            )
        }