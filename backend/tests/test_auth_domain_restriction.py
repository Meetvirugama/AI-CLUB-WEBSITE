"""
tests/test_auth_domain_restriction.py
------------------------------------
Tests for domain restriction enforcing that only @dau.ac.in Google accounts
can log in or register, with authorized exceptions for configured SUPER_ADMIN_EMAIL.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
import pytest
from httpx import AsyncClient, ASGITransport

from core.config import settings
from auth.google_oauth import GoogleUserInfo
from auth.jwt_handler import create_access_token


class TestDomainRestrictionConfig:
    """Verify is_email_allowed domain matching logic."""

    def test_dau_domain_is_allowed(self):
        assert settings.is_email_allowed("student@dau.ac.in") is True
        assert settings.is_email_allowed("202631049@dau.ac.in") is True
        assert settings.is_email_allowed("faculty.name@dau.ac.in") is True

    def test_case_insensitivity(self):
        assert settings.is_email_allowed("STUDENT@DAU.AC.IN") is True
        assert settings.is_email_allowed("User@Dau.Ac.In") is True

    def test_subdomains_of_dau_are_allowed(self):
        assert settings.is_email_allowed("student@cs.dau.ac.in") is True

    def test_non_dau_domains_are_rejected(self):
        assert settings.is_email_allowed("attacker@gmail.com") is False
        assert settings.is_email_allowed("user@yahoo.com") is False
        assert settings.is_email_allowed("fake@dau.ac.in.attacker.com") is False
        assert settings.is_email_allowed("fake@notdau.ac.in") is False

    def test_invalid_emails_rejected(self):
        assert settings.is_email_allowed("") is False
        assert settings.is_email_allowed(None) is False
        assert settings.is_email_allowed("invalid-string") is False

    def test_super_admin_exception_is_allowed(self):
        with patch.object(settings, "SUPER_ADMIN_EMAIL", "admin@gmail.com,meet56963@gmail.com"):
            assert settings.is_email_allowed("meet56963@gmail.com") is True
            assert settings.is_email_allowed("admin@gmail.com") is True
            assert settings.is_email_allowed("other@gmail.com") is False


class TestGoogleAuthDomainEnforcement:
    """Verify POST /api/auth/google rejects non-@dau.ac.in tokens."""

    @pytest.mark.asyncio
    async def test_dau_email_can_authenticate(self):
        from main import app

        mock_user = GoogleUserInfo(
            google_id="google-sub-123",
            email="student@dau.ac.in",
            name="DAU Student",
            profile_image="https://example.com/avatar.png",
            email_verified=True,
        )

        with patch("auth.routes.verify_google_id_token", return_value=mock_user), \
             patch("auth.routes.get_or_create_user") as mock_get_or_create:
            mock_db_user = MagicMock()
            mock_db_user.id = 42
            mock_db_user.email = "student@dau.ac.in"
            mock_db_user.name = "DAU Student"
            mock_db_user.profile_image = "https://example.com/avatar.png"
            mock_db_user.is_admin = False
            mock_db_user.created_at = datetime.now(timezone.utc)
            mock_db_user.last_login = datetime.now(timezone.utc)
            mock_get_or_create.return_value = (mock_db_user, True)

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                resp = await c.post(
                    "/api/auth/google",
                    json={"id_token": "valid.mock.token"},
                    headers={"Origin": "http://localhost:5173"},
                )

            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "success"
            assert data["user"]["email"] == "student@dau.ac.in"
            assert "access_token" in resp.cookies

    @pytest.mark.asyncio
    async def test_non_dau_email_is_blocked_with_403(self):
        from main import app

        mock_user = GoogleUserInfo(
            google_id="google-sub-456",
            email="outsider@gmail.com",
            name="External User",
            profile_image=None,
            email_verified=True,
        )

        with patch("auth.routes.verify_google_id_token", return_value=mock_user):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                resp = await c.post(
                    "/api/auth/google",
                    json={"id_token": "valid.mock.token"},
                    headers={"Origin": "http://localhost:5173"},
                )

            assert resp.status_code == 403
            assert "dau.ac.in" in resp.json()["detail"]
            assert "access_token" not in resp.cookies

    @pytest.mark.asyncio
    async def test_super_admin_non_dau_email_is_permitted_and_promoted(self):
        from main import app

        mock_user = GoogleUserInfo(
            google_id="google-sub-789",
            email="superadmin@external.com",
            name="Super Admin",
            profile_image=None,
            email_verified=True,
        )

        with patch.object(settings, "SUPER_ADMIN_EMAIL", "superadmin@external.com"), \
             patch("auth.routes.verify_google_id_token", return_value=mock_user), \
             patch("auth.routes.get_or_create_user") as mock_get_or_create:
            mock_db_user = MagicMock()
            mock_db_user.id = 99
            mock_db_user.email = "superadmin@external.com"
            mock_db_user.name = "Super Admin"
            mock_db_user.profile_image = None
            mock_db_user.is_admin = True
            mock_db_user.created_at = datetime.now(timezone.utc)
            mock_db_user.last_login = datetime.now(timezone.utc)
            mock_get_or_create.return_value = (mock_db_user, False)

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                resp = await c.post(
                    "/api/auth/google",
                    json={"id_token": "valid.mock.token"},
                    headers={"Origin": "http://localhost:5173"},
                )

            assert resp.status_code == 200
            assert resp.json()["status"] == "success"


class TestAuthMiddlewareDomainEnforcement:
    """Verify middleware rejects users whose emails are outside the allowed domain."""

    @pytest.mark.asyncio
    async def test_get_current_user_blocks_legacy_non_dau_user(self):
        from auth.middleware import get_current_user
        from fastapi import HTTPException

        legacy_user = MagicMock()
        legacy_user.id = 10
        legacy_user.email = "legacy@gmail.com"

        token = create_access_token(user_id=10)

        with patch("auth.middleware.get_user_by_id", return_value=legacy_user):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(request=MagicMock(), token=token)

            assert exc_info.value.status_code == 403
            assert "dau.ac.in" in exc_info.value.detail
