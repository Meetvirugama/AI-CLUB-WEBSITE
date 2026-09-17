"""
chatbot_analytics/routes.py
----------------------------
Admin-only FastAPI router for chatbot analytics endpoints.

All 6 endpoints verify admin authorization via `require_admin` dependency
(JWT + DB is_admin check). Non-admins receive HTTP 403.

Endpoints
─────────
  GET /api/admin/chatbot/overview    — today's KPIs + all-time totals
  GET /api/admin/chatbot/usage       — daily usage trend (days=7|30|90)
  GET /api/admin/chatbot/providers   — provider + model breakdown
  GET /api/admin/chatbot/keys        — API key health (safe labels only)
  GET /api/admin/chatbot/activity    — recent activity feed
  GET /api/admin/chatbot/categories  — query category breakdown

Security
────────
  • Every endpoint uses `require_admin` — HTTP 403 for non-admins.
  • Key health returns safe labels ("Groq Key 01") — never raw key values.
  • Activity feed contains no user PII, no conversation content.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from events.admin import require_admin
from chatbot.analytics.queries import (
    get_overview,
    get_daily_usage,
    get_providers,
    get_key_health,
    get_recent_activity,
    get_categories,
)
from chatbot.analytics.schemas import (
    ActivityResponse,
    CategoriesResponse,
    ChatOverviewResponse,
    DailyUsageResponse,
    KeyHealthResponse,
    ProvidersResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/chatbot", tags=["Chatbot Analytics"])


@router.get("/overview", response_model=ChatOverviewResponse)
async def chatbot_overview(
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Today's summary KPIs and provider pool status."""
    return await get_overview(db)


@router.get("/usage", response_model=DailyUsageResponse)
async def chatbot_usage(
    days: int = Query(default=7, ge=1, le=90, description="Number of days to include"),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Daily usage trend for the last N days."""
    return await get_daily_usage(db, days=days)


@router.get("/providers", response_model=ProvidersResponse)
async def chatbot_providers(
    days: int = Query(default=30, ge=1, le=90),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Provider and model breakdown for the last N days."""
    return await get_providers(db, days=days)


@router.get("/keys", response_model=KeyHealthResponse)
async def chatbot_keys(
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Per-key health status and today's usage counters. Safe labels only."""
    return await get_key_health(db)


@router.get("/activity", response_model=ActivityResponse)
async def chatbot_activity(
    limit: int = Query(default=50, ge=1, le=200),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Recent chatbot activity feed (no PII, no conversation content)."""
    return await get_recent_activity(db, limit=limit)


@router.get("/categories", response_model=CategoriesResponse)
async def chatbot_categories(
    days: int = Query(default=30, ge=1, le=90),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Query category distribution over the last N days."""
    return await get_categories(db, days=days)


@router.get("/dashboard")
async def chatbot_dashboard(
    days: int = Query(default=30, ge=1, le=90),
    limit: int = Query(default=50, ge=1, le=200),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated analytics dashboard data in a single request."""
    import asyncio
    ov, us, pr, ky, ac, ca = await asyncio.gather(
        get_overview(db),
        get_daily_usage(db, days=days),
        get_providers(db, days=days),
        get_key_health(db),
        get_recent_activity(db, limit=limit),
        get_categories(db, days=days),
    )
    return {
        "overview": ov,
        "usage": us,
        "providers": pr,
        "keys": ky,
        "activity": ac,
        "categories": ca,
    }

