"""
analytics/routes.py
--------------------
FastAPI router for the first-party analytics system.

Public endpoints (no auth — called by the frontend tracker):
  POST /api/analytics/track          — record any event
  POST /api/analytics/session-end    — record session duration

Admin endpoints (require_admin):
  GET  /api/analytics/overview       — KPI cards
  GET  /api/analytics/traffic        — daily chart
  GET  /api/analytics/hourly         — hourly heatmap
  GET  /api/analytics/pages          — page table
  GET  /api/analytics/actions        — action counts
  GET  /api/analytics/devices        — device/browser breakdown
  GET  /api/analytics/sessions       — top sessions
  GET  /api/analytics/sessions/{id}  — session timeline
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from events.admin import require_admin
from analytics.schemas import (
    TrackEventRequest,
    SessionEndRequest,
    TrafficOverview,
    DailyPoint,
    HourlyPoint,
    PageStat,
    ActionCount,
    DeviceBreakdown,
    SessionRow,
    SessionTimeline,
    EventEntry,
)
from analytics.queries import (
    upsert_visitor,
    upsert_session,
    insert_event,
    end_session,
    get_traffic_overview,
    get_daily_traffic,
    get_hourly_traffic,
    get_page_stats,
    get_action_breakdown,
    get_device_breakdown,
    get_top_sessions,
    get_session_timeline,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Analytics"])

# Rate-limit guard: max payload size is enforced by the global RequestSizeLimitMiddleware.
# The track endpoint is intentionally unauthenticated — it is designed to be called
# from the public frontend. Abuse potential is low (no PII stored).


# ─────────────────────────────────────────────────────────────────────────────
# Public: track event
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/analytics/track",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Track a visitor action (public)",
    description=(
        "Records a visitor event (PAGE_VIEW, CHATBOT_OPEN, EVENT_REGISTER_CLICK, …). "
        "Called fire-and-forget by the frontend tracker. No auth required."
    ),
)
async def track_event(
    body: TrackEventRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        await upsert_visitor(db, body.visitor_id)
        await upsert_session(
            db,
            session_id=body.session_id,
            visitor_id=body.visitor_id,
            device_type=body.device_type,
            browser=body.browser,
            os=body.os,
            screen_width=body.screen_width,
        )
        await insert_event(
            db,
            session_id=body.session_id,
            visitor_id=body.visitor_id,
            event_type=body.event_type,
            page=body.page,
            meta=body.meta,
        )
        await db.commit()
    except Exception as exc:
        logger.warning("analytics track error: %s", exc)
        # Never surface errors to the public frontend — silently swallow.


@router.post(
    "/api/analytics/session-end",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Record session end + duration (public)",
    description=(
        "Called by the frontend `beforeunload` handler to persist session duration. "
        "No auth required."
    ),
)
async def record_session_end(
    body: SessionEndRequest,
    db:   AsyncSession = Depends(get_db),
):
    try:
        await end_session(db, body.session_id, body.duration_sec)
        await db.commit()
    except Exception as exc:
        logger.warning("analytics session-end error: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Admin: read endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/analytics/overview",
    response_model=TrafficOverview,
    summary="Traffic KPI overview (admin)",
)
async def analytics_overview(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await get_traffic_overview(db, days)
        return TrafficOverview(**data)
    except Exception as exc:
        logger.exception("analytics overview error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load analytics overview.")


@router.get(
    "/api/analytics/traffic",
    response_model=List[DailyPoint],
    summary="Daily traffic chart (admin)",
)
async def analytics_traffic(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return [DailyPoint(**r) for r in await get_daily_traffic(db, days)]
    except Exception as exc:
        logger.exception("analytics traffic error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load traffic data.")


@router.get(
    "/api/analytics/hourly",
    response_model=List[HourlyPoint],
    summary="Hourly traffic heatmap (admin)",
)
async def analytics_hourly(
    days: int = Query(default=7, ge=1, le=90),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return [HourlyPoint(**r) for r in await get_hourly_traffic(db, days)]
    except Exception as exc:
        logger.exception("analytics hourly error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load hourly data.")


@router.get(
    "/api/analytics/pages",
    response_model=List[PageStat],
    summary="Page stats table (admin)",
)
async def analytics_pages(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return [PageStat(**r) for r in await get_page_stats(db, days)]
    except Exception as exc:
        logger.exception("analytics pages error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load page stats.")


@router.get(
    "/api/analytics/actions",
    response_model=List[ActionCount],
    summary="Action/event breakdown (admin)",
)
async def analytics_actions(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return [ActionCount(**r) for r in await get_action_breakdown(db, days)]
    except Exception as exc:
        logger.exception("analytics actions error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load action data.")


@router.get(
    "/api/analytics/devices",
    response_model=DeviceBreakdown,
    summary="Device & browser breakdown (admin)",
)
async def analytics_devices(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await get_device_breakdown(db, days)
        return DeviceBreakdown(**data)
    except Exception as exc:
        logger.exception("analytics devices error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load device data.")


@router.get(
    "/api/analytics/sessions",
    response_model=List[SessionRow],
    summary="Recent sessions list (admin)",
)
async def analytics_sessions(
    days:  int = Query(default=7,  ge=1, le=90),
    limit: int = Query(default=20, ge=1, le=100),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        rows = await get_top_sessions(db, days, limit)
        return [SessionRow(**r) for r in rows]
    except Exception as exc:
        logger.exception("analytics sessions error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load sessions.")


@router.get(
    "/api/analytics/sessions/{session_id}",
    response_model=SessionTimeline,
    summary="Session event timeline (admin)",
)
async def analytics_session_timeline(
    session_id: str,
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        events = await get_session_timeline(db, session_id)
        return SessionTimeline(
            session_id=session_id,
            events=[EventEntry(**e) for e in events],
        )
    except Exception as exc:
        logger.exception("analytics session timeline error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load session timeline.")
