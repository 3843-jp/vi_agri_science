from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import TimeStampedModel


class Permission(TimeStampedModel):
    """
    A single granular capability, e.g. ADD_SALE, VIEW_AUDIT_LOG.
    Deliberately app-specific (not Django's built-in auth.Permission) so the
    codename list stays exactly aligned with this project's business actions
    and is easy for a reviewer to read end-to-end.
    """
    codename = models.CharField(max_length=64, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["codename"]

    def __str__(self):
        return self.codename


class Role(TimeStampedModel):
    """
    A named bundle of permissions (Owner/Admin, Manager, Staff, Viewer).
    Permissions are NEVER hard-coded to a username — every check goes
    through: User -> Role -> Permissions.
    """
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)
    permissions = models.ManyToManyField(Permission, through="RolePermission", related_name="roles")
    is_system_role = models.BooleanField(
        default=False,
        help_text="System roles (Owner/Admin, Manager, Staff, Viewer) cannot be deleted from the UI.",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class RolePermission(TimeStampedModel):
    """Join table — kept explicit (rather than a bare M2M) so grants are auditable/timestamped."""
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("role", "permission")


class User(AbstractUser):
    """
    Custom user model. Every user has exactly one Role, which determines
    every permission check performed by the backend (never the frontend).
    """
    role = models.ForeignKey(
        Role, on_delete=models.PROTECT, related_name="users", null=True, blank=True,
        help_text="Determines what this user is allowed to do. Required for any non-superuser.",
    )
    phone = models.CharField(max_length=20, blank=True)
    is_active_employee = models.BooleanField(default=True)

    def has_perm_code(self, codename: str) -> bool:
        """Central permission check used by DRF permission classes below."""
        if self.is_superuser:
            return True
        if not self.role:
            return False
        return self.role.permissions.filter(codename=codename).exists()

    def __str__(self):
        return self.username
