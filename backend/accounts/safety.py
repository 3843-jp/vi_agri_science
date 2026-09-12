"""
Section 19 safety rules: the system must never be left with zero users
capable of managing users. This is checked BEFORE a deactivation or a
role-permission change is committed, not after.

Deliberately narrow in scope: this only protects MANAGE_USERS access
(the permission needed to fix any other access problem by hand), not
every individual permission — protecting every permission independently
would be a much bigger, more fragile rule for marginal benefit, since
MANAGE_USERS is the one permission that can always recover any other
misconfiguration.
"""
from .models import User


def active_user_ids_with_manage_users(exclude_user_id=None):
    """Returns the set of currently-active user IDs that have MANAGE_USERS
    access (via superuser flag or role), optionally excluding one user —
    used to answer "if I remove X, does anyone still have this access?"."""
    qs = User.objects.filter(is_active=True, is_active_employee=True)
    if exclude_user_id is not None:
        qs = qs.exclude(id=exclude_user_id)

    ids = set(qs.filter(is_superuser=True).values_list("id", flat=True))
    ids |= set(
        qs.filter(role__permissions__codename="MANAGE_USERS").values_list("id", flat=True)
    )
    return ids


def would_leave_no_admin_if_user_removed(user) -> bool:
    """True if deactivating/removing this specific user would leave the
    system with nobody able to manage users."""
    if not (user.is_superuser or user.has_perm_code("MANAGE_USERS")):
        return False  # this user isn't a source of that access anyway
    return len(active_user_ids_with_manage_users(exclude_user_id=user.id)) == 0


def would_leave_no_admin_if_role_loses_manage_users(role) -> bool:
    """
    True if removing MANAGE_USERS from `role` would leave the system with
    nobody able to manage users — i.e. every active user who currently has
    MANAGE_USERS gets it ONLY through this specific role (not superuser,
    not a different role).
    """
    active_users_with_access = User.objects.filter(
        is_active=True, is_active_employee=True,
    ).filter(is_superuser=True).exists() or User.objects.filter(
        is_active=True, is_active_employee=True,
    ).exclude(role=role).filter(role__permissions__codename="MANAGE_USERS").exists()
    return not active_users_with_access
