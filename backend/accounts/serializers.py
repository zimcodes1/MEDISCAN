from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from scans.models import Organisation

User = get_user_model()


class OrganisationListSerializer(serializers.ModelSerializer):
    """Serializer for listing organizations."""
    admin_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Organisation
        fields = ('id', 'name', 'org_type', 'state', 'logo', 'subscription_tier', 'created_at', 'admin_user', 'staff_count')
        read_only_fields = fields
    
    def get_admin_user(self, obj):
        admin = obj.admin_user
        if admin:
            return {
                'id': admin.id,
                'name': admin.get_full_name(),
                'email': admin.email,
            }
        return None


class OrganisationDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed organization view."""
    admin_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Organisation
        fields = ('id', 'name', 'org_type', 'state', 'phone', 'logo', 'is_active', 'subscription_tier', 'staff_count', 'radiologist_count', 'created_at', 'updated_at', 'admin_user')
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_admin_user(self, obj):
        admin = obj.admin_user
        if admin:
            return {
                'id': admin.id,
                'name': admin.get_full_name(),
                'email': admin.email,
            }
        return None


class OrganisationRegistrationSerializer(serializers.Serializer):
    """Serializer for organization registration (public-facing signup)."""
    # Organization details
    organisation_name = serializers.CharField(max_length=255, required=True)
    organisation_type = serializers.ChoiceField(choices=Organisation.ORG_TYPE_CHOICES, required=True)
    state = serializers.ChoiceField(choices=Organisation.STATE_CHOICES, required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Admin user details
    admin_email = serializers.EmailField(required=True)
    admin_full_name = serializers.CharField(max_length=150, required=True)
    admin_job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Password
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        label='Confirm password'
    )
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        
        if User.objects.filter(email=attrs['admin_email']).exists():
            raise serializers.ValidationError({
                "admin_email": "An account with this email already exists."
            })
        
        return attrs
    
    def create(self, validated_data):
        # Extract admin user data
        password = validated_data.pop('password')
        validated_data.pop('password2')
        
        admin_email = validated_data.pop('admin_email')
        admin_full_name = validated_data.pop('admin_full_name')
        admin_job_title = validated_data.pop('admin_job_title', '')
        
        # Extract organization data
        org_data = {
            'name': validated_data.pop('organisation_name'),
            'org_type': validated_data.pop('organisation_type'),
            'state': validated_data.pop('state'),
            'phone': validated_data.pop('phone', ''),
        }
        
        # Create organization
        organisation = Organisation.objects.create(**org_data)
        
        # Create admin user
        first_name, last_name = (admin_full_name.split(' ', 1) if ' ' in admin_full_name else (admin_full_name, ''))
        
        admin_user = User.objects.create_user(
            email=admin_email,
            username=admin_email.split('@')[0],  # Use email prefix as username
            first_name=first_name,
            last_name=last_name,
            password=password,
            role='org_admin',
            organisation=organisation,
            job_title=admin_job_title,
            is_email_verified=False,  # Will be verified via email link
        )
        
        return {
            'organisation': organisation,
            'admin_user': admin_user,
        }


class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer for staff members that includes organization info."""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        token['organisation_id'] = user.organisation.id if user.organisation else None
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user info to response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'job_title': self.user.job_title,
            'organisation': {
                'id': self.user.organisation.id,
                'name': self.user.organisation.name,
                'logo': self.user.organisation.logo.url if self.user.organisation.logo else None,
            } if self.user.organisation else None,
        }
        return data


class StaffRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for staff member registration (usually via invite)."""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        label='Confirm password'
    )
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'job_title', 'password', 'password2', 'phone')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class StaffDetailSerializer(serializers.ModelSerializer):
    """Serializer for staff member profile details."""
    organisation = OrganisationListSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'job_title', 'phone', 'organisation', 'is_active', 'is_email_verified', 'is_invite_accepted')
        read_only_fields = ('id', 'username', 'role', 'organisation')


class StaffListSerializer(serializers.ModelSerializer):
    """Serializer for listing staff members."""
    organisation_name = serializers.CharField(source='organisation.name', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'job_title', 'organisation_name', 'is_active', 'created_at')
        read_only_fields = fields


class StaffInviteSerializer(serializers.Serializer):
    """Serializer for inviting a staff member to an organization."""
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(choices=[('radiologist', 'Radiologist'), ('clinician', 'Clinician')], required=True)
    full_name = serializers.CharField(max_length=150, required=True)
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    def validate(self, attrs):
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                "email": "A user with this email already exists."
            })
        return attrs


class StaffInviteAcceptSerializer(serializers.Serializer):
    """Serializer for accepting a staff invitation and setting password."""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        label='Confirm password'
    )
    full_name = serializers.CharField(max_length=150, required=False)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users."""
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role')
