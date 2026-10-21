"""
tests/test_winners_showcase.py
------------------------------
Unit and integration tests for the Event Winners Showcase backend module.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from db import Base
from main import app
from events.winners_service import (
    normalize_unicode_text,
    parse_raw_winner_string,
    get_winners_showcase,
)


def test_normalize_unicode_text():
    raw = "🥇 1𝐬𝐭 𝐏𝐥𝐚𝐜𝐞 - 𝐂𝐡𝐞𝐞𝐭𝐚𝐡 𝐒𝐩𝐫𝐢𝐧𝐭𝐞𝐫 (𝐃𝐀𝐔 𝐏𝐮𝐥𝐬𝐞)"
    normalized = normalize_unicode_text(raw)
    assert "1st Place" in normalized
    assert "Cheetah Sprinter" in normalized
    assert "(DAU Pulse)" in normalized


def test_parse_raw_winner_string_legacy_text():
    text = (
        "🥇 1st Place - Cheetah Sprinter (DAU Pulse)\n"
        "🥈 2nd Place - Chaos (ProcastiSense)\n"
        "🥉 3rd Place - 0/1 (Echo Notes)"
    )
    parsed = parse_raw_winner_string(text, "test-event")
    assert len(parsed) == 3
    assert parsed[0]["placement"] == 1
    assert parsed[0]["name"] == "Cheetah Sprinter"
    assert parsed[0]["projectTitle"] == "DAU Pulse"
    assert parsed[1]["placement"] == 2
    assert parsed[1]["name"] == "Chaos"
    assert parsed[1]["projectTitle"] == "ProcastiSense"
    assert parsed[2]["placement"] == 3
    assert parsed[2]["name"] == "0/1"
    assert parsed[2]["projectTitle"] == "Echo Notes"


def test_parse_raw_winner_string_cash_prizes():
    text = (
        "🥇 Dirgh Patel – ₹500\n"
        "🥈 Mann Chauhan – ₹300\n"
        "🥉 Krishiv Sheth – ₹200"
    )
    parsed = parse_raw_winner_string(text, "test-ib")
    assert len(parsed) == 3
    assert parsed[0]["placement"] == 1
    assert parsed[0]["name"] == "Dirgh Patel"
    assert "₹500" in (parsed[0]["award"] or "")
    assert parsed[1]["name"] == "Mann Chauhan"
    assert "₹300" in (parsed[1]["award"] or "")


def test_parse_raw_winner_string_json():
    json_str = (
        '[{"name": "Team Alpha", "placement": 1, "score": 99.5, "projectTitle": "AlphaNet"},'
        ' {"name": "Team Beta", "placement": 2, "score": 94.0, "projectTitle": "BetaFlow"}]'
    )
    parsed = parse_raw_winner_string(json_str, "test-json")
    assert len(parsed) == 2
    assert parsed[0]["name"] == "Team Alpha"
    assert parsed[0]["placement"] == 1
    assert parsed[0]["score"] == 99.5
    assert parsed[0]["projectTitle"] == "AlphaNet"


@pytest.mark.asyncio
async def test_winners_endpoint_public_access():
    """Verify GET /api/events/winners is public, returns 200, and returns a valid list."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        resp = await client.get("/api/events/winners")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        featured = [ev for ev in data if ev.get("featured")]
        assert len(featured) >= 1

        first_event = data[0]
        assert "id" in first_event
        assert "title" in first_event
        assert "edition" in first_event
        assert "winners" in first_event
        assert isinstance(first_event["winners"], list)
        assert len(first_event["winners"]) > 0

        # Check podium winner structure
        winner = first_event["winners"][0]
        assert "name" in winner
        assert "placement" in winner
        assert winner["placement"] == 1
