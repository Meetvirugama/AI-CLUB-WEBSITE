"""
chatbot_provider.py — Production multi-provider LLM key pool for AI Club chatbot.

Architecture:
  ┌─────────────────────────────────────────────────────────┐
  │                    ProviderManager                      │
  │                                                         │
  │  Groq Pool (7 keys)          Gemini Pool (5 keys)       │
  │  openai/gpt-oss-120b         gemini-3.6-flash           │
  │  ├── K1 (round-robin)        ├── G1 (round-robin)       │
  │  ├── K2                      ├── G2                     │
  │  └── … skip if cooling       └── … skip if cooling      │
  │                                                         │
  │  generate(prompt) → (text, ChatCallResult):             │
  │    1. Try each healthy Groq key → success → return      │
  │    2. Groq pool exhausted → try each healthy Gemini key │
  │    3. All exhausted → raise with friendly message       │
  └─────────────────────────────────────────────────────────┘

Key behaviors:
- Round-robin across healthy keys within each pool
- Per-key cooldown: 60 s after rate-limit (429) or repeated 5xx
- Bounded retries: at most (len(groq_keys) + len(gemini_keys)) total attempts
- 15 s per-call timeout
- API keys are NEVER logged or returned in responses
- generate() returns (text, ChatCallResult) for analytics instrumentation
- All I/O is async (httpx for Groq, google-genai for Gemini)
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import httpx
from google import genai as google_genai

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────

GROQ_MODEL       = "openai/gpt-oss-120b"    # Best available on these Groq accounts
GROQ_MODEL_FAST  = "qwen/qwen3.8-27b"        # Fallback within Groq if 120b fails
GEMINI_MODEL     = "gemini-3.6-flash"         # Current Gemini model (2.5-flash deprecated)

# How long (seconds) to cool down a key after a rate-limit or repeated server error
KEY_COOLDOWN_S   = 60

# Per-call timeout in seconds
CALL_TIMEOUT_S   = 15

# Groq API endpoint
GROQ_CHAT_URL    = "https://api.groq.com/openai/v1/chat/completions"

# Maximum tokens in LLM output
MAX_OUTPUT_TOKENS = 800

# Groq has a much smaller context window than Gemini — truncate the system prompt
# to avoid 413 Payload Too Large. Gemini receives the full, untruncated context.
GROQ_MAX_PROMPT_CHARS = 14_000  # ~3,500 tokens — safe for most Groq models


# ── Analytics result dataclass ─────────────────────────────────────────────────

@dataclass
class ChatCallResult:
    """
    Metadata from a completed LLM call — used for analytics logging.
    Contains NO sensitive data (no key values, no user content).
    """
    provider:         Optional[str]   = None   # "groq" | "gemini" | None
    provider_key_idx: Optional[int]   = None   # 1-based index, safe identifier
    model:            Optional[str]   = None
    input_tokens:     int             = 0
    output_tokens:    int             = 0
    latency_ms:       Optional[int]   = None
    status:           str             = "error"  # success | error | rate_limited | payload_too_large | fallback
    fallback_used:    bool            = False
    error_code:       Optional[str]   = None


# ── Key state tracking ─────────────────────────────────────────────────────────

@dataclass
class KeyState:
    """Runtime health state for a single API key."""
    key: str                          # The actual API key (never logged)
    provider: str                     # "groq" or "gemini"
    index: int                        # Position in its pool (for log label, e.g. groq#2)
    fail_count: int = 0               # Consecutive failures (reset on success)
    cooldown_until: float = 0.0       # epoch timestamp; 0 means healthy
    last_used_ts: float = 0.0         # epoch timestamp of last successful use

    @property
    def is_healthy(self) -> bool:
        return time.time() >= self.cooldown_until

    @property
    def health_status(self) -> str:
        now = time.time()
        if now < self.cooldown_until:
            if self.fail_count >= 2:
                return "error"
            return "rate_limited"
        if self.fail_count >= 1:
            return "degraded"
        return "healthy"

    def mark_rate_limited(self) -> None:
        self.cooldown_until = time.time() + KEY_COOLDOWN_S
        self.fail_count += 1
        logger.warning(
            f"[LLM] {self.provider}#{self.index}: rate-limited — cooling down {KEY_COOLDOWN_S}s"
        )

    def mark_error(self, status: Optional[int] = None) -> None:
        self.fail_count += 1
        # Put on cooldown after 2 consecutive errors for the same key
        if self.fail_count >= 2:
            self.cooldown_until = time.time() + KEY_COOLDOWN_S
            logger.warning(
                f"[LLM] {self.provider}#{self.index}: {self.fail_count} errors "
                f"(last HTTP {status}) — cooling down {KEY_COOLDOWN_S}s"
            )
        else:
            logger.warning(
                f"[LLM] {self.provider}#{self.index}: error HTTP {status} (fail #{self.fail_count})"
            )

    def mark_success(self) -> None:
        self.fail_count = 0
        self.cooldown_until = 0.0
        self.last_used_ts = time.time()


# ── Provider manager ───────────────────────────────────────────────────────────

class ProviderManager:
    """
    Manages a pool of Groq and Gemini API keys.
    Tries Groq first (lower latency / cost), falls back to Gemini.
    Thread-safe for asyncio (single-threaded event loop per uvicorn worker).
    """

    def __init__(self) -> None:
        self._groq_pool:   List[KeyState] = []
        self._gemini_pool: List[KeyState] = []
        self._groq_idx   = 0  # round-robin cursor for Groq
        self._gemini_idx = 0  # round-robin cursor for Gemini
        self._ready      = False

    # ── Initialisation ────────────────────────────────────────────────────────

    def load_from_env(self) -> None:
        """
        Reads all API keys from environment variables.
        Groq keys: GROQ_API_KEY_1 … GROQ_API_KEY_7
        Gemini keys: GEMINI_API_KEY_1 … GEMINI_API_KEY_5
        Falls back to legacy GOOGLE_API_KEY for backward compatibility.
        """
        # ── Groq keys ──
        groq_keys: List[str] = []
        for i in range(1, 8):
            v = os.getenv(f"GROQ_API_KEY_{i}", "").strip()
            if v and not v.startswith("your_"):
                groq_keys.append(v)

        self._groq_pool = [
            KeyState(key=k, provider="groq", index=i + 1)
            for i, k in enumerate(groq_keys)
        ]

        # ── Gemini keys ──
        gemini_keys: List[str] = []
        for i in range(1, 6):
            v = os.getenv(f"GEMINI_API_KEY_{i}", "").strip()
            if v and not v.startswith("your_"):
                gemini_keys.append(v)

        # Backward-compat: if no numbered Gemini keys, try legacy GOOGLE_API_KEY
        if not gemini_keys:
            legacy = os.getenv("GOOGLE_API_KEY", "").strip()
            if legacy and not legacy.startswith("your_"):
                gemini_keys.append(legacy)
                logger.info("[LLM] Using legacy GOOGLE_API_KEY as GEMINI_API_KEY_1")

        self._gemini_pool = [
            KeyState(key=k, provider="gemini", index=i + 1)
            for i, k in enumerate(gemini_keys)
        ]

        self._ready = bool(self._groq_pool or self._gemini_pool)

        if self._ready:
            logger.info(
                f"[LLM] Provider pool ready: {len(self._groq_pool)} Groq key(s), "
                f"{len(self._gemini_pool)} Gemini key(s), "
                f"{len(self._groq_pool) + len(self._gemini_pool)} total"
            )
        else:
            logger.warning("[LLM] No API keys found — chatbot will be offline.")

    @property
    def is_ready(self) -> bool:
        return self._ready

    # ── Public interface ──────────────────────────────────────────────────────

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        messages: Optional[List[dict]] = None,
    ) -> Tuple[str, ChatCallResult]:
        """
        Generate a response using the first healthy key in priority order:
        Groq pool → Gemini pool.

        Args:
            system_prompt: Full system prompt with context.
            user_message:  The current user's message.
            messages:      Optional list of {role, content} dicts for multi-turn
                           conversation history (§28). If provided, replaces the
                           single user_message in the API payload.

        Returns:
            (text_reply, ChatCallResult) — result metadata for analytics logging.
        Raises RuntimeError if all keys are exhausted or unavailable.
        """
        if not self._ready:
            raise RuntimeError("No API keys configured.")

        errors: List[str] = []
        t_start = time.monotonic()

        # Truncate system prompt for Groq — its models have much smaller context windows.
        # Preserve the instructional beginning and as much data as fits.
        groq_system_prompt = system_prompt
        if len(system_prompt) > GROQ_MAX_PROMPT_CHARS:
            groq_system_prompt = system_prompt[:GROQ_MAX_PROMPT_CHARS] + (
                "\n\n[Context truncated due to length. Answer from the information provided above.]"
            )

        # ── Try Groq pool ──────────────────────────────────────────────────
        first_groq_tried = False
        for _ in range(len(self._groq_pool)):
            state = self._next_groq_key()
            if state is None:
                break  # All Groq keys cooling down
            first_groq_tried = True
            try:
                t_call = time.monotonic()
                text, in_tok, out_tok = await self._call_groq(
                    state, groq_system_prompt, user_message, messages=messages
                )
                latency = int((time.monotonic() - t_call) * 1000)
                # Guard against empty responses (some models return empty string)
                if text and text.strip():
                    state.mark_success()
                    logger.info(f"[LLM] groq#{state.index} / {GROQ_MODEL} — success")
                    return text, ChatCallResult(
                        provider="groq",
                        provider_key_idx=state.index,
                        model=GROQ_MODEL,
                        input_tokens=in_tok,
                        output_tokens=out_tok,
                        latency_ms=latency,
                        status="success",
                        fallback_used=False,
                    )
                else:
                    # Empty response — try fast fallback model before moving on
                    t_call2 = time.monotonic()
                    text2, in_tok2, out_tok2 = await self._call_groq_model(
                        state, GROQ_MODEL_FAST, groq_system_prompt, user_message, messages=messages
                    )
                    if text2 and text2.strip():
                        latency2 = int((time.monotonic() - t_call2) * 1000)
                        state.mark_success()
                        logger.info(f"[LLM] groq#{state.index} / {GROQ_MODEL_FAST} (fallback) — success")
                        return text2, ChatCallResult(
                            provider="groq",
                            provider_key_idx=state.index,
                            model=GROQ_MODEL_FAST,
                            input_tokens=in_tok2,
                            output_tokens=out_tok2,
                            latency_ms=latency2,
                            status="success",
                            fallback_used=False,
                        )
                    state.mark_error()
                    errors.append(f"groq#{state.index}: empty response")
            except _RateLimitError:
                state.mark_rate_limited()
                errors.append(f"groq#{state.index}: rate-limited")
            except _PayloadTooLargeError:
                # 413: payload too large — all keys will have the same problem, skip pool
                logger.warning("[LLM] Groq payload too large even after truncation — skipping Groq pool")
                errors.append("groq: payload too large")
                break
            except _ProviderError as exc:
                state.mark_error(exc.status)
                errors.append(f"groq#{state.index}: HTTP {exc.status}")
            except asyncio.TimeoutError:
                state.mark_error()
                errors.append(f"groq#{state.index}: timeout")
            except Exception as exc:
                state.mark_error()
                errors.append(f"groq#{state.index}: {type(exc).__name__}")

        # ── Try Gemini pool ────────────────────────────────────────────────
        groq_was_tried = bool(errors) or first_groq_tried
        for _ in range(len(self._gemini_pool)):
            state = self._next_gemini_key()
            if state is None:
                break  # All Gemini keys cooling down
            try:
                t_call = time.monotonic()
                text, in_tok, out_tok = await self._call_gemini(
                    state, system_prompt, user_message, messages=messages
                )
                latency = int((time.monotonic() - t_call) * 1000)
                state.mark_success()
                logger.info(f"[LLM] gemini#{state.index} / {GEMINI_MODEL} — success")
                return text, ChatCallResult(
                    provider="gemini",
                    provider_key_idx=state.index,
                    model=GEMINI_MODEL,
                    input_tokens=in_tok,
                    output_tokens=out_tok,
                    latency_ms=latency,
                    status="fallback" if groq_was_tried else "success",
                    fallback_used=groq_was_tried,
                )
            except _RateLimitError:
                state.mark_rate_limited()
                errors.append(f"gemini#{state.index}: rate-limited")
            except _ProviderError as exc:
                state.mark_error(exc.status)
                errors.append(f"gemini#{state.index}: HTTP {exc.status}")
            except asyncio.TimeoutError:
                state.mark_error()
                errors.append(f"gemini#{state.index}: timeout")
            except Exception as exc:
                state.mark_error()
                errors.append(f"gemini#{state.index}: {type(exc).__name__}")

        # All providers failed
        logger.error(f"[LLM] All providers failed: {'; '.join(errors)}")
        raise RuntimeError("All LLM providers are currently unavailable.")

    # ── Key health snapshot (for analytics) ──────────────────────────────────

    def get_key_health_snapshot(self) -> List[Dict]:
        """
        Returns a safe list of per-key health info for the analytics dashboard.
        NEVER includes the actual API key values — only index, status, and timestamps.
        """
        import datetime as dt
        now = time.time()
        snapshot = []

        for state in self._groq_pool:
            last_used = (
                dt.datetime.fromtimestamp(state.last_used_ts, tz=dt.timezone.utc)
                if state.last_used_ts > 0 else None
            )
            snapshot.append({
                "provider": "groq",
                "key_idx": state.index,
                "label": f"Groq Key {state.index:02d}",
                "status": state.health_status,
                "last_used": last_used,
                "fail_count": state.fail_count,
                "cooling_until": state.cooldown_until if state.cooldown_until > now else None,
            })

        for state in self._gemini_pool:
            last_used = (
                dt.datetime.fromtimestamp(state.last_used_ts, tz=dt.timezone.utc)
                if state.last_used_ts > 0 else None
            )
            snapshot.append({
                "provider": "gemini",
                "key_idx": state.index,
                "label": f"Gemini Key {state.index:02d}",
                "status": state.health_status,
                "last_used": last_used,
                "fail_count": state.fail_count,
                "cooling_until": state.cooldown_until if state.cooldown_until > now else None,
            })

        return snapshot

    # ── Round-robin key selection ─────────────────────────────────────────────

    def _next_groq_key(self) -> Optional[KeyState]:
        """Return the next healthy Groq key using round-robin, or None."""
        pool = self._groq_pool
        if not pool:
            return None
        start = self._groq_idx
        for _ in range(len(pool)):
            state = pool[self._groq_idx % len(pool)]
            self._groq_idx = (self._groq_idx + 1) % len(pool)
            if state.is_healthy:
                return state
        # All cooling down — try the least-recently-cooled one as last resort
        _ = start  # noqa: suppress unused warning
        return None

    def _next_gemini_key(self) -> Optional[KeyState]:
        """Return the next healthy Gemini key using round-robin, or None."""
        pool = self._gemini_pool
        if not pool:
            return None
        for _ in range(len(pool)):
            state = pool[self._gemini_idx % len(pool)]
            self._gemini_idx = (self._gemini_idx + 1) % len(pool)
            if state.is_healthy:
                return state
        return None

    # ── Groq call ─────────────────────────────────────────────────────────────

    async def _call_groq(
        self, state: KeyState, system_prompt: str, user_message: str,
        messages: Optional[List[dict]] = None,
    ) -> Tuple[str, int, int]:
        return await self._call_groq_model(
            state, GROQ_MODEL, system_prompt, user_message, messages=messages
        )

    async def _call_groq_model(
        self, state: KeyState, model: str, system_prompt: str, user_message: str,
        messages: Optional[List[dict]] = None,
    ) -> Tuple[str, int, int]:
        """Returns (text, input_tokens, output_tokens)."""
        if messages:
            # Multi-turn: system message + full history (already includes current user msg)
            api_messages = [{"role": "system", "content": system_prompt}] + messages
        else:
            api_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ]
        payload = {
            "model": model,
            "messages": api_messages,
            "max_tokens": MAX_OUTPUT_TOKENS,
            "temperature": 0.4,
        }
        headers = {
            "Authorization": f"Bearer {state.key}",
            "Content-Type":  "application/json",
        }

        async with httpx.AsyncClient(timeout=CALL_TIMEOUT_S) as client:
            resp = await client.post(GROQ_CHAT_URL, json=payload, headers=headers)

        if resp.status_code == 429:
            raise _RateLimitError()
        if resp.status_code == 413:
            raise _PayloadTooLargeError()
        if resp.status_code >= 400:
            raise _ProviderError(resp.status_code)

        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"] or ""
            # Extract token counts from Groq usage metadata
            usage = data.get("usage", {})
            in_tok  = usage.get("prompt_tokens", 0) or 0
            out_tok = usage.get("completion_tokens", 0) or 0
            return content, in_tok, out_tok
        except (KeyError, IndexError, TypeError) as exc:
            raise _ProviderError(0) from exc

    # ── Gemini call ───────────────────────────────────────────────────────────

    async def _call_gemini(
        self, state: KeyState, system_prompt: str, user_message: str,
        messages: Optional[List[dict]] = None,
    ) -> Tuple[str, int, int]:
        """
        Gemini calls are synchronous in google-genai v2; run them in a thread
        to avoid blocking the event loop.
        Returns (text, input_tokens, output_tokens).
        """
        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    self._call_gemini_sync,
                    state.key,
                    system_prompt,
                    user_message,
                    messages,
                ),
                timeout=CALL_TIMEOUT_S,
            )
            return result
        except asyncio.TimeoutError:
            raise
        except _RateLimitError:
            raise
        except _ProviderError:
            raise
        except Exception as exc:
            raise _ProviderError(0) from exc

    @staticmethod
    def _call_gemini_sync(
        api_key: str, system_prompt: str, user_message: str,
        messages: Optional[List[dict]] = None,
    ) -> Tuple[str, int, int]:
        """Returns (text, input_tokens, output_tokens)."""
        client = google_genai.Client(api_key=api_key)
        # Build content string: if history present, format as a conversation transcript
        if messages and len(messages) > 1:
            history_text = "\n".join(
                f"{m['role'].capitalize()}: {m['content']}"
                for m in messages[:-1]  # everything except the last (current) user msg
            )
            content = (
                f"{system_prompt}\n\n"
                f"--- Conversation History ---\n{history_text}\n"
                f"--- Current Message ---\nUser: {user_message}"
            )
        else:
            content = f"{system_prompt}\n\nUser message: {user_message}"
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=content,
            )
            text = response.text or ""
            if not text:
                raise _ProviderError(0)

            # Extract token counts from Gemini usage metadata
            in_tok = out_tok = 0
            try:
                meta = response.usage_metadata
                if meta:
                    in_tok  = getattr(meta, "prompt_token_count", 0) or 0
                    out_tok = getattr(meta, "candidates_token_count", 0) or 0
            except Exception:
                pass

            return text, in_tok, out_tok
        except Exception as exc:
            # Map quota/rate errors from google-genai
            err_str = str(exc).lower()
            if "quota" in err_str or "resource_exhausted" in err_str or "429" in err_str:
                raise _RateLimitError() from exc
            raise _ProviderError(0) from exc


# ── Internal exception types ──────────────────────────────────────────────────

class _RateLimitError(Exception):
    """Raised when a provider returns HTTP 429 / quota exceeded."""


class _PayloadTooLargeError(Exception):
    """Raised when Groq returns HTTP 413 — context is too large even after truncation."""


class _ProviderError(Exception):
    """Raised on non-429/non-413 HTTP errors or malformed responses."""
    def __init__(self, status: int = 0):
        self.status = status
        super().__init__(f"Provider error HTTP {status}")


# ── Module-level singleton ────────────────────────────────────────────────────
# Imported by main.py — keys are loaded once at startup.

provider_manager = ProviderManager()
