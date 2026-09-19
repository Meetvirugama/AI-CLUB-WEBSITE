"""
analytics/models.py
--------------------
SQLAlchemy ORM models for the first-party analytics system.

Tables
──────
  analytics_visitors  — one row per anonymous visitor_id (UUID in localStorage)
  analytics_sessions  — one row per browser session
  analytics_events    — every tracked action (PAGE_VIEW, CHATBOT_OPEN, …)
  analytics_daily     — precomputed daily rollup for fast dashboard queries
"""

from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date,
    BigInteger, Text, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

from db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AnalyticsVisitor(Base):
    """One row per anonymous visitor (keyed by UUID stored in localStorage)."""
    __tablename__ = "analytics_visitors"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    visitor_id    = Column(String(64), nullable=False, unique=True, index=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    last_seen_at  = Column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_analytics_visitors_last_seen", "last_seen_at"),
    )


class AnalyticsSession(Base):
    """One row per browser session (new session_id per tab open / 30-min gap)."""
    __tablename__ = "analytics_sessions"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    session_id    = Column(String(64), nullable=False, unique=True, index=True)
    visitor_id    = Column(String(64), nullable=False, index=True)
    started_at    = Column(DateTime(timezone=True), nullable=False, default=_now)
    ended_at      = Column(DateTime(timezone=True), nullable=True)
    duration_sec  = Column(Float, nullable=True)
    device_type   = Column(String(32), nullable=True)   # desktop / mobile / tablet
    browser       = Column(String(64), nullable=True)   # Chrome / Safari / Firefox / …
    os            = Column(String(64), nullable=True)
    screen_width  = Column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_analytics_sessions_started_at", "started_at"),
        Index("ix_analytics_sessions_visitor_id", "visitor_id"),
    )


class AnalyticsEvent(Base):
    """Every tracked user action."""
    __tablename__ = "analytics_events"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    session_id  = Column(String(64), nullable=False, index=True)
    visitor_id  = Column(String(64), nullable=False, index=True)
    event_type  = Column(String(64), nullable=False, index=True)
    page        = Column(String(255), nullable=True)
    timestamp   = Column(DateTime(timezone=True), nullable=False, default=_now, index=True)
    # Store arbitrary metadata (project_id, event_id, duration_sec, etc.)
    meta        = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_analytics_events_ts", "timestamp"),
        Index("ix_analytics_events_type_ts", "event_type", "timestamp"),
    )


class AnalyticsDaily(Base):
    """Precomputed daily rollup — regenerated nightly or on-demand."""
    __tablename__ = "analytics_daily"

    id                       = Column(Integer, primary_key=True, autoincrement=True)
    date                     = Column(Date, nullable=False, unique=True, index=True)
    unique_visitors          = Column(Integer, nullable=False, default=0)
    sessions                 = Column(Integer, nullable=False, default=0)
    page_views               = Column(Integer, nullable=False, default=0)
    avg_session_duration_sec = Column(Float, nullable=True)
