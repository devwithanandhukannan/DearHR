from rest_framework import serializers


class ResumeGenerateSerializer(serializers.Serializer):
    """Input for resume generation."""
    job_description = serializers.CharField(
        required=True,
        min_length=10,
        help_text='Paste the job description here',
    )
    customization = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text='Optional: Any specific instructions for customization',
    )
    template = serializers.ChoiceField(
        choices=[
            ('classic', 'Classic'),
            ('modern', 'Modern'),
            ('minimal', 'Minimal'),
            ('executive', 'Executive'),
        ],
        default='modern',
        required=False,
    )
    color_scheme = serializers.ChoiceField(
        choices=[
            ('blue', 'Blue'),
            ('green', 'Green'),
            ('red', 'Red'),
            ('purple', 'Purple'),
            ('dark', 'Dark'),
            ('teal', 'Teal'),
        ],
        default='blue',
        required=False,
    )
    font_style = serializers.ChoiceField(
        choices=[
            ('inter', 'Inter'),
            ('georgia', 'Georgia'),
            ('roboto', 'Roboto'),
            ('merriweather', 'Merriweather'),
        ],
        default='inter',
        required=False,
    )


class ResumeResponseSerializer(serializers.Serializer):
    """Output after resume generation."""
    status = serializers.CharField()
    message = serializers.CharField()
    resume_data = serializers.DictField()
    style = serializers.DictField()