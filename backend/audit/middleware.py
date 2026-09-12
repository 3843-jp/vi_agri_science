import threading

_thread_locals = threading.local()


class AuditRequestMiddleware:
    """
    Stashes the current request's user + IP in a thread-local so the
    `log_action` helper (called from deep inside model/view logic) can
    attribute an audit entry without every function needing to thread
    `request` through its signature.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, "user", None)
        _thread_locals.ip = self._get_client_ip(request)
        try:
            response = self.get_response(request)
        finally:
            _thread_locals.user = None
            _thread_locals.ip = None
        return response

    @staticmethod
    def _get_client_ip(request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


def get_current_user():
    user = getattr(_thread_locals, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return user
    return None


def get_current_ip():
    return getattr(_thread_locals, "ip", None)
