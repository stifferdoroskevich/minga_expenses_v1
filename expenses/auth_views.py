from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from rest_framework import status


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login endpoint that returns a token for authentication.

    POST /api/auth/login/
    {
        "username": "your_username",
        "password": "your_password"
    }
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Please provide both username and password'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)

    if not user:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Get or create token for user
    token, created = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user_id': user.pk,
        'username': user.username,
        'email': user.email
    })


@api_view(['POST'])
def logout(request):
    """
    Logout endpoint that deletes the user's token.

    POST /api/auth/logout/
    Requires: Authorization: Token <your_token>
    """
    try:
        # Delete the user's token
        request.user.auth_token.delete()
        return Response({'message': 'Successfully logged out'})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def user_info(request):
    """
    Get current user information.

    GET /api/auth/user/
    Requires: Authorization: Token <your_token>
    """
    user = request.user
    return Response({
        'user_id': user.pk,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
    })
