"""
core/errors.py
--------------
Centralized, production-quality error models and response formatters for FastAPI.

Standard Error Contract:
  {
    "success": false,
    "message": "Human-readable summary of what went wrong",
    "detail": "Backward-compatible string representation for legacy clients",
    "code": "MACHINE_READABLE_ERROR_CODE",
    "errors": [
      { "field": "optional_field_name", "message": "Field-specific guidance" }
    ],
    "request_id": "req-xxxx"
  }
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ─── Machine-readable Error Codes ─────────────────────────────────────────────

STATUS_CODE_TO_ERROR_CODE: Dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "CONFLICT",
    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
    status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMIT_EXCEEDED",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    status.HTTP_502_BAD_GATEWAY: "BAD_GATEWAY",
    status.HTTP_503_SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    status.HTTP_504_GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",
}


class FieldError(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorResponseModel(BaseModel):
    success: bool = False
    message: str
    detail: str
    code: str
    errors: Optional[List[FieldError]] = None
    request_id: Optional[str] = None


# ─── Custom Domain Exceptions ─────────────────────────────────────────────────

class AppException(Exception):
    """Base application exception with status code and error code."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: Optional[str] = None,
        errors: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code or STATUS_CODE_TO_ERROR_CODE.get(status_code, "APPLICATION_ERROR")
        self.errors = errors


class NotFoundError(AppException):
    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, code="NOT_FOUND")


class ConflictError(AppException):
    def __init__(self, message: str = "A conflicting resource already exists."):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT, code="CONFLICT")


class ValidationError(AppException):
    def __init__(self, message: str, errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            errors=errors,
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required. Please log in."):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED, code="UNAUTHORIZED")


class ForbiddenError(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN, code="FORBIDDEN")


# ─── Standardized JSON Error Response Formatter ───────────────────────────────

def format_error_response(
    status_code: int,
    message: str,
    code: Optional[str] = None,
    errors: Optional[List[Dict[str, Any]]] = None,
    request_id: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
) -> JSONResponse:
    """Constructs a JSONResponse conforming to the application error contract."""
    error_code = code or STATUS_CODE_TO_ERROR_CODE.get(status_code, "UNKNOWN_ERROR")
    content = {
        "success": False,
        "message": message,
        "detail": message,  # Retained for 100% backward compatibility
        "code": error_code,
        "request_id": request_id,
    }
    if errors:
        content["errors"] = errors

    resp_headers = headers or {}
    if request_id:
        resp_headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=resp_headers,
    )


# ─── FastAPI Exception Handlers Registration ─────────────────────────────────

def register_error_handlers(app: Any) -> None:
    """Registers centralized exception handlers on the FastAPI application instance."""
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        req_id = getattr(request.state, "request_id", None)
        logger.warning(
            "AppException [%s] %s on %s %s [req_id=%s]",
            exc.code, exc.message, request.method, request.url.path, req_id,
        )
        return format_error_response(
            status_code=exc.status_code,
            message=exc.message,
            code=exc.code,
            errors=exc.errors,
            request_id=req_id,
        )

    # Optional handling of domain-specific RegistrationError if present
    try:
        from registrations.validators import RegistrationError

        @app.exception_handler(RegistrationError)
        async def registration_error_handler(request: Request, exc: RegistrationError):
            req_id = getattr(request.state, "request_id", None)
            logger.warning(
                "RegistrationError: %s on %s %s [req_id=%s]",
                exc.message, request.method, request.url.path, req_id,
            )
            return format_error_response(
                status_code=exc.status_code,
                message=exc.message,
                code="REGISTRATION_ERROR",
                request_id=req_id,
            )
    except ImportError:
        pass

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = getattr(request.state, "request_id", None)
        errors: List[Dict[str, Any]] = []
        first_error_msg = None

        for err in exc.errors():
            loc = err.get("loc", [])
            # Filter out 'body' prefix for cleaner frontend field mapping
            field_parts = [str(part) for part in loc if part != "body"]
            field = ".".join(field_parts) if field_parts else None
            msg = err.get("msg", "Invalid value")
            errors.append({"field": field, "message": msg})
            if not first_error_msg:
                first_error_msg = f"{field}: {msg}" if field else msg

        summary = (
            f"Validation failed: {first_error_msg}"
            if first_error_msg
            else "Invalid request parameters provided."
        )

        logger.warning(
            "Validation error on %s %s [req_id=%s]: %s",
            request.method, request.url.path, req_id, errors,
        )
        return format_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=summary,
            code="VALIDATION_ERROR",
            errors=errors,
            request_id=req_id,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        req_id = getattr(request.state, "request_id", None)
        errors: Optional[List[Dict[str, Any]]] = None

        if isinstance(exc.detail, str):
            message = exc.detail
        elif isinstance(exc.detail, list):
            message = "Validation or processing error"
            errors = [{"message": str(item)} for item in exc.detail]
        elif isinstance(exc.detail, dict):
            message = str(exc.detail.get("message") or exc.detail.get("detail") or "Request failed")
            errors = exc.detail.get("errors")
        else:
            message = str(exc.detail) if exc.detail else "Request failed"

        code = STATUS_CODE_TO_ERROR_CODE.get(exc.status_code, "HTTP_ERROR")

        if exc.status_code >= 500:
            logger.error(
                "HTTP %s on %s %s [req_id=%s]: %s",
                exc.status_code, request.method, request.url.path, req_id, message,
            )
        else:
            logger.info(
                "HTTP %s on %s %s [req_id=%s]: %s",
                exc.status_code, request.method, request.url.path, req_id, message,
            )

        return format_error_response(
            status_code=exc.status_code,
            message=message,
            code=code,
            errors=errors,
            request_id=req_id,
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", None)
        logger.exception(
            "Unhandled server exception on %s %s [req_id=%s]: %s",
            request.method, request.url.path, req_id, exc,
        )
        return format_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected server error occurred. Please try again later.",
            code="INTERNAL_SERVER_ERROR",
            request_id=req_id,
        )

