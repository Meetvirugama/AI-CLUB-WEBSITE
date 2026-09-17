
def parse_sse_response(resp):
    import json
    data = {"text": "", "reply": "", "navigation_action": None, "sources": []}
    for line in resp.text.splitlines():
        if line.startswith("data: "):
            try:
                event_data = json.loads(line[6:])
                if "text" in event_data:
                    data["text"] += event_data["text"]
                    data["reply"] += event_data["text"]
                if "navigation_action" in event_data and event_data["navigation_action"]:
                    data["navigation_action"] = event_data["navigation_action"]
                if "sources" in event_data and event_data["sources"]:
                    data["sources"].extend(event_data["sources"])
            except json.JSONDecodeError:
                pass
    return data

"""
tests/test_chatbot_navigation.py
──────────────────────────────────
Tests for §16 (smart navigation), §17 (allowlist), §18 (admin restriction).

Verifies:
  - LLM nav markers are parsed and resolved to real routes.
  - Unknown nav keys are silently denied.
  - Admin routes require admin role.
  - Auth-required routes require login.
  - Arbitrary URLs can never be injected.
"""

import pytest

def make_mock_stream(text, result_obj):
    async def _stream(*args, **kwargs):
        yield text, None
        yield None, result_obj
    return _stream
from unittest.mock import AsyncMock, MagicMock
from tests.conftest import make_generate_mock


class TestNavigationAllowlist:
    """§17 — Only allowlisted destinations are ever returned."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("dest,expected_path", [
        ("events",       "/events"),
        ("projects",     "/projects"),
        ("team",         "/team"),
        ("achievements", "/achievements"),
        ("news",         "/news"),
        ("curriculum",   "/curriculum"),
        ("roadmap-ml",   "/roadmaps/ml"),
        ("roadmap-genai","/roadmaps/genai"),
        ("home",         "/"),
    ])
    async def test_valid_nav_destination(self, client, dest, expected_path, mocker):
        """Valid destinations emit navigation_action with correct path."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock(f"Taking you there! [NAV:{dest}]"),
        )
        resp = await client.post("/api/club-chat", json={"message": f"go to {dest}"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is not None
        assert data["navigation_action"]["path"] == expected_path
        assert data["navigation_action"]["destination"] == dest

    @pytest.mark.asyncio
    async def test_unknown_nav_key_denied(self, client, mocker):
        """LLM hallucinating an unknown key must be silently denied."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock("Going there! [NAV:secret-admin-backdoor]"),
        )
        resp = await client.post("/api/club-chat", json={"message": "go to secret page"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is None

    @pytest.mark.asyncio
    async def test_nav_marker_stripped_from_reply(self, client, mocker):
        """[NAV:xxx] marker must NOT appear in the clean reply."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock("Opening Events! [NAV:events]"),
        )
        resp = await client.post("/api/club-chat", json={"message": "show events"})
        assert resp.status_code == 200
        assert "[NAV:" not in parse_sse_response(resp)["reply"]


class TestAdminNavigation:
    """§18 — Admin routes require server-side role check."""

    @pytest.mark.asyncio
    async def test_admin_nav_denied_for_unauthenticated(self, anonymous_client, mocker):
        """Unauthenticated user asking for admin nav must be denied."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock("Opening admin! [NAV:admin]"),
        )
        resp = await anonymous_client.post("/api/club-chat", json={"message": "open admin"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is None
        assert "permission" in data["reply"].lower() or "admin" in data["reply"].lower()

    @pytest.mark.asyncio
    async def test_admin_nav_denied_for_normal_user(self, normal_client, mocker):
        """Normal user asking for admin nav must be denied."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock("Opening admin! [NAV:admin]"),
        )
        resp = await normal_client.post("/api/club-chat", json={"message": "open admin dashboard"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is None

    @pytest.mark.asyncio
    async def test_admin_nav_allowed_for_admin(self, admin_client, mocker):
        """Admin user must get the navigation_action for admin routes."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock("Opening the Admin Dashboard! [NAV:admin]"),
        )
        resp = await admin_client.post("/api/club-chat", json={"message": "open admin"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is not None
        assert data["navigation_action"]["path"] == "/admin"

    @pytest.mark.asyncio
    async def test_auth_required_route_denied_for_anonymous(self, anonymous_client, mocker):
        """Anonymous user requesting my-registrations must be denied."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock("Taking you there! [NAV:my-registrations]"),
        )
        resp = await anonymous_client.post("/api/club-chat", json={"message": "my registrations"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is None
        assert "logged in" in data["reply"].lower() or "sign in" in data["reply"].lower()


class TestArbitraryURLPrevention:
    """§17 — LLM must never emit arbitrary URLs directly."""

    @pytest.mark.asyncio
    async def test_llm_url_in_reply_not_treated_as_nav(self, client, mocker):
        """A URL in the reply body (not in [NAV:...]) must NOT become navigation_action."""
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_generate_mock(
                "Check out this page: https://evil.com/admin for more info."
            ),
        )
        resp = await client.post("/api/club-chat", json={"message": "where can I find info?"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        assert data["navigation_action"] is None
