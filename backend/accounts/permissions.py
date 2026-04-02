from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allow access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'admin')


class IsRadiologist(BasePermission):
    """
    Allow access to radiologists and admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role in ['radiologist', 'admin']
        )


class IsClinician(BasePermission):
    """
    Allow access to clinicians and admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role in ['clinician', 'admin']
        )


class IsRadiologistOrClinician(BasePermission):
    """
    Allow access to radiologists, clinicians, and admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.role in ['radiologist', 'clinician', 'admin']
        )
