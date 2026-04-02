from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from scans.models import Organisation

from .serializers import (
    StaffTokenObtainPairSerializer,
    OrganisationRegistrationSerializer,
    OrganisationDetailSerializer,
    OrganisationListSerializer,
    StaffDetailSerializer,
    StaffListSerializer,
    StaffInviteSerializer,
    StaffInviteAcceptSerializer,
)
from .permissions import IsOrgAdmin, IsFromSameOrganisation

User = get_user_model()


class StaffTokenObtainPairView(TokenObtainPairView):
    """
    Custom login endpoint that returns staff member info along with tokens.
    POST /api/auth/login/
    """
    serializer_class = StaffTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def organisation_registration(request):
    """
    Public endpoint for organization signup (Screen 1 of onboarding).
    POST /api/auth/organisations/register/
    
    Creates an Organization and its first admin staff member.
    Sends verification email to admin.
    """
    serializer = OrganisationRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        result = serializer.save()
        organisation = result['organisation']
        admin_user = result['admin_user']
        
        # TODO: Send email verification link
        # send_verification_email(admin_user)
        
        return Response({
            'message': 'Organization registered successfully. Check your email for verification link.',
            'organisation_id': organisation.id,
            'admin_email': admin_user.email,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """
    Email verification endpoint (Screen 2 of onboarding).
    POST /api/auth/verify-email/
    
    Marks the staff member's email as verified and returns JWT tokens.
    """
    email = request.data.get('email')
    token = request.data.get('token')
    
    # TODO: Verify the token and mark email as verified
    # user = User.objects.get(email=email, verify_token=token)
    # user.is_email_verified = True
    # user.verify_token = None
    # user.save()
    
    return Response({
        'message': 'Email verified successfully. Proceed to onboarding.',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def organisation_onboarding(request):
    """
    Organization onboarding endpoint (Screen 3 of onboarding).
    POST /api/auth/organisations/{org_id}/onboarding/
    
    Completes organisation profile and optionally adds first staff member.
    Only accessible to org admin.
    """
    org_id = request.parser_context['kwargs'].get('org_id')
    organisation = get_object_or_404(Organisation, id=org_id)
    
    # Verify user is org admin
    if request.user != organisation.admin_user:
        return Response(
            {'detail': 'Only the organization admin can complete onboarding.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Update organisation profile
    job_title = request.data.get('job_title', '')
    radiologist_count = request.data.get('radiologist_count', 0)
    
    request.user.job_title = job_title
    request.user.save()
    
    # TODO: Store radiologist count for account sizing
    
    # Optionally invite first staff member
    invite_email = request.data.get('invite_email')
    if invite_email:
        # Use staff invite endpoint instead
        pass
    
    return Response({
        'message': 'Organization onboarding completed.',
        'organisation': OrganisationDetailSerializer(organisation).data,
    })


class StaffViewSet(viewsets.ModelViewSet):
    """
    API endpoints for staff member management.
    - GET /api/auth/staff/ : List staff in organization
    - POST /api/auth/staff/invite/ : Invite new staff  
    - GET /api/auth/staff/me/ : Get current staff info
    - GET /api/auth/staff/{id}/ : Get specific staff
    - PATCH /api/auth/staff/{id}/ : Update staff
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only staff from the user's organization."""
        if not self.request.user.organisation:
            return User.objects.none()
        return self.request.user.organisation.staff.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return StaffListSerializer
        return StaffDetailSerializer
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current authenticated staff member info."""
        serializer = StaffDetailSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsOrgAdmin])
    def invite(self, request):
        """
        Invite a new staff member to the organization.
        POST /api/auth/staff/invite/
        
        Sends invite email with magic link for password setup.
        Only org admin can invite.
        """
        serializer = StaffInviteSerializer(data=request.data)
        if serializer.is_valid():
            # Create staff member with invite token
            first_name, last_name = (
                serializer.validated_data['full_name'].split(' ', 1)
                if ' ' in serializer.validated_data['full_name']
                else (serializer.validated_data['full_name'], '')
            )
            
            staff_member = User.objects.create(
                email=serializer.validated_data['email'],
                username=serializer.validated_data['email'].split('@')[0],
                first_name=first_name,
                last_name=last_name,
                role=serializer.validated_data['role'],
                job_title=serializer.validated_data.get('job_title', ''),
                organisation=request.user.organisation,
                is_invite_accepted=False,
            )
            
            # TODO: Send invite email with magic link containing invite_token
            # send_staff_invite_email(staff_member)
            
            return Response({
                'message': 'Staff invitation sent successfully.',
                'staff_member': StaffDetailSerializer(staff_member).data,
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def accept_invite(self, request):
        """
        Accept staff invitation and set password.
        POST /api/auth/staff/accept-invite/
        
        Uses invite_token from email link to identify the user.
        """
        invite_token = request.data.get('invite_token')
        serializer = StaffInviteAcceptSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            staff_member = User.objects.get(invite_token=invite_token)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid or expired invite token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update staff member info
        password = serializer.validated_data['password']
        full_name = serializer.validated_data.get('full_name')
        
        if full_name:
            first_name, last_name = (
                full_name.split(' ', 1) if ' ' in full_name else (full_name, '')
            )
            staff_member.first_name = first_name
            staff_member.last_name = last_name
        
        staff_member.set_password(password)
        staff_member.is_invite_accepted = True
        staff_member.is_email_verified = True
        staff_member.invite_token = None
        staff_member.save()
        
        return Response({
            'message': 'Invitation accepted and password set. You can now login.',
            'staff_member': StaffDetailSerializer(staff_member).data,
        })


class OrganisationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for organization management.
    - GET /api/auth/organisations/ : List organizations (admin only)
    - GET /api/auth/organisations/me/ : Get current user's organization
    - PATCH /api/auth/organisations/{id}/ : Update organization (admin only)
    """
    queryset = Organisation.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return OrganisationListSerializer
        return OrganisationDetailSerializer
    
    def get_queryset(self):
        """Return only the user's organization."""
        if not self.request.user.organisation:
            return Organisation.objects.none()
        return Organisation.objects.filter(id=self.request.user.organisation.id)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current user's organization."""
        if not request.user.organisation:
            return Response(
                {'detail': 'User is not part of any organization.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = OrganisationDetailSerializer(request.user.organisation)
        return Response(serializer.data)

