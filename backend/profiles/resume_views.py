from venv import logger
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .resume_serializers import ResumeGenerateSerializer
from .ollama_service import collect_user_data, build_prompt, generate_with_llm
from .models import PersonalInfo



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_resume_view(request):
    """Generate an ATS-optimized resume."""
    try:
        body = request.data
        job_description = body.get('job_description', '')
        customization = body.get('customization', '')
        template = body.get('template', 'modern')
        color_scheme = body.get('color_scheme', 'blue')
        font_style = body.get('font_style', 'inter')

        if not job_description.strip():
            return Response(
                {'status': 'error', 'message': 'Job description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .ollama_service import generate_resume, collect_user_data

        resume_data = generate_resume(
            user=request.user,
            job_description=job_description,
            customization=customization,
        )

        # Get the full profile image URL
        user_data = collect_user_data(request.user)
        profile_image_url = user_data.get('personal_info', {}).get('profile_image_url')
        
        # Build absolute URL for the image
        if profile_image_url:
            profile_image_url = request.build_absolute_uri(profile_image_url)
        
        # Add to personal_info in resume_data
        if 'personal_info' not in resume_data:
            resume_data['personal_info'] = user_data.get('personal_info', {})
        resume_data['personal_info']['profile_image_url'] = profile_image_url

        return Response({
            'status': 'success',
            'message': 'Resume generated successfully!',
            'resume_data': resume_data,
            'style': {
                'template': template,
                'color_scheme': color_scheme,
                'font_style': font_style,
            },
        })

    except ValueError as e:
        return Response(
            {'status': 'error', 'message': str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.exception("Resume generation error")
        return Response(
            {'status': 'error', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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