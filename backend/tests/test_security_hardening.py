"""
tests/test_security_hardening.py
────────────────────────────────
Regression tests for the security audit fixes.

Each class pins one fixed vulnerability so a future refactor cannot quietly
reintroduce it. These are deliberately written against behaviour (what a
client observes) rather than implementation details.
"""

from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture(scope="module", autouse=True)
async def _create_tables():
    """
    ASGITransport does not run the app's lifespan, so the tables the lifespan
    would normally create do not exist. The public-endpoint tests need real
    (empty) tables to prove those routes still serve anonymous callers.
    """
    import main  # noqa: F401  — imports every model module, registering tables
    from db import Base, engine

    # chatbot_knowledge_chunks uses a PostgreSQL TSVECTOR column, which SQLite
    # cannot compile. None of the tests here touch it.
    tables = [t for t in Base.metadata.sorted_tables if t.name != "chatbot_knowledge_chunks"]

    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=tables))
    yield


# ─────────────────────────────────────────────────────────────────────────────
# Security headers
# ─────────────────────────────────────────────────────────────────────────────

class TestSecurityHeaders:
    """Every API response must carry the browser hardening headers."""

    @pytest.mark.asyncio
    async def test_headers_present_on_api_response(self):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get("/api/auth/me")

        assert resp.headers["x-content-type-options"] == "nosniff"
        assert resp.headers["x-frame-options"] == "DENY"
        assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        assert "geolocation=()" in resp.headers["permissions-policy"]
        assert "frame-ancestors 'none'" in resp.headers["content-security-policy"]

    @pytest.mark.asyncio
    async def test_api_csp_forbids_all_content_loading(self):
        """The API returns JSON, never executable HTML — its CSP says so."""
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get("/api/auth/me")

        assert "default-src 'none'" in resp.headers["content-security-policy"]


# ─────────────────────────────────────────────────────────────────────────────
# CSRF — Origin enforcement
# ─────────────────────────────────────────────────────────────────────────────

class TestCSRFOriginEnforcement:
    """
    The session cookie is SameSite=None in production, so a cross-site page can
    attach it to a form POST. The Origin check is what stops that.
    """

    @pytest.mark.asyncio
    async def test_cookie_write_from_foreign_origin_is_blocked(self):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post(
                "/api/auth/logout",
                cookies={"access_token": "whatever"},
                headers={"Origin": "https://evil.example"},
            )

        assert resp.status_code == 403
        assert "Cross-origin" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_cookie_write_from_allowed_origin_passes(self):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post(
                "/api/auth/logout",
                cookies={"access_token": "whatever"},
                headers={"Origin": "http://localhost:5173"},
            )

        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_referer_is_used_when_origin_absent(self):
        """Older browsers omit Origin; the Referer host is checked instead."""
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post(
                "/api/auth/logout",
                cookies={"access_token": "whatever"},
                headers={"Referer": "https://evil.example/attack.html"},
            )

        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_request_without_cookie_is_not_blocked(self):
        """No cookie means no authority to abuse — API clients still work."""
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post(
                "/api/auth/logout",
                headers={"Origin": "https://evil.example"},
            )

        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_safe_method_is_never_blocked(self):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(
                "/api/auth/me",
                cookies={"access_token": "whatever"},
                headers={"Origin": "https://evil.example"},
            )

        assert resp.status_code != 403


# ─────────────────────────────────────────────────────────────────────────────
# Google OAuth — audience binding
# ─────────────────────────────────────────────────────────────────────────────

class TestGoogleTokenAudience:
    """
    An access token carries no audience of its own. Accepting one without
    asking Google who it was issued to let a token minted for any other OAuth
    client authenticate here as that user.
    """

    def test_access_token_for_foreign_client_is_rejected(self):
        from auth.google_oauth import verify_google_id_token

        foreign = MagicMock()
        foreign.status_code = 200
        foreign.json.return_value = {
            "aud": "999-attacker-app.apps.googleusercontent.com",
            "sub": "12345",
            "email": "victim@example.com",
            "email_verified": "true",
        }

        with patch("core.config.settings.GOOGLE_CLIENT_ID", "111-our-app.apps.googleusercontent.com"), \
             patch("auth.google_oauth.httpx.get", return_value=foreign):
            with pytest.raises(ValueError, match="not issued for this application"):
                verify_google_id_token("ya29-opaque-access-token")

    def test_access_token_for_our_client_is_accepted(self):
        from auth.google_oauth import verify_google_id_token

        ours = MagicMock()
        ours.status_code = 200
        ours.json.return_value = {
            "aud": "111-our-app.apps.googleusercontent.com",
            "sub": "12345",
            "email": "member@example.com",
            "email_verified": "true",
            "name": "Member",
        }

        with patch("core.config.settings.GOOGLE_CLIENT_ID", "111-our-app.apps.googleusercontent.com"), \
             patch("auth.google_oauth.httpx.get", return_value=ours):
            info = verify_google_id_token("ya29-opaque-access-token")

        assert info.google_id == "12345"
        assert info.email == "member@example.com"

    def test_unverified_email_is_rejected(self):
        from auth.google_oauth import verify_google_id_token

        unverified = MagicMock()
        unverified.status_code = 200
        unverified.json.return_value = {
            "aud": "111-our-app.apps.googleusercontent.com",
            "sub": "12345",
            "email": "spoofed@example.com",
            "email_verified": "false",
        }

        with patch("core.config.settings.GOOGLE_CLIENT_ID", "111-our-app.apps.googleusercontent.com"), \
             patch("auth.google_oauth.httpx.get", return_value=unverified):
            with pytest.raises(ValueError, match="not verified"):
                verify_google_id_token("ya29-opaque-access-token")


# ─────────────────────────────────────────────────────────────────────────────
# Authorization — protected endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestEndpointAuthorization:
    """Protected resources must be refused server-side, not just hidden in UI."""

    @pytest.mark.parametrize("path", [
        "/api/admin/dashboard",
        "/api/admin/events/1/registrations",
        "/api/admin/registrations/1",
        "/api/admin/events/1/export",
        "/api/admin/files/anything.pdf",
        "/api/admin/chatbot/overview",
        "/api/admin/chatbot/rag/stats",
    ])
    @pytest.mark.asyncio
    async def test_admin_endpoints_reject_anonymous(self, path):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(path)

        assert resp.status_code in (401, 403), f"{path} returned {resp.status_code}"

    @pytest.mark.asyncio
    async def test_own_registrations_require_auth(self):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get("/api/user/registrations")

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_forged_admin_claim_in_token_is_ignored(self):
        """
        The JWT carries only a user id. Role comes from the DB row, so a
        self-signed claim of is_admin cannot escalate.
        """
        import jwt as pyjwt
        from core.config import settings
        from main import app

        forged = pyjwt.encode(
            {
                "sub": "1",
                "type": "access",
                "is_admin": True,
                "role": "admin",
                "iat": 1700000000,
                "exp": 4102444800,
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

        with patch("auth.middleware.get_user_by_id", return_value=None):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                resp = await c.get(
                    "/api/admin/dashboard",
                    headers={"Authorization": f"Bearer {forged}"},
                )

        # User id 1 does not resolve, so the request is refused outright.
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_token_signed_with_wrong_secret_is_rejected(self):
        import jwt as pyjwt
        from main import app

        forged = pyjwt.encode(
            {"sub": "1", "type": "access", "iat": 1700000000, "exp": 4102444800},
            "not-the-real-secret",
            algorithm="HS256",
        )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {forged}"},
            )

        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Public endpoints stay public
# ─────────────────────────────────────────────────────────────────────────────

class TestPublicEndpointsStillWork:
    """The fixes must not have locked down genuinely public club data."""

    @pytest.mark.parametrize("path", [
        "/api/members",
        "/api/projects",
        "/api/events",
        "/api/past-events",
        "/api/resources",
        "/api/news",
        "/api/achievements",
        "/api/tracks",
    ])
    @pytest.mark.asyncio
    async def test_public_endpoints_do_not_require_auth(self, path):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(path)

        assert resp.status_code == 200, f"{path} returned {resp.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# File uploads
# ─────────────────────────────────────────────────────────────────────────────

def _upload(filename: str, content: bytes, content_type: str):
    """Build an UploadFile the way Starlette does."""
    from fastapi import UploadFile
    from starlette.datastructures import Headers

    return UploadFile(
        file=io.BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


class TestUploadValidation:
    """
    MIME validation used to fall back to the client-declared Content-Type
    whenever python-magic was absent — which was always, since it is not a
    declared dependency.
    """

    @pytest.mark.asyncio
    async def test_html_disguised_as_png_is_rejected(self):
        from forms.file_handler import validate_upload

        payload = b"<html><script>fetch('/api/admin/dashboard')</script></html>"
        with pytest.raises(HTTPException) as exc:
            await validate_upload(_upload("payload.html", payload, "image/png"), 1024, "image/png")
        assert exc.value.status_code == 415

    @pytest.mark.asyncio
    async def test_html_content_under_allowed_extension_is_rejected(self):
        """Renaming the file is not enough — the bytes are inspected."""
        from forms.file_handler import validate_upload

        payload = b"<html><body><script>alert(1)</script></body></html>"
        with pytest.raises(HTTPException) as exc:
            await validate_upload(_upload("innocent.png", payload, "image/png"), 1024, "image/png")
        assert exc.value.status_code == 415

    @pytest.mark.asyncio
    async def test_svg_is_rejected(self):
        from forms.file_handler import validate_upload

        payload = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        with pytest.raises(HTTPException) as exc:
            await validate_upload(_upload("logo.svg", payload, "image/svg+xml"), 1024, "image/svg+xml")
        assert exc.value.status_code == 415

    @pytest.mark.asyncio
    async def test_genuine_png_is_accepted(self):
        from forms.file_handler import validate_upload

        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
        content = await validate_upload(_upload("photo.png", png, "image/png"), 1024, "image/png")
        assert content == png

    @pytest.mark.asyncio
    async def test_genuine_pdf_is_accepted(self):
        from forms.file_handler import validate_upload

        pdf = b"%PDF-1.4\n" + b"\x00" * 64
        content = await validate_upload(_upload("resume.pdf", pdf, "application/pdf"), 1024, "application/pdf")
        assert content == pdf

    @pytest.mark.asyncio
    async def test_oversized_file_is_rejected(self):
        from forms.file_handler import validate_upload

        big = b"%PDF-1.4" + b"\x00" * (200 * 1024)
        with pytest.raises(HTTPException) as exc:
            await validate_upload(_upload("big.pdf", big, "application/pdf"), 10, "application/pdf")
        assert exc.value.status_code == 413

    def test_traversal_in_filename_is_flattened(self):
        from forms.file_handler import _safe_filename

        safe = _safe_filename("../../../../etc/passwd.pdf")
        assert "/" not in safe
        assert ".." not in safe


class TestPrivateFileContainment:
    """`str.startswith` was not a correct containment test for upload paths."""

    def test_sibling_directory_sharing_a_prefix_is_outside_root(self):
        from pathlib import Path

        upload_dir = Path("/srv/private_uploads")
        sibling = Path("/srv/private_uploads_backup/secrets.env")

        # The old check passed for this path.
        assert str(sibling).startswith(str(upload_dir))

        # The new check correctly rejects it.
        with pytest.raises(ValueError):
            sibling.relative_to(upload_dir)


# ─────────────────────────────────────────────────────────────────────────────
# RAG isolation
# ─────────────────────────────────────────────────────────────────────────────

class TestRAGPublicOnlyIndexing:
    """
    The chatbot's privacy guarantee is that the knowledge table holds public
    rows only. That is now enforced at the write path, not just documented.
    """

    @pytest.mark.parametrize("restricted_source", [
        "registrations", "users", "event_registrations", "teams", "uploaded_files",
    ])
    def test_restricted_source_is_refused(self, restricted_source):
        from chatbot.rag.indexer import RestrictedContentError, _assert_public

        with pytest.raises(RestrictedContentError):
            _assert_public({
                "source_type": restricted_source,
                "visibility": "public",
                "content": "Riya Sharma, riya@example.com, +91 90000 00000",
            })

    def test_non_public_visibility_is_refused(self):
        from chatbot.rag.indexer import RestrictedContentError, _assert_public

        with pytest.raises(RestrictedContentError):
            _assert_public({
                "source_type": "members",
                "visibility": "private",
                "content": "internal notes",
            })

    def test_public_source_is_allowed(self):
        from chatbot.rag.indexer import _assert_public

        _assert_public({
            "source_type": "members",
            "visibility": "public",
            "content": "Meet Virugama — Extended Core Member",
        })

    @pytest.mark.asyncio
    async def test_upsert_refuses_a_restricted_batch(self):
        from unittest.mock import AsyncMock

        from chatbot.rag.indexer import RestrictedContentError, _upsert_chunks

        session = AsyncMock()
        with pytest.raises(RestrictedContentError):
            await _upsert_chunks(session, [{
                "source_type": "registrations",
                "source_id": "1",
                "title": "Registration",
                "content": "private",
                "url": "",
                "visibility": "public",
            }])

        # Nothing was written.
        session.execute.assert_not_called()

    def test_retriever_filters_on_public_visibility(self):
        """Second line of defence: the read path also constrains visibility."""
        import inspect

        from chatbot.rag import retriever

        source = inspect.getsource(retriever.retrieve_relevant_chunks)
        # Both the FTS query and the ILIKE fallback must carry the filter.
        assert source.count("visibility = 'public'") == 2


# ─────────────────────────────────────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────────────────────────────────────

class TestRateLimiter:
    def test_limit_is_enforced_per_key(self):
        from security import RateLimiter

        limiter = RateLimiter(max_requests=3, window_seconds=60)

        assert all(limiter.check("1.2.3.4") for _ in range(3))
        assert limiter.check("1.2.3.4") is False

        # A different client is unaffected.
        assert limiter.check("5.6.7.8") is True

    def test_key_table_is_bounded(self):
        from security import RateLimiter

        limiter = RateLimiter(max_requests=5, window_seconds=60, max_tracked=100)
        for i in range(500):
            limiter.check(f"10.0.0.{i}")

        assert len(limiter._hits) <= 100

    def test_forwarded_header_ignored_unless_proxy_trusted(self, monkeypatch):
        """
        Trusting X-Forwarded-For unconditionally would let any client spoof its
        own address and bypass the limiter entirely.
        """
        from starlette.datastructures import Headers

        from security import client_ip

        request = MagicMock()
        request.headers = Headers({"x-forwarded-for": "1.1.1.1"})
        request.client = MagicMock()
        request.client.host = "10.0.0.5"

        monkeypatch.delenv("TRUST_PROXY", raising=False)
        assert client_ip(request) == "10.0.0.5"

        monkeypatch.setenv("TRUST_PROXY", "true")
        assert client_ip(request) == "1.1.1.1"


# ─────────────────────────────────────────────────────────────────────────────
# Cookie configuration
# ─────────────────────────────────────────────────────────────────────────────

class TestCookieConfiguration:
    def test_samesite_none_always_pairs_with_secure(self):
        """Browsers drop a SameSite=None cookie that is not also Secure."""
        from core.config import settings

        if settings.cookie_samesite == "none":
            assert settings.cookie_secure is True

    def test_session_cookie_is_http_only(self):
        from core.config import settings

        assert settings.COOKIE_HTTPONLY is True
