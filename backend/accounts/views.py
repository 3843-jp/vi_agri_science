from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.utils import log_action
from .models import User, Role, Permission
from .serializers import (
    UserSerializer, UserCreateSerializer, RoleSerializer,
    PermissionSerializer, CustomTokenObtainPairSerializer,
)
from .permissions import HasPermissionCode, IsOwnerOrAdmin
from .safety import would_leave_no_admin_if_user_removed, would_leave_no_admin_if_role_loses_manage_users


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns access + refresh tokens plus user/role/permissions.
    Inactive users are rejected here automatically: SimpleJWT's serializer
    authenticates via Django's authenticate(), which refuses any user with
    is_active=False before a token is ever issued — no separate check
    needed, verified in accounts/tests.py."""
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/auth/me/ — the logged-in user's own profile + permissions.
    Frontend uses this to decide what to render; backend still re-checks
    permissions independently on every write."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for users. Restricted to Owner/Admin (MANAGE_USERS) —
    ordinary staff must never be able to create or edit accounts.
    """
    queryset = User.objects.select_related("role").all().order_by("username")
    permission_classes = [IsAuthenticated, HasPermissionCode]
    required_permission_map = {
        "GET": "MANAGE_USERS",
        "POST": "MANAGE_USERS",
        "PUT": "MANAGE_USERS",
        "PATCH": "MANAGE_USERS",
        "DELETE": "MANAGE_USERS",
    }
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["role", "is_active_employee"]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action("CREATE_USER", "User", instance.id, new_value=UserSerializer(instance).data, user=self.request.user)

    def perform_update(self, serializer):
        old = UserSerializer(serializer.instance).data
        instance = serializer.save()
        log_action("UPDATE_USER", "User", instance.id, old_value=old, new_value=UserSerializer(instance).data, user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if would_leave_no_admin_if_user_removed(instance):
            return Response(
                {"error": True, "detail": "Cannot deactivate this user: they are the last account able to manage users. Assign MANAGE_USERS to another active user first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        # Never hard-delete a user account that may own historical records —
        # deactivate instead, preserving referential integrity and audit trail.
        instance.is_active = False
        instance.is_active_employee = False
        instance.save()
        log_action("DEACTIVATE_USER", "User", instance.id, user=self.request.user)

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        """POST /api/users/{id}/reactivate/ — requires MANAGE_USERS.
        The account can log in again; nothing about their historical
        sales/payments/audit entries ever changed while deactivated."""
        if not request.user.has_perm_code("MANAGE_USERS"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        instance.is_active = True
        instance.is_active_employee = True
        instance.save()
        log_action("REACTIVATE_USER", "User", instance.id, user=request.user)
        return Response(UserSerializer(instance).data)


class RoleViewSet(viewsets.ModelViewSet):
    """Full CRUD for roles and their permission assignments. MANAGE_ROLES only."""
    queryset = Role.objects.prefetch_related("permissions").all().order_by("name")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, HasPermissionCode]
    required_permission_map = {
        "GET": "MANAGE_ROLES",
        "POST": "MANAGE_ROLES",
        "PUT": "MANAGE_ROLES",
        "PATCH": "MANAGE_ROLES",
        "DELETE": "MANAGE_ROLES",
    }

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action("CREATE_ROLE", "Role", instance.id, new_value=RoleSerializer(instance).data, user=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        codes = request.data.get("permission_codes")
        if codes is not None and "MANAGE_USERS" not in codes and "MANAGE_USERS" in instance.permissions.values_list("codename", flat=True):
            if would_leave_no_admin_if_role_loses_manage_users(instance):
                return Response(
                    {"error": True, "detail": "Cannot remove MANAGE_USERS from this role: every active user with that access holds it only through this role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        old = RoleSerializer(serializer.instance).data
        instance = serializer.save()
        log_action("UPDATE_ROLE", "Role", instance.id, old_value=old, new_value=RoleSerializer(instance).data, user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_role:
            return Response(
                {"error": True, "detail": "System roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class PermissionListView(APIView):
    """GET /api/permissions/ — read-only catalog, used to build the
    role-editor checklist in the frontend."""
    permission_classes = [IsAuthenticated, HasPermissionCode]
    required_permission = "MANAGE_ROLES"

    def get(self, request):
        perms = Permission.objects.all()
        return Response(PermissionSerializer(perms, many=True).data)
