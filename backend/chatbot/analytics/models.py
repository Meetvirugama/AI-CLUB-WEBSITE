"""
chatbot_analytics/models.py
----------------------------
SQLAlchemy ORM models for chatbot usage analytics.

Tables
──────
  chat_usage_events   — One row per chatbot request (raw event log).
  chat_daily_metrics  — Pre-aggregated daily roll-up (upserted atomically).
  provider_key_stats  — Per-key daily counters; stores key INDEX only, NEVER key value.

Privacy guarantees
──────────────────
  • No user PII (no names, emails, IPs).
  • No API key values — only a small integer index (e.g. 1 = "Groq Key 01").
  • No message content or conversation text is stored.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float,
    Index, Integer, SmallInteger, String, UniqueConstraint,
)

from db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# chat_usage_events
# ─────────────────────────────────────────────────────────────────────────────

class ChatUsageEvent(Base):
    """
    Raw event log — one row per completed chatbot call.

    request_type values
    ───────────────────
      knowledge    — club-info question answered by LLM
      navigation   — user asked to navigate to a page
      greeting     — hi/hello type opener
      out_of_scope — question outside club scope, LLM declined
      restricted   — tried to access private data
      error        — request failed before reaching LLM
      no_answer    — LLM returned empty / irrelevant response

    status values
    ─────────────
      success         — LLM returned a valid reply
      error           — provider call failed
      rate_limited    — all providers rate-limited
      fallback        — succeeded via Gemini after Groq failed
      payload_too_large — context too large for Groq, fell through to Gemini
    """
    __tablename__ = "chat_usage_events"

    id               = Column(Integer,      primary_key=True, autoincrement=True)
    created_at       = Column(DateTime(timezone=True), nullable=False, default=_utcnow, index=True)
    date             = Column(Date,         nullable=False, index=True)

    # Request classification
    request_type     = Column(String(32),   nullable=False, default="knowledge", index=True)

    # Provider details — no key values ever stored
    provider         = Column(String(16),   nullable=True, index=True)   # groq | gemini | None
    provider_key_idx = Column(SmallInteger, nullable=True)               # 1..7 or 1..5
    model            = Column(String(64),   nullable=True, index=True)

    # Token usage
    input_tokens     = Column(Integer,      nullable=False, default=0)
    output_tokens    = Column(Integer,      nullable=False, default=0)

    # Performance
    latency_ms       = Column(Integer,      nullable=True)

    # Outcome
    status           = Column(String(24),   nullable=False, default="success", index=True)
    fallback_used    = Column(Boolean,      nullable=False, default=False)
    error_code       = Column(String(32),   nullable=True)

    __table_args__ = (
        Index("ix_chat_usage_date_provider",  "date", "provider"),
        Index("ix_chat_usage_date_status",    "date", "status"),
        Index("ix_chat_usage_date_type",      "date", "request_type"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# chat_daily_metrics
# ─────────────────────────────────────────────────────────────────────────────

class ChatDailyMetric(Base):
    """
    Pre-aggregated daily roll-up.

    Each chat request atomically upserts (increments) the row for today.
    Dashboard queries hit this table — no expensive full-scan of usage_events.
    """
    __tablename__ = "chat_daily_metrics"

    date             = Column(Date,    primary_key=True)

    # Volume
    total_requests   = Column(Integer, nullable=False, default=0)
    successful       = Column(Integer, nullable=False, default=0)
    failed           = Column(Integer, nullable=False, default=0)
    rate_limited     = Column(Integer, nullable=False, default=0)
    fallbacks        = Column(Integer, nullable=False, default=0)

    # Request types
    out_of_scope     = Column(Integer, nullable=False, default=0)
    navigation       = Column(Integer, nullable=False, default=0)
    greetings        = Column(Integer, nullable=False, default=0)
    restricted       = Column(Integer, nullable=False, default=0)
    no_answer        = Column(Integer, nullable=False, default=0)
    knowledge        = Column(Integer, nullable=False, default=0)

    # Tokens
    input_tokens     = Column(Integer, nullable=False, default=0)
    output_tokens    = Column(Integer, nullable=False, default=0)

    # Provider breakdown
    groq_requests    = Column(Integer, nullable=False, default=0)
    groq_tokens      = Column(Integer, nullable=False, default=0)
    gemini_requests  = Column(Integer, nullable=False, default=0)
    gemini_tokens    = Column(Integer, nullable=False, default=0)

    # Performance (stored as running sum — divide by total_requests for avg)
    latency_sum_ms   = Column(Integer, nullable=False, default=0)


# ─────────────────────────────────────────────────────────────────────────────
# provider_key_stats
# ─────────────────────────────────────────────────────────────────────────────

class ProviderKeyStats(Base):
    """
    Per-key daily counters.

    provider   — "groq" or "gemini"
    key_idx    — integer index (1-based). Never the actual API key string.

    The dashboard maps key_idx → "Groq Key 01" style labels at render time.
    """
    __tablename__ = "provider_key_stats"

    id          = Column(Integer,      primary_key=True, autoincrement=True)
    provider    = Column(String(16),   nullable=False, index=True)
    key_idx     = Column(SmallInteger, nullable=False)
    date        = Column(Date,         nullable=False, index=True)

    requests    = Column(Integer, nullable=False, default=0)
    successes   = Column(Integer, nullable=False, default=0)
    failures    = Column(Integer, nullable=False, default=0)
    rate_limits = Column(Integer, nullable=False, default=0)
    tokens_in   = Column(Integer, nullable=False, default=0)
    tokens_out  = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("provider", "key_idx", "date", name="uq_provider_key_date"),
        Index("ix_pks_date_provider", "date", "provider"),
    )
