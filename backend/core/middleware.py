import secrets
import logging
from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from core.errors import format_error_response

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Assigns or preserves a unique X-Request-ID for every incoming HTTP request.
    Attaches the ID to `request.state.request_id` and adds it to the outgoing response headers.
    Catches any unhandled exceptions escaping downstream handlers to guarantee a safe 500 response.
    """
    HEADER_NAME = "X-Request-ID"

    async def dispatch(self, request: Request, call_next):
        incoming_id = request.headers.get(self.HEADER_NAME) or request.headers.get("X-Correlation-ID")
        if incoming_id and len(incoming_id) <= 64 and incoming_id.replace("-", "").isalnum():
            request_id = incoming_id
        else:
            request_id = f"req-{secrets.token_hex(6)}"

        request.state.request_id = request_id

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.exception(
                "Unhandled exception captured by RequestIDMiddleware on %s %s [req_id=%s]: %s",
                request.method, request.url.path, request_id, exc,
            )
            return format_error_response(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="An unexpected server error occurred. Please try again later.",
                code="INTERNAL_SERVER_ERROR",
                request_id=request_id,
            )

        response.headers[self.HEADER_NAME] = request_id
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_upload_size: int = 50 * 1024 * 1024):  # Default 50MB
        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > self.max_upload_size:
                        req_id = getattr(request.state, "request_id", None)
                        return format_error_response(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            message=f"Request body exceeds the maximum permitted size of {self.max_upload_size // (1024 * 1024)}MB.",
                            code="PAYLOAD_TOO_LARGE",
                            request_id=req_id,
                        )
                except ValueError:
                    pass
        return await call_next(request)
