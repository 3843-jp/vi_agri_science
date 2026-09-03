from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.middleware.csrf import get_token
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from audit.utils import log_action
from .models import User, Role, Permission
from .serializers import (
    UserSerializer, UserCreateSerializer, RoleSerializer,
    PermissionSerializer, CustomTokenObtainPairSerializer,
)
from .permissions import HasPermissionCode, IsOwnerOrAdmin
from .safety import (
    active_user_ids_with_manage_users,
    would_leave_no_admin_if_user_removed,
    would_leave_no_admin_if_role_loses_manage_users,
)


def _set_refresh_cookie(response, token):
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path="/api/auth/",
    )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({
            "csrfToken": get_token(request)
        })

@method_decorator(csrf_protect, name="dispatch")
class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns access + refresh tokens plus user/role/permissions.
    Inactive users are rejected here automatically: SimpleJWT's serializer
    authenticates via Django's authenticate(), which refuses any user with
    is_active=False before a token is ever issued — no separate check
    needed, verified in accounts/tests.py."""
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh = response.data.pop("refresh")
            _set_refresh_cookie(response, refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)
        serializer = self.get_serializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response({"detail": "Token is invalid or blacklisted."}, status=401)
        response = Response(serializer.validated_data)
        rotated_refresh = response.data.pop("refresh", None)
        if rotated_refresh:
            _set_refresh_cookie(response, rotated_refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Logged out."})
        response.delete_cookie(settings.JWT_REFRESH_COOKIE_NAME, path="/api/auth/")
        return response


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
        instance = serializer.instance
        candidate_role = serializer.validated_data.get("role", instance.role)
        candidate_employee = serializer.validated_data.get("is_active_employee", instance.is_active_employee)
        currently_manages_users = instance.is_active and instance.is_active_employee and instance.has_perm_code("MANAGE_USERS")
        will_manage_users = instance.is_active and candidate_employee and (
            instance.is_superuser or bool(candidate_role and candidate_role.permissions.filter(codename="MANAGE_USERS").exists())
        )
        if currently_manages_users and not will_manage_users and len(active_user_ids_with_manage_users(exclude_user_id=instance.id)) == 0:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"role": "Cannot remove MANAGE_USERS from the last active account able to manage users."}
            )
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
