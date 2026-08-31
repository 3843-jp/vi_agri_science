from .models import AuditLog
from .middleware import get_current_user, get_current_ip


def log_action(action: str, entity_type: str, entity_id, old_value=None, new_value=None, reason: str = "", user=None):
    """
    Write one immutable audit row. Call this from views/services right after
    a create/update/cancel/reverse — never batch it, never make it optional
    for financial actions (sales, payments, stock, expenses).

    IMPORTANT: pass `user=request.user` explicitly from DRF views. JWT
    authentication happens inside DRF's view dispatch, which runs AFTER
    Django's middleware layer — so the thread-local captured by
    AuditRequestMiddleware only reliably reflects session-authenticated
    users (e.g. the Django admin), not JWT API requests. The explicit
    `user` argument is the correct source of truth for API calls; the
    thread-local is kept only as a fallback for non-request contexts.
    """
    resolved_user = user if user is not None and getattr(user, "is_authenticated", False) else get_current_user()
    AuditLog.objects.create(
        user=resolved_user,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        ip_address=get_current_ip(),
    )
