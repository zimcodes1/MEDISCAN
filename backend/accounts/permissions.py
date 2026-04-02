from rest_framework.permissions import BasePermission


class IsOrgAdmin(BasePermission):
    """
    Allow access only to organization admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'org_admin')


class IsRadiologist(BasePermission):
    """
    Allow access to radiologists and org admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role in ['radiologist', 'org_admin']
        )


class IsClinician(BasePermission):
    """
    Allow access to clinicians and org admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role in ['clinician', 'org_admin']
        )


class IsRadiologistOrClinician(BasePermission):
    """
    Allow access to radiologists, clinicians, and org admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role in ['radiologist', 'clinician', 'org_admin']
        )


class IsFromSameOrganisation(BasePermission):
    """
    Allow access only if the user is from the same organization as the resource.
    """
    def has_object_permission(self, request, view, obj):
        # obj should have an 'organisation' attribute
        if not hasattr(obj, 'organisation'):
            return False
        return obj.organisation == request.user.organisation


class IsOrgAdminOfOrganisation(BasePermission):
    """
    Allow access only if the user is an org admin of the organization.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role == 'org_admin'
            and request.user.is_active
        )
