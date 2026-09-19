"""
analytics/queries.py
---------------------
Async SQLAlchemy query helpers for the first-party analytics system.

All functions accept an AsyncSession and return plain Python dicts/lists
so the route layer can serialize them via Pydantic.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.models import AnalyticsVisitor, AnalyticsSession, AnalyticsEvent

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Write helpers (called by the public track endpoint)
# ─────────────────────────────────────────────────────────────────────────────

async def upsert_visitor(session: AsyncSession, visitor_id: str) -> None:
    """Insert visitor if new, otherwise bump last_seen_at."""
    now = datetime.now(timezone.utc)
    await session.execute(
        text("""
            INSERT INTO analytics_visitors (visitor_id, first_seen_at, last_seen_at)
            VALUES (:vid, :now, :now)
            ON CONFLICT (visitor_id) DO UPDATE
              SET last_seen_at = EXCLUDED.last_seen_at
        """),
        {"vid": visitor_id, "now": now},
    )


async def upsert_session(
    session:      AsyncSession,
    session_id:   str,
    visitor_id:   str,
    device_type:  Optional[str] = None,
    browser:      Optional[str] = None,
    os:           Optional[str] = None,
    screen_width: Optional[int] = None,
) -> None:
    """Insert session row if it doesn't exist yet."""
    now = datetime.now(timezone.utc)
    await session.execute(
        text("""
            INSERT INTO analytics_sessions
              (session_id, visitor_id, started_at, device_type, browser, os, screen_width)
            VALUES (:sid, :vid, :now, :device, :browser, :os, :sw)
            ON CONFLICT (session_id) DO NOTHING
        """),
        {
            "sid":    session_id,
            "vid":    visitor_id,
            "now":    now,
            "device": device_type,
            "browser": browser,
            "os":     os,
            "sw":     screen_width,
        },
    )


async def insert_event(
    session:    AsyncSession,
    session_id: str,
    visitor_id: str,
    event_type: str,
    page:       Optional[str] = None,
    meta:       Optional[Dict[str, Any]] = None,
) -> None:
    """Insert a single analytics event row."""
    import json as _json
    now = datetime.now(timezone.utc)
    meta_str = _json.dumps(meta) if meta else None
    await session.execute(
        text("""
            INSERT INTO analytics_events
              (session_id, visitor_id, event_type, page, timestamp, meta)
            VALUES (:sid, :vid, :etype, :page, :ts, CAST(:meta AS jsonb))
        """),
        {
            "sid":   session_id,
            "vid":   visitor_id,
            "etype": event_type,
            "page":  page,
            "ts":    now,
            "meta":  meta_str,
        },
    )


async def end_session(
    session:     AsyncSession,
    session_id:  str,
    duration_sec: float,
) -> None:
    """Mark session as ended and record its duration."""
    now = datetime.now(timezone.utc)
    await session.execute(
        text("""
            UPDATE analytics_sessions
               SET ended_at    = :now,
                   duration_sec = :dur
             WHERE session_id  = :sid
        """),
        {"now": now, "dur": duration_sec, "sid": session_id},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Read helpers (called by the admin endpoints)
# ─────────────────────────────────────────────────────────────────────────────

def _since(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def get_traffic_overview(session: AsyncSession, days: int) -> Dict[str, Any]:
    since = _since(days)
    row = await session.execute(
        text("""
            SELECT
              COUNT(DISTINCT ae.visitor_id)                          AS unique_visitors,
              COUNT(DISTINCT ae.session_id)                          AS sessions,
              COUNT(*) FILTER (WHERE ae.event_type = 'PAGE_VIEW')   AS page_views,
              AVG(s.duration_sec) FILTER (WHERE s.duration_sec IS NOT NULL) AS avg_duration
            FROM analytics_events ae
            LEFT JOIN analytics_sessions s ON s.session_id = ae.session_id
            WHERE ae.timestamp >= :since
        """),
        {"since": since},
    )
    r = row.mappings().first() or {}

    # Bounce rate: sessions where only 1 page view was tracked
    bounce_row = await session.execute(
        text("""
            SELECT
              COUNT(*) FILTER (WHERE pv_count = 1) * 100.0
                / NULLIF(COUNT(*), 0) AS bounce_rate
            FROM (
              SELECT session_id, COUNT(*) FILTER (WHERE event_type='PAGE_VIEW') AS pv_count
              FROM analytics_events
              WHERE timestamp >= :since
              GROUP BY session_id
            ) t
        """),
        {"since": since},
    )
    br = bounce_row.mappings().first() or {}

    return {
        "unique_visitors":      int(r.get("unique_visitors") or 0),
        "sessions":             int(r.get("sessions") or 0),
        "page_views":           int(r.get("page_views") or 0),
        "avg_session_duration": float(r["avg_duration"]) if r.get("avg_duration") else None,
        "bounce_rate":          float(br["bounce_rate"]) if br.get("bounce_rate") else None,
    }


async def get_daily_traffic(session: AsyncSession, days: int) -> List[Dict[str, Any]]:
    since = _since(days)
    rows = await session.execute(
        text("""
            SELECT
              DATE(ae.timestamp AT TIME ZONE 'UTC') AS date,
              COUNT(DISTINCT ae.visitor_id)          AS unique_visitors,
              COUNT(DISTINCT ae.session_id)          AS sessions,
              COUNT(*) FILTER (WHERE ae.event_type = 'PAGE_VIEW') AS page_views
            FROM analytics_events ae
            WHERE ae.timestamp >= :since
            GROUP BY 1
            ORDER BY 1
        """),
        {"since": since},
    )
    return [
        {
            "date":            str(r["date"]),
            "unique_visitors": int(r["unique_visitors"]),
            "sessions":        int(r["sessions"]),
            "page_views":      int(r["page_views"]),
        }
        for r in rows.mappings()
    ]


async def get_hourly_traffic(session: AsyncSession, days: int) -> List[Dict[str, Any]]:
    since = _since(days)
    rows = await session.execute(
        text("""
            SELECT
              EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
              COUNT(DISTINCT visitor_id)  AS visitors,
              COUNT(DISTINCT session_id)  AS sessions,
              COUNT(*)                    AS events
            FROM analytics_events
            WHERE timestamp >= :since
            GROUP BY 1
            ORDER BY 1
        """),
        {"since": since},
    )
    # Fill all 24 hours
    data = {r["hour"]: r for r in rows.mappings()}
    return [
        {
            "hour":     h,
            "visitors": int(data[h]["visitors"]) if h in data else 0,
            "sessions": int(data[h]["sessions"]) if h in data else 0,
            "events":   int(data[h]["events"])   if h in data else 0,
        }
        for h in range(24)
    ]


async def get_page_stats(session: AsyncSession, days: int) -> List[Dict[str, Any]]:
    since = _since(days)
    rows = await session.execute(
        text("""
            SELECT
              page,
              COUNT(*) AS views,
              AVG((meta->>'duration_sec')::float)
                FILTER (WHERE meta->>'duration_sec' IS NOT NULL) AS avg_time_sec
            FROM analytics_events
            WHERE event_type = 'PAGE_VIEW'
              AND timestamp  >= :since
              AND page IS NOT NULL
            GROUP BY page
            ORDER BY views DESC
            LIMIT 20
        """),
        {"since": since},
    )
    return [
        {
            "page":         r["page"],
            "views":        int(r["views"]),
            "avg_time_sec": float(r["avg_time_sec"]) if r["avg_time_sec"] else None,
        }
        for r in rows.mappings()
    ]


async def get_action_breakdown(session: AsyncSession, days: int) -> List[Dict[str, Any]]:
    since = _since(days)
    rows = await session.execute(
        text("""
            SELECT event_type, COUNT(*) AS count
            FROM analytics_events
            WHERE timestamp >= :since
            GROUP BY event_type
            ORDER BY count DESC
        """),
        {"since": since},
    )
    return [
        {"event_type": r["event_type"], "count": int(r["count"])}
        for r in rows.mappings()
    ]


async def get_device_breakdown(session: AsyncSession, days: int) -> Dict[str, Any]:
    since = _since(days)

    dev_rows = await session.execute(
        text("""
            SELECT
              COALESCE(device_type, 'unknown') AS device_type,
              COUNT(*) AS count
            FROM analytics_sessions
            WHERE started_at >= :since
            GROUP BY 1
            ORDER BY count DESC
        """),
        {"since": since},
    )
    devs = list(dev_rows.mappings())
    total_dev = sum(int(r["count"]) for r in devs) or 1

    browser_rows = await session.execute(
        text("""
            SELECT
              COALESCE(browser, 'unknown') AS browser,
              COUNT(*) AS count
            FROM analytics_sessions
            WHERE started_at >= :since
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 10
        """),
        {"since": since},
    )
    brows = list(browser_rows.mappings())
    total_brow = sum(int(r["count"]) for r in brows) or 1

    return {
        "devices": [
            {
                "device_type": r["device_type"],
                "count":       int(r["count"]),
                "pct":         round(int(r["count"]) / total_dev * 100, 1),
            }
            for r in devs
        ],
        "browsers": [
            {
                "browser": r["browser"],
                "count":   int(r["count"]),
                "pct":     round(int(r["count"]) / total_brow * 100, 1),
            }
            for r in brows
        ],
    }


async def get_top_sessions(
    session: AsyncSession, days: int, limit: int = 20
) -> List[Dict[str, Any]]:
    since = _since(days)
    rows = await session.execute(
        text("""
            SELECT
              s.session_id,
              s.visitor_id,
              s.started_at,
              s.duration_sec,
              s.device_type,
              s.browser,
              COUNT(*) FILTER (WHERE e.event_type = 'PAGE_VIEW') AS page_views
            FROM analytics_sessions s
            LEFT JOIN analytics_events e ON e.session_id = s.session_id
            WHERE s.started_at >= :since
            GROUP BY s.session_id, s.visitor_id, s.started_at, s.duration_sec,
                     s.device_type, s.browser
            ORDER BY s.started_at DESC
            LIMIT :lim
        """),
        {"since": since, "lim": limit},
    )
    return [
        {
            "session_id":   r["session_id"],
            "visitor_id":   r["visitor_id"],
            "started_at":   r["started_at"].isoformat() if r["started_at"] else None,
            "duration_sec": float(r["duration_sec"]) if r["duration_sec"] else None,
            "page_views":   int(r["page_views"]),
            "device_type":  r["device_type"],
            "browser":      r["browser"],
        }
        for r in rows.mappings()
    ]


async def get_session_timeline(
    session: AsyncSession, session_id: str
) -> List[Dict[str, Any]]:
    rows = await session.execute(
        text("""
            SELECT id, event_type, page, timestamp, meta
            FROM analytics_events
            WHERE session_id = :sid
            ORDER BY timestamp ASC
        """),
        {"sid": session_id},
    )
    return [
        {
            "id":         r["id"],
            "event_type": r["event_type"],
            "page":       r["page"],
            "timestamp":  r["timestamp"].isoformat() if r["timestamp"] else None,
            "meta":       r["meta"],
        }
        for r in rows.mappings()
    ]
