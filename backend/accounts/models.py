from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class Staff(AbstractUser):
    """
    Extended user model representing staff members in an organization.
    Staff members are users who belong to an Organization and have specific roles.
    """
    
    ROLE_CHOICES = [
        ('org_admin', 'Organization Admin'),
        ('radiologist', 'Radiologist'),
        ('clinician', 'Clinician'),
    ]
    
    # Foreign key to organization
    organisation = models.ForeignKey(
        'scans.Organisation',
        on_delete=models.CASCADE,
        related_name='staff',
        null=True,
        blank=True,
        help_text='The organization this staff member belongs to. Null only during org_admin creation.'
    )
    
    # Role within the organization
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='clinician',
        help_text='Staff role within the organization'
    )
    
    # Additional staff information
    job_title = models.CharField(
        max_length=100,
        blank=True,
        help_text='e.g., "Medical Director", "Radiologist", "Nurse"'
    )
    
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text='Contact phone number for the staff member'
    )
    
    # Invite system
    invite_token = models.UUIDField(
        default=uuid.uuid4,
        null=True,
        blank=True,
        unique=True,
        help_text='UUID token used for email-based staff invitations'
    )
    
    is_invite_accepted = models.BooleanField(
        default=False,
        help_text='Whether the staff member has accepted their invitation and set password'
    )
    
    is_email_verified = models.BooleanField(
        default=False,
        help_text='Whether the staff member has verified their email address'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Staff Member'
        verbose_name_plural = 'Staff Members'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()}) - {self.organisation.name if self.organisation else 'No Org'}"
    
    def is_org_admin(self):
        """Check if this staff member is an organization admin."""
        return self.role == 'org_admin'
    
    def is_radiologist(self):
        """Check if this staff member is a radiologist."""
        return self.role == 'radiologist'
    
    def is_clinician(self):
        """Check if this staff member is a clinician."""
        return self.role == 'clinician'


# Keep backward compatibility alias
CustomUser = Staff

