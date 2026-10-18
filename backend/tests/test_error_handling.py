"""
test_error_handling.py
----------------------
Unit and integration tests for the centralized error handling architecture,
request correlation IDs, safe error responses, and health check endpoints.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from core.errors import (
    register_error_handlers,
    AppException,
    NotFoundError,
    ConflictError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
)
from core.middleware import RequestIDMiddleware


# ─── Test Fixture App ─────────────────────────────────────────────────────────

class SamplePayload(BaseModel):
    name: str = Field(..., min_length=2)
    email: str


@pytest.fixture
def error_test_app():
    app = FastAPI()
    register_error_handlers(app)
    app.add_middleware(RequestIDMiddleware)

    @app.get("/health")
    @app.get("/api/health")
    async def health_endpoint():
        return {"status": "ok", "version": "1.0.0"}

    @app.get("/test/http-error")
    async def trigger_http_error():
        raise HTTPException(status_code=404, detail="Resource not found in system")

    @app.get("/test/app-error")
    async def trigger_app_error():
        raise NotFoundError("The specified club event does not exist.")

    @app.get("/test/conflict-error")
    async def trigger_conflict():
        raise ConflictError("You have already registered for this event.")

    @app.post("/test/validation")
    async def trigger_validation(payload: SamplePayload):
        return {"received": payload.name}

    @app.get("/test/unhandled")
    async def trigger_unhandled():
        # Deliberate unexpected exception
        raise ZeroDivisionError("database secret division error")

    return app


@pytest.mark.asyncio
async def test_request_id_generated_and_propagated(error_test_app):
    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Without incoming header
        res1 = await client.get("/health")
        assert res1.status_code == 200
        req_id1 = res1.headers.get("X-Request-ID")
        assert req_id1 is not None
        assert req_id1.startswith("req-")

        # With incoming header
        custom_id = "client-trace-12345"
        res2 = await client.get("/health", headers={"X-Request-ID": custom_id})
        assert res2.status_code == 200
        assert res2.headers.get("X-Request-ID") == custom_id


@pytest.mark.asyncio
async def test_http_exception_standard_format(error_test_app):
    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/test/http-error")
        assert res.status_code == 404
        data = res.json()
        assert data["success"] is False
        assert data["message"] == "Resource not found in system"
        assert data["detail"] == "Resource not found in system"
        assert data["code"] == "NOT_FOUND"
        assert "request_id" in data
        assert res.headers.get("X-Request-ID") == data["request_id"]


@pytest.mark.asyncio
async def test_app_exception_standard_format(error_test_app):
    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/test/app-error")
        assert res.status_code == 404
        data = res.json()
        assert data["success"] is False
        assert data["code"] == "NOT_FOUND"
        assert data["message"] == "The specified club event does not exist."

        res_conflict = await client.get("/test/conflict-error")
        assert res_conflict.status_code == 409
        conflict_data = res_conflict.json()
        assert conflict_data["code"] == "CONFLICT"
        assert conflict_data["message"] == "You have already registered for this event."


@pytest.mark.asyncio
async def test_validation_error_structured_fields_no_object_object(error_test_app):
    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Send empty body
        res = await client.post("/test/validation", json={})
        assert res.status_code == 422
        data = res.json()
        assert data["success"] is False
        assert data["code"] == "VALIDATION_ERROR"
        assert isinstance(data["message"], str)
        assert "[object Object]" not in data["message"]
        assert isinstance(data["detail"], str)
        assert "[object Object]" not in data["detail"]
        assert "errors" in data
        assert isinstance(data["errors"], list)
        assert len(data["errors"]) >= 1

        fields = [err.get("field") for err in data["errors"]]
        assert "name" in fields or "email" in fields


@pytest.mark.asyncio
async def test_unhandled_exception_safe_masking_no_stacktrace_leak(error_test_app):
    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/test/unhandled")
        assert res.status_code == 500
        data = res.json()
        assert data["success"] is False
        assert data["code"] == "INTERNAL_SERVER_ERROR"
        assert "secret" not in data["message"].lower()
        assert "ZeroDivisionError" not in data["message"]
        assert data["message"] == "An unexpected server error occurred. Please try again later."
        assert data["detail"] == data["message"]
        assert data["request_id"] is not None


@pytest.mark.asyncio
async def test_live_app_health_and_not_found():
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # /health
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "X-Request-ID" in res.headers

        # /api/health
        res_api = await client.get("/api/health")
        assert res_api.status_code == 200
        assert res_api.json()["status"] == "ok"

        # 404 on nonexistent route
        res_404 = await client.get("/api/nonexistent-route-xyz")
        assert res_404.status_code == 404
        err_data = res_404.json()
        assert err_data["success"] is False
        assert err_data["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_database_integrity_error_mapped_to_conflict(error_test_app):
    from sqlalchemy.exc import IntegrityError

    @error_test_app.get("/test/db-unique-constraint")
    async def trigger_unique_conflict():
        raise IntegrityError(
            statement="INSERT INTO registrations ...",
            params={},
            orig=Exception("duplicate key value violates unique constraint 'uq_user_event'"),
        )

    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/test/db-unique-constraint")
        assert res.status_code == 409
        data = res.json()
        assert data["success"] is False
        assert data["code"] == "CONFLICT"
        assert "already exists" in data["message"].lower()


@pytest.mark.asyncio
async def test_validation_error_clear_guidance_message(error_test_app):
    transport = ASGITransport(app=error_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Both fields missing
        res = await client.post("/test/validation", json={})
        assert res.status_code == 422
        data = res.json()
        assert "Validation failed for 2 fields" in data["message"]
        assert "'name'" in data["message"]
        assert "'email'" in data["message"]

        # Only one field invalid (too short)
        res_single = await client.post("/test/validation", json={"name": "a", "email": "valid@dau.ac.in"})
        assert res_single.status_code == 422
        data_single = res_single.json()
        assert "'name' is too short" in data_single["message"] or "'name' is required" in data_single["message"]

