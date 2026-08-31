import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("django")


def custom_exception_handler(exc, context):
    """
    Ensures the frontend NEVER sees a raw Python/Django stack trace.
    Technical details are logged server-side; the client gets a clean,
    consistent error shape it can render safely.
    """
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "error": True,
            "detail": response.data.get("detail", response.data) if isinstance(response.data, dict) else response.data,
            "status_code": response.status_code,
        }
        return response

    # Unhandled exception (500) — log full detail, return a generic message.
    logger.exception("Unhandled exception in request: %s", context.get("request"))
    return Response(
        {"error": True, "detail": "Something went wrong. Please try again.", "status_code": 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
