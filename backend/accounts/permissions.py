from rest_framework.permissions import BasePermission


class HasPermissionCode(BasePermission):
    """
    Generic permission class: attach `required_permission = "ADD_SALE"` (or
    similar) to a ViewSet, or `required_permission_map = {"POST": "ADD_SALE", ...}`
    for per-method codes. This is checked on EVERY request — the frontend
    hiding a button is never sufficient on its own. A user without the
    matching permission always gets HTTP 403, regardless of how the request
    was made (browsable API, curl, Postman, a modified frontend, etc).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        method_map = getattr(view, "required_permission_map", None)
        if method_map:
            required = method_map.get(request.method)
            if required is None:
                return True  # method not restricted by this map
            return request.user.has_perm_code(required)

        required = getattr(view, "required_permission", None)
        if required is None:
            return True  # view didn't opt into a permission check
        return request.user.has_perm_code(required)


class IsOwnerOrAdmin(BasePermission):
    """Restricts an action to users whose role is flagged Owner/Admin, or superusers."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return bool(user.role and user.role.name == "Owner/Admin")
