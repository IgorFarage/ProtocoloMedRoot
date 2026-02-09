from rest_framework import permissions

class IsDoctor(permissions.BasePermission):
    """
    Permite acesso apenas a usuários com role='doctor'.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'doctor')
