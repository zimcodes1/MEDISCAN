from django.db import models


class Organisation(models.Model):
    """
    Represents an organization (hospital, clinic, diagnostic center, etc.)
    that uses the MediScan platform. This is the primary account/billing unit.
    """
    
    ORG_TYPE_CHOICES = [
        ('hospital', 'Hospital'),
        ('diagnostic_centre', 'Diagnostic Centre'),
        ('clinic', 'Clinic'),
        ('telemedicine', 'Telemedicine Platform'),
        ('other', 'Other'),
    ]
    
    STATE_CHOICES = [
        # All 36 Nigerian states + FCT
        ('abia', 'Abia'),
        ('adamawa', 'Adamawa'),
        ('akwa_ibom', 'Akwa Ibom'),
        ('anambra', 'Anambra'),
        ('bauchi', 'Bauchi'),
        ('bayelsa', 'Bayelsa'),
        ('borno', 'Borno'),
        ('cross_river', 'Cross River'),
        ('delta', 'Delta'),
        ('ebonyi', 'Ebonyi'),
        ('edo', 'Edo'),
        ('ekiti', 'Ekiti'),
        ('enugu', 'Enugu'),
        ('fct', 'Federal Capital Territory'),
        ('gombe', 'Gombe'),
        ('imo', 'Imo'),
        ('jigawa', 'Jigawa'),
        ('kaduna', 'Kaduna'),
        ('kano', 'Kano'),
        ('katsina', 'Katsina'),
        ('kebbi', 'Kebbi'),
        ('kogi', 'Kogi'),
        ('kwara', 'Kwara'),
        ('lagos', 'Lagos'),
        ('nasarawa', 'Nasarawa'),
        ('niger', 'Niger'),
        ('ogun', 'Ogun'),
        ('ondo', 'Ondo'),
        ('osun', 'Osun'),
        ('oyo', 'Oyo'),
        ('plateau', 'Plateau'),
        ('rivers', 'Rivers'),
        ('sokoto', 'Sokoto'),
        ('taraba', 'Taraba'),
        ('yobe', 'Yobe'),
        ('zamfara', 'Zamfara'),
    ]
    
    name = models.CharField(
        max_length=255,
        help_text='Official name of the organization. e.g., "Maiduguri Specialist Hospital"'
    )
    
    org_type = models.CharField(
        max_length=50,
        choices=ORG_TYPE_CHOICES,
        help_text='Type of healthcare facility'
    )
    
    state = models.CharField(
        max_length=50,
        choices=STATE_CHOICES,
        help_text='Nigerian state where the organization is located'
    )
    
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text='Organization contact phone number. Used for account recovery and billing inquiries.'
    )
    
    logo = models.ImageField(
        upload_to='org_logos/',
        null=True,
        blank=True,
        help_text='Organization logo displayed in dashboard header'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this organization can access MediScan services'
    )
    
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free Trial'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free',
        help_text='Current subscription tier'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'
    
    def __str__(self):
        return f"{self.name} ({self.get_state_display()})"
    
    @property
    def admin_user(self):
        """Shortcut to get the organization admin."""
        return self.staff.filter(role='org_admin').first()
    
    @property
    def staff_count(self):
        """Count of active staff members in this organization."""
        return self.staff.filter(is_active=True).count()
    
    @property
    def radiologist_count(self):
        """Count of radiologists in this organization."""
        return self.staff.filter(role='radiologist', is_active=True).count()
