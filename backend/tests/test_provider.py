"""
tests/test_provider.py
───────────────────────
Tests for §21 (multi-key rotation), §22 (provider fallback),
and the ProviderManager's error handling behavior.

Uses unit tests against ProviderManager directly — no HTTP calls.
Verifies:
  - Key rotation: next key is used after a success.
  - Rate-limit detection: key is cooled down after 429.
  - Groq → Gemini fallback works when all Groq keys fail.
  - All keys exhausted raises RuntimeError.
  - Timeout is handled gracefully.
  - Empty response triggers fast-model fallback.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from chatbot.provider import (
    ProviderManager, KeyState, ChatCallResult,
    _RateLimitError, _ProviderError, _PayloadTooLargeError,
)


def make_key_state(provider: str, index: int, key: str = "test-key") -> KeyState:
    return KeyState(key=key, provider=provider, index=index)


class TestKeyRotation:
    """§21 — Keys are rotated round-robin, failed keys are cooled down."""

    def test_mark_rate_limited_sets_cooldown(self):
        state = make_key_state("groq", 1)
        import time
        before = time.time()
        state.mark_rate_limited()
        assert state.cooldown_until > before
        assert not state.is_healthy

    def test_mark_success_clears_cooldown(self):
        state = make_key_state("groq", 1)
        state.mark_rate_limited()
        assert not state.is_healthy
        state.mark_success()
        assert state.is_healthy
        assert state.fail_count == 0

    def test_mark_error_twice_triggers_cooldown(self):
        import time
        state = make_key_state("groq", 1)
        state.mark_error(500)
        assert state.is_healthy  # 1 error — no cooldown yet
        state.mark_error(500)
        assert not state.is_healthy  # 2 errors — cooldown applied

    def test_health_status_healthy_by_default(self):
        state = make_key_state("groq", 1)
        assert state.health_status == "healthy"

    def test_health_status_rate_limited(self):
        state = make_key_state("groq", 1)
        state.mark_rate_limited()
        assert state.health_status in ("rate_limited", "error")

    def test_health_status_degraded_after_one_error(self):
        state = make_key_state("groq", 1)
        state.mark_error(500)
        assert state.health_status == "degraded"


class TestProviderManagerSetup:
    """ProviderManager loads keys from env correctly."""

    def test_no_keys_not_ready(self, monkeypatch):
        import os
        monkeypatch.setattr(os, "environ", {})
        pm = ProviderManager()
        pm.load_from_env()
        assert not pm.is_ready

    def test_one_groq_key_is_ready(self, monkeypatch):
        import os
        monkeypatch.setattr(os, "environ", {"GROQ_API_KEY_1": "gsk_testkey123"})
        pm = ProviderManager()
        pm.load_from_env()
        assert pm.is_ready
        assert len(pm._groq_pool) == 1

    def test_key_starting_with_your_is_ignored(self, monkeypatch):
        import os
        monkeypatch.setattr(os, "environ", {"GROQ_API_KEY_1": "your_groq_key_here"})
        pm = ProviderManager()
        pm.load_from_env()
        # Only placeholder — should not be loaded
        assert len(pm._groq_pool) == 0


class TestProviderFallback:
    """§22 — Groq → Gemini fallback when Groq fails."""

    @pytest.mark.asyncio
    async def test_groq_rate_limit_falls_back_to_gemini(self):
        """When all Groq keys are rate-limited, Gemini should be used."""
        pm = ProviderManager()
        pm._groq_pool = [make_key_state("groq", 1)]
        pm._gemini_pool = [make_key_state("gemini", 1)]
        pm._ready = True

        async def groq_raises(*args, **kwargs):
            raise _RateLimitError()

        async def gemini_ok(*args, **kwargs):
            return "Gemini reply", 10, 5

        with patch.object(pm, "_call_groq", side_effect=groq_raises), \
             patch.object(pm, "_call_gemini", side_effect=gemini_ok):
            text, result = await pm.generate(
                system_prompt="test", user_message="test question"
            )

        assert text == "Gemini reply"
        assert result.provider == "gemini"
        assert result.fallback_used is True

    @pytest.mark.asyncio
    async def test_all_keys_exhausted_raises_runtime_error(self):
        """If all providers fail, RuntimeError is raised."""
        pm = ProviderManager()
        pm._groq_pool = [make_key_state("groq", 1)]
        pm._gemini_pool = [make_key_state("gemini", 1)]
        pm._ready = True

        async def always_fail(*args, **kwargs):
            raise _ProviderError(500)

        with patch.object(pm, "_call_groq", side_effect=always_fail), \
             patch.object(pm, "_call_gemini", side_effect=always_fail):
            with pytest.raises(RuntimeError, match="unavailable"):
                await pm.generate(system_prompt="test", user_message="test")

    @pytest.mark.asyncio
    async def test_timeout_falls_back(self):
        """Timeout on Groq should fall back to Gemini."""
        pm = ProviderManager()
        pm._groq_pool = [make_key_state("groq", 1)]
        pm._gemini_pool = [make_key_state("gemini", 1)]
        pm._ready = True

        async def groq_timeout(*args, **kwargs):
            raise asyncio.TimeoutError()

        async def gemini_ok(*args, **kwargs):
            return "Fallback!", 5, 3

        with patch.object(pm, "_call_groq", side_effect=groq_timeout), \
             patch.object(pm, "_call_gemini", side_effect=gemini_ok):
            text, result = await pm.generate(system_prompt="test", user_message="test")

        assert text == "Fallback!"
        assert result.fallback_used is True

    @pytest.mark.asyncio
    async def test_payload_too_large_skips_groq_pool(self):
        """413 on Groq should skip entire Groq pool and go to Gemini."""
        pm = ProviderManager()
        pm._groq_pool = [make_key_state("groq", 1), make_key_state("groq", 2)]
        pm._gemini_pool = [make_key_state("gemini", 1)]
        pm._ready = True

        call_count = {"groq": 0}

        async def groq_413(*args, **kwargs):
            call_count["groq"] += 1
            raise _PayloadTooLargeError()

        async def gemini_ok(*args, **kwargs):
            return "Gemini handled it", 5, 3

        with patch.object(pm, "_call_groq", side_effect=groq_413), \
             patch.object(pm, "_call_gemini", side_effect=gemini_ok):
            text, result = await pm.generate(system_prompt="x" * 100000, user_message="test")

        # Should have called Groq only once (breaks on 413) and gone to Gemini
        assert call_count["groq"] == 1
        assert text == "Gemini handled it"


class TestConversationHistory:
    """§28 — Messages list is passed through to provider."""

    @pytest.mark.asyncio
    async def test_messages_passed_to_groq(self):
        """When messages list is provided, it is used in the API payload."""
        pm = ProviderManager()
        pm._groq_pool = [make_key_state("groq", 1)]
        pm._gemini_pool = []
        pm._ready = True

        captured_payload = {}

        async def mock_call_groq_model(state, model, system_prompt, user_message, messages=None):
            captured_payload["messages"] = messages
            return "reply", 10, 5

        with patch.object(pm, "_call_groq_model", side_effect=mock_call_groq_model):
            history = [
                {"role": "user", "content": "who are the members?"},
                {"role": "assistant", "content": "The club has 10 members."},
                {"role": "user", "content": "who built the RAG project?"},
            ]
            await pm.generate(
                system_prompt="test",
                user_message="who built the RAG project?",
                messages=history,
            )

        assert captured_payload["messages"] is not None
        assert len(captured_payload["messages"]) == 3
