from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    """Extended user model with role-based access control."""
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('radiologist', 'Radiologist'),
        ('clinician', 'Clinician'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='clinician',
        help_text='User role for access control'
    )
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

