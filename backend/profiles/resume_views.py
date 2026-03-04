from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .resume_serializers import ResumeGenerateSerializer
from .ollama_service import collect_user_data, build_prompt, generate_with_llm
from .models import PersonalInfo


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_resume(request):
    """
    POST /api/resume/generate/
    Takes job description + optional customization,
    fetches user data, sends to Ollama, returns structured resume.
    """
    serializer = ResumeGenerateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    job_description = serializer.validated_data['job_description']
    customization = serializer.validated_data.get('customization', '')
    template = serializer.validated_data.get('template', 'modern')
    color_scheme = serializer.validated_data.get('color_scheme', 'blue')
    font_style = serializer.validated_data.get('font_style', 'inter')

    # Check if user has personal info at minimum
    if not PersonalInfo.objects.filter(user=request.user).exists():
        return Response({
            'status': 'error',
            'message': 'Please add your personal information first.',
        }, status=status.HTTP_400_BAD_REQUEST)

    # Collect all user data
    user_data = collect_user_data(request.user)

    # Build prompt
    prompt = build_prompt(user_data, job_description, customization)

    # Generate with Ollama
    try:
        resume_content = generate_with_llm(prompt)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        'status': 'success',
        'message': 'Resume generated successfully!',
        'resume_data': {
            'personal_info': user_data['personal_info'],
            'content': resume_content,
            'additional_links': user_data.get('additional_links', []),
        },
        'style': {
            'template': template,
            'color_scheme': color_scheme,
            'font_style': font_style,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resume_preview_data(request):
    """
    GET /api/resume/preview/
    Returns all user data for preview without AI generation.
    """
    user_data = collect_user_data(request.user)

    has_data = bool(user_data.get('personal_info'))

    return Response({
        'status': 'success',
        'has_data': has_data,
        'data': user_data,
    })