import os

from rest_framework.decorators import (
    api_view,
    permission_classes,
    parser_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import (
    PersonalInfo,
    AdditionalLink,
    Education,
    Experience,
    Skill,
    Project,
    Certification,
    Achievement,
)
from .serializers import (
    PersonalInfoSerializer,
    AdditionalLinkSerializer,
    EducationSerializer,
    ExperienceSerializer,
    SkillSerializer,
    ProjectSerializer,
    CertificationSerializer,
    AchievementSerializer,
)

# ──────────────────────────────────────────────
# DASHBOARD
# ──────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """GET /api/dashboard/ — overview counts"""
    user = request.user
    return Response({
        'status': 'success',
        'data': {
            'has_personal_info': PersonalInfo.objects.filter(user=user).exists(),
            'additional_links_count': AdditionalLink.objects.filter(user=user).count(),
            'education_count': Education.objects.filter(user=user).count(),
            'experience_count': Experience.objects.filter(user=user).count(),
            'skills_count': Skill.objects.filter(user=user).count(),
            'projects_count': Project.objects.filter(user=user).count(),
            'certifications_count': Certification.objects.filter(user=user).count(),
            'achievements_count': Achievement.objects.filter(user=user).count(),
        }
    })


# ──────────────────────────────────────────────
# PERSONAL INFO (One-to-One)
# ──────────────────────────────────────────────
@api_view(['GET', 'POST', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def personal_info(request):
    """
    GET   — retrieve
    POST  — create (first time)
    PUT   — full update
    PATCH — partial update

    Accepts both JSON and multipart/form-data (for image uploads).
    """
    user = request.user

    if request.method == 'GET':
        try:
            obj = PersonalInfo.objects.get(user=user)
            serializer = PersonalInfoSerializer(
                obj, context={'request': request}
            )
            return Response({
                'status': 'success',
                'data': serializer.data,
            })
        except PersonalInfo.DoesNotExist:
            return Response({
                'status': 'success',
                'data': None,
                'message': 'Personal info not set yet.',
            })

    if request.method == 'POST':
        if PersonalInfo.objects.filter(user=user).exists():
            return Response({
                'status': 'error',
                'message': 'Already exists. Use PUT or PATCH to update.',
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = PersonalInfoSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)
        return Response({
            'status': 'success',
            'message': 'Personal info created.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)

    # PUT or PATCH
    try:
        obj = PersonalInfo.objects.get(user=user)
    except PersonalInfo.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Not found. Use POST to create first.',
        }, status=status.HTTP_404_NOT_FOUND)

    partial = request.method == 'PATCH'
    serializer = PersonalInfoSerializer(
        obj, data=request.data, partial=partial,
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({
        'status': 'success',
        'message': 'Personal info updated.',
        'data': serializer.data,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_profile_image(request):
    """Remove profile image without deleting other personal info."""
    try:
        obj = PersonalInfo.objects.get(user=request.user)
    except PersonalInfo.DoesNotExist:
        return Response(
            {'status': 'error', 'message': 'Personal info not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if obj.profile_image:
        # Delete the file from disk
        import os
        if os.path.isfile(obj.profile_image.path):
            os.remove(obj.profile_image.path)
        obj.profile_image = None
        obj.save()

    return Response({
        'status': 'success',
        'message': 'Profile image removed.',
    })

# ──────────────────────────────────────────────
# GENERIC HELPERS for Many-to-One models
# ──────────────────────────────────────────────
def _list_create(request, model, serializer_class, item_name):
    """Handle GET (list) and POST (create) for any Many-to-One model."""
    user = request.user

    if request.method == 'GET':
        qs = model.objects.filter(user=user)
        return Response({
            'status': 'success',
            'count': qs.count(),
            'data': serializer_class(qs, many=True).data,
        })

    # POST
    serializer = serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(user=user)
    return Response({
        'status': 'success',
        'message': f'{item_name} created.',
        'data': serializer.data,
    }, status=status.HTTP_201_CREATED)


def _detail(request, pk, model, serializer_class, item_name):
    """Handle GET, PUT, PATCH, DELETE for a single object."""
    obj = get_object_or_404(model, pk=pk, user=request.user)

    if request.method == 'GET':
        return Response({
            'status': 'success',
            'data': serializer_class(obj).data,
        })

    if request.method == 'DELETE':
        obj.delete()
        return Response({
            'status': 'success',
            'message': f'{item_name} deleted.',
        })

    # PUT or PATCH
    partial = request.method == 'PATCH'
    serializer = serializer_class(obj, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({
        'status': 'success',
        'message': f'{item_name} updated.',
        'data': serializer.data,
    })


# ──────────────────────────────────────────────
# ADDITIONAL LINKS
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def additional_link_list(request):
    return _list_create(request, AdditionalLink, AdditionalLinkSerializer, 'Link')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def additional_link_detail(request, pk):
    return _detail(request, pk, AdditionalLink, AdditionalLinkSerializer, 'Link')


# ──────────────────────────────────────────────
# EDUCATION
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def education_list(request):
    return _list_create(request, Education, EducationSerializer, 'Education')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def education_detail(request, pk):
    return _detail(request, pk, Education, EducationSerializer, 'Education')


# ──────────────────────────────────────────────
# EXPERIENCE
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def experience_list(request):
    return _list_create(request, Experience, ExperienceSerializer, 'Experience')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def experience_detail(request, pk):
    return _detail(request, pk, Experience, ExperienceSerializer, 'Experience')


# ──────────────────────────────────────────────
# SKILLS
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def skill_list(request):
    return _list_create(request, Skill, SkillSerializer, 'Skill')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def skill_detail(request, pk):
    return _detail(request, pk, Skill, SkillSerializer, 'Skill')


# ──────────────────────────────────────────────
# PROJECTS
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def project_list(request):
    return _list_create(request, Project, ProjectSerializer, 'Project')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    return _detail(request, pk, Project, ProjectSerializer, 'Project')


# ──────────────────────────────────────────────
# CERTIFICATIONS
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def certification_list(request):
    return _list_create(request, Certification, CertificationSerializer, 'Certification')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def certification_detail(request, pk):
    return _detail(request, pk, Certification, CertificationSerializer, 'Certification')


# ──────────────────────────────────────────────
# ACHIEVEMENTS
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def achievement_list(request):
    return _list_create(request, Achievement, AchievementSerializer, 'Achievement')


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def achievement_detail(request, pk):
    return _detail(request, pk, Achievement, AchievementSerializer, 'Achievement')