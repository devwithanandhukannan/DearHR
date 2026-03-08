from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated


from .serializers import (
    SignupSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """POST /api/auth/signup/"""
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response({
        'status': 'success',
        'message': 'Account created successfully.',
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """POST /api/auth/login/"""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password'],
    )

    if user is None:
        return Response({
            'status': 'error',
            'message': 'Invalid username or password.',
        }, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)
    return Response({
        'status': 'success',
        'message': 'Logged in successfully.',
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """POST /api/auth/logout/"""
    logout(request)
    return Response({
        'status': 'success',
        'message': 'Logged out successfully.',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me/"""
    return Response({
        'status': 'success',
        'user': UserSerializer(request.user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """POST /api/auth/change-password/"""
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    if not request.user.check_password(serializer.validated_data['old_password']):
        return Response({
            'status': 'error',
            'message': 'Old password is incorrect.',
        }, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save()
    login(request, request.user)

    return Response({
        'status': 'success',
        'message': 'Password changed successfully.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """POST /api/auth/forgot-password/"""
    serializer = ForgotPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']
    response_data = {
        'status': 'success',
        'message': 'If an account with this email exists, a reset link has been sent.',
    }

    try:
        user = User.objects.get(email=email)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        send_mail(
            subject='Password Reset',
            message=f'UID: {uid}\nToken: {token}\n\n'
                    f'POST to /api/auth/reset-password/ with uid, token, '
                    f'new_password, new_password_confirm',
            from_email='noreply@example.com',
            recipient_list=[email],
            fail_silently=True,
        )

        if settings.DEBUG:
            response_data['debug'] = {'uid': uid, 'token': token}

    except User.DoesNotExist:
        pass

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """POST /api/auth/reset-password/"""
    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data['user']
    user.set_password(serializer.validated_data['new_password'])
    user.save()

    return Response({
        'status': 'success',
        'message': 'Password reset successfully. You can now login.',
    })