"""
tests/test_chatbot_scope.py
────────────────────────────
Tests for §5 (small talk), §6 (scope classification), §7 (allowed questions),
§8 (out-of-scope), §31 (unknown information), §32 (deterministic greetings).

These tests verify that:
  - Greetings return immediately without hitting the LLM.
  - Knowledge questions are routed to the LLM with club context.
  - Out-of-scope / unknown-info responses are returned correctly.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from tests.conftest import make_generate_mock


class TestGreetingShortCircuit:
    """§32 — LLM must NOT be called for simple greetings."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("greeting", [
        "hi", "hello", "hey", "good morning", "good evening",
        "thanks", "thank you", "bye", "goodbye", "ok", "cool",
        "what can you do", "who are you", "help",
    ])
    async def test_greeting_bypasses_llm(self, client, greeting, mocker):
        """Greeting messages must return without calling provider_manager.generate."""
        mock_generate = mocker.patch(
            "chatbot_provider.provider_manager.generate", new_callable=AsyncMock
        )
        resp = await client.post("/api/club-chat", json={"message": greeting})
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert len(data["reply"]) > 0
        # LLM must NOT have been called
        mock_generate.assert_not_called()

    @pytest.mark.asyncio
    async def test_greeting_reply_mentions_club(self, client):
        """Greeting reply must mention AI Club DAU."""
        resp = await client.post("/api/club-chat", json={"message": "hello"})
        assert resp.status_code == 200
        reply = resp.json()["reply"].lower()
        assert "ai club" in reply or "neuralnode" in reply

    @pytest.mark.asyncio
    async def test_thanks_response_is_positive(self, client):
        """Thanks should get a positive acknowledgement."""
        resp = await client.post("/api/club-chat", json={"message": "thanks"})
        assert resp.status_code == 200
        reply = resp.json()["reply"].lower()
        assert any(w in reply for w in ["welcome", "happy", "anytime", "glad"])


class TestKnowledgeRouting:
    """§7 — Allowed questions routed to LLM with club context."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("question", [
        "Who are the AI Club members?",
        "What projects does the club have?",
        "What is the next Build Night?",
        "Tell me about the AI Club.",
        "How can I join the club?",
    ])
    async def test_knowledge_question_hits_llm(self, client, question, mocker):
        """Knowledge questions must reach the LLM."""
        mock_generate = mocker.patch(
            "chatbot_provider.provider_manager.generate",
            side_effect=make_generate_mock("The AI Club has many members."),
        )
        resp = await client.post("/api/club-chat", json={"message": question})
        assert resp.status_code == 200
        mock_generate.assert_called_once()
        assert resp.json()["reply"] == "The AI Club has many members."


class TestOutOfScope:
    """§8 — Out-of-scope questions should return boundary response."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("question", [
        "Write me a Python program.",
        "What is the weather today?",
        "Who won the cricket match?",
        "Give me a recipe.",
    ])
    async def test_out_of_scope_llm_reply(self, client, question, mocker):
        """LLM is called but must return boundary response for off-topic questions."""
        boundary_reply = "I'm best at answering questions about AI Club DAU!"
        mocker.patch(
            "chatbot_provider.provider_manager.generate",
            side_effect=make_generate_mock(boundary_reply),
        )
        resp = await client.post("/api/club-chat", json={"message": question})
        assert resp.status_code == 200
        assert "AI Club" in resp.json()["reply"] or "best at" in resp.json()["reply"]


class TestUnknownInfo:
    """§31 — If info is not in knowledge base, say so honestly."""

    @pytest.mark.asyncio
    async def test_unknown_ai_club_info(self, client, mocker):
        """Unknown AI Club info should produce honest 'I don't have that' response."""
        no_info_reply = "I don't have that information right now. Try checking the website or asking on Discord!"
        mocker.patch(
            "chatbot_provider.provider_manager.generate",
            side_effect=make_generate_mock(no_info_reply),
        )
        resp = await client.post(
            "/api/club-chat",
            json={"message": "Who won the AI Club competition in 2035?"},
        )
        assert resp.status_code == 200
        assert "don't have" in resp.json()["reply"].lower() or "discord" in resp.json()["reply"].lower()


class TestInputValidation:
    """Input validation guards."""

    @pytest.mark.asyncio
    async def test_empty_message_rejected(self, client):
        resp = await client.post("/api/club-chat", json={"message": ""})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_too_long_message_rejected(self, client):
        resp = await client.post("/api/club-chat", json={"message": "x" * 1001})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_message_field(self, client):
        resp = await client.post("/api/club-chat", json={})
        assert resp.status_code == 422  # FastAPI validation
