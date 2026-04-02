from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    StaffTokenObtainPairView,
    organisation_registration,
    verify_email,
    organisation_onboarding,
    StaffViewSet,
    OrganisationViewSet,
)

router = DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'organisations', OrganisationViewSet, basename='organisation')

urlpatterns = [
    # Authentication endpoints
    path('login/', StaffTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Organization signup flow (public)
    path('organisations/register/', organisation_registration, name='organisation_register'),
    path('verify-email/', verify_email, name='verify_email'),
    path('organisations/<int:org_id>/onboarding/', organisation_onboarding, name='organisation_onboarding'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
