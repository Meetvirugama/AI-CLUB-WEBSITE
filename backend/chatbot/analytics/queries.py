"""
chatbot_analytics/queries.py
-----------------------------
Async query functions for the chatbot analytics dashboard.

All functions use SQLAlchemy Core expressions for predictable, efficient queries.

Aggregation strategy
─────────────────────
  Each chat request calls `log_chat_event()` which:
    1. Inserts a raw row into chat_usage_events.
    2. Upserts (INSERT … ON CONFLICT DO UPDATE) today's row in chat_daily_metrics.
    3. Upserts today's row in provider_key_stats.

  Dashboard endpoints read from chat_daily_metrics (fast single-row-per-day
  queries) instead of scanning raw events. Raw events are used only for
  the recent activity feed and for any deep-dive queries.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from chatbot.analytics.models import (
    ChatUsageEvent,
    ChatDailyMetric,
    ProviderKeyStats,
)
from chatbot.analytics.schemas import (
    ActivityEntry, CategoryBreakdown, CategoriesResponse,
    DailyUsagePoint, DailyUsageResponse, KeyHealthEntry, KeyHealthResponse,
    ModelSummary, ProviderSummary, ProvidersResponse, ChatOverviewResponse,
    ActivityResponse,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Write path — called on every chat request (fire-and-forget)
# ─────────────────────────────────────────────────────────────────────────────

async def log_chat_event(
    session: AsyncSession,
    *,
    request_type: str,
    provider: Optional[str],
    provider_key_idx: Optional[int],
    model: Optional[str],
    input_tokens: int,
    output_tokens: int,
    latency_ms: Optional[int],
    status: str,
    fallback_used: bool,
    error_code: Optional[str] = None,
) -> None:
    """
    Insert a raw usage event and upsert today's daily aggregates.
    Called with asyncio.create_task() so it never blocks the chat response.
    """
    today = datetime.now(timezone.utc).date()
    total_tokens = input_tokens + output_tokens

    try:
        # 1. Insert raw event
        event = ChatUsageEvent(
            date=today,
            request_type=request_type,
            provider=provider,
            provider_key_idx=provider_key_idx,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            status=status,
            fallback_used=fallback_used,
            error_code=error_code,
        )
        session.add(event)

        # 2. Upsert daily_metrics
        is_success   = 1 if status in ("success", "fallback") else 0
        is_failure   = 1 if status in ("error", "rate_limited", "payload_too_large") else 0
        is_rl        = 1 if status == "rate_limited" else 0
        is_fallback  = 1 if fallback_used else 0
        is_oos       = 1 if request_type == "out_of_scope" else 0
        is_nav       = 1 if request_type == "navigation" else 0
        is_greet     = 1 if request_type == "greeting" else 0
        is_restrict  = 1 if request_type == "restricted" else 0
        is_no_ans    = 1 if request_type == "no_answer" else 0
        is_knowledge = 1 if request_type == "knowledge" else 0
        is_groq      = 1 if provider == "groq" else 0
        is_gemini    = 1 if provider == "gemini" else 0
        latency_val  = latency_ms or 0

        daily_stmt = pg_insert(ChatDailyMetric).values(
            date=today,
            total_requests=1,
            successful=is_success,
            failed=is_failure,
            rate_limited=is_rl,
            fallbacks=is_fallback,
            out_of_scope=is_oos,
            navigation=is_nav,
            greetings=is_greet,
            restricted=is_restrict,
            no_answer=is_no_ans,
            knowledge=is_knowledge,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            groq_requests=is_groq,
            groq_tokens=total_tokens * is_groq,
            gemini_requests=is_gemini,
            gemini_tokens=total_tokens * is_gemini,
            latency_sum_ms=latency_val,
        ).on_conflict_do_update(
            index_elements=["date"],
            set_={
                "total_requests": ChatDailyMetric.total_requests + 1,
                "successful":     ChatDailyMetric.successful     + is_success,
                "failed":         ChatDailyMetric.failed         + is_failure,
                "rate_limited":   ChatDailyMetric.rate_limited   + is_rl,
                "fallbacks":      ChatDailyMetric.fallbacks       + is_fallback,
                "out_of_scope":   ChatDailyMetric.out_of_scope   + is_oos,
                "navigation":     ChatDailyMetric.navigation      + is_nav,
                "greetings":      ChatDailyMetric.greetings       + is_greet,
                "restricted":     ChatDailyMetric.restricted      + is_restrict,
                "no_answer":      ChatDailyMetric.no_answer       + is_no_ans,
                "knowledge":      ChatDailyMetric.knowledge       + is_knowledge,
                "input_tokens":   ChatDailyMetric.input_tokens    + input_tokens,
                "output_tokens":  ChatDailyMetric.output_tokens   + output_tokens,
                "groq_requests":  ChatDailyMetric.groq_requests   + is_groq,
                "groq_tokens":    ChatDailyMetric.groq_tokens     + total_tokens * is_groq,
                "gemini_requests": ChatDailyMetric.gemini_requests + is_gemini,
                "gemini_tokens":  ChatDailyMetric.gemini_tokens   + total_tokens * is_gemini,
                "latency_sum_ms": ChatDailyMetric.latency_sum_ms  + latency_val,
            },
        )
        await session.execute(daily_stmt)

        # 3. Upsert provider_key_stats (only if a real provider was used)
        if provider and provider_key_idx:
            key_stmt = pg_insert(ProviderKeyStats).values(
                provider=provider,
                key_idx=provider_key_idx,
                date=today,
                requests=1,
                successes=is_success,
                failures=is_failure,
                rate_limits=is_rl,
                tokens_in=input_tokens,
                tokens_out=output_tokens,
            ).on_conflict_do_update(
                constraint="uq_provider_key_date",
                set_={
                    "requests":    ProviderKeyStats.requests    + 1,
                    "successes":   ProviderKeyStats.successes   + is_success,
                    "failures":    ProviderKeyStats.failures    + is_failure,
                    "rate_limits": ProviderKeyStats.rate_limits + is_rl,
                    "tokens_in":   ProviderKeyStats.tokens_in   + input_tokens,
                    "tokens_out":  ProviderKeyStats.tokens_out  + output_tokens,
                },
            )
            await session.execute(key_stmt)

        await session.commit()

    except Exception as exc:
        logger.error("[Analytics] Failed to log chat event: %s", exc, exc_info=True)
        try:
            await session.rollback()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Read path — dashboard endpoints
# ─────────────────────────────────────────────────────────────────────────────

async def get_overview(session: AsyncSession) -> ChatOverviewResponse:
    """Today's summary + all-time totals."""
    today = datetime.now(timezone.utc).date()

    # Today's row
    result = await session.execute(
        select(ChatDailyMetric).where(ChatDailyMetric.date == today)
    )
    row: Optional[ChatDailyMetric] = result.scalar_one_or_none()

    # All-time totals
    totals = await session.execute(
        select(
            func.coalesce(func.sum(ChatDailyMetric.total_requests), 0),
            func.coalesce(func.sum(ChatDailyMetric.input_tokens + ChatDailyMetric.output_tokens), 0),
        )
    )
    t_req, t_tokens = totals.one()

    if row:
        today_req   = row.total_requests
        today_ok    = row.successful
        today_fail  = row.failed
        today_in    = row.input_tokens
        today_out   = row.output_tokens
        today_rl    = row.rate_limited
        today_fb    = row.fallbacks
        today_lat   = (row.latency_sum_ms / row.total_requests) if row.total_requests else None
        today_sr    = (row.successful / row.total_requests * 100) if row.total_requests else None
    else:
        today_req = today_ok = today_fail = today_in = today_out = today_rl = today_fb = 0
        today_lat = today_sr = None

    from chatbot.provider import provider_manager
    return ChatOverviewResponse(
        today_requests=today_req,
        today_successful=today_ok,
        today_failed=today_fail,
        today_input_tokens=today_in,
        today_output_tokens=today_out,
        today_total_tokens=today_in + today_out,
        today_avg_latency_ms=round(today_lat, 1) if today_lat else None,
        today_success_rate=round(today_sr, 1) if today_sr else None,
        today_fallbacks=today_fb,
        today_rate_limited=today_rl,
        total_requests=int(t_req),
        total_tokens=int(t_tokens),
        groq_keys_total=len(provider_manager._groq_pool),
        gemini_keys_total=len(provider_manager._gemini_pool),
        provider_pool_ready=provider_manager.is_ready,
    )


async def get_daily_usage(session: AsyncSession, days: int = 7) -> DailyUsageResponse:
    """Last N days of daily roll-ups, oldest first."""
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    result = await session.execute(
        select(ChatDailyMetric)
        .where(ChatDailyMetric.date >= cutoff)
        .order_by(ChatDailyMetric.date.asc())
    )
    rows = result.scalars().all()

    points = [
        DailyUsagePoint(
            date=r.date,
            total_requests=r.total_requests,
            successful=r.successful,
            failed=r.failed,
            rate_limited=r.rate_limited,
            fallbacks=r.fallbacks,
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
            total_tokens=r.input_tokens + r.output_tokens,
            groq_requests=r.groq_requests,
            gemini_requests=r.gemini_requests,
            avg_latency_ms=round(r.latency_sum_ms / r.total_requests, 1) if r.total_requests else None,
        )
        for r in rows
    ]
    return DailyUsageResponse(days=days, data=points)


async def get_providers(session: AsyncSession, days: int = 30) -> ProvidersResponse:
    """Provider + model breakdown for the last N days from raw events."""
    from sqlalchemy import case as sa_case
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=days - 1)

    # Provider-level aggregation
    prov_result = await session.execute(
        select(
            ChatUsageEvent.provider,
            func.count().label("requests"),
            func.sum(sa_case((ChatUsageEvent.status.in_(["success", "fallback"]), 1), else_=0)).label("successes"),
            func.sum(sa_case((ChatUsageEvent.fallback_used == True, 1), else_=0)).label("fallbacks"),
            func.coalesce(func.sum(ChatUsageEvent.input_tokens),  0).label("input_tokens"),
            func.coalesce(func.sum(ChatUsageEvent.output_tokens), 0).label("output_tokens"),
            func.avg(ChatUsageEvent.latency_ms).label("avg_latency"),
        )
        .where(ChatUsageEvent.date >= cutoff)
        .group_by(ChatUsageEvent.provider)
    )
    prov_rows = prov_result.all()

    # Model-level aggregation
    model_result = await session.execute(
        select(
            ChatUsageEvent.provider,
            ChatUsageEvent.model,
            func.count().label("requests"),
            func.coalesce(func.sum(ChatUsageEvent.input_tokens),  0).label("input_tokens"),
            func.coalesce(func.sum(ChatUsageEvent.output_tokens), 0).label("output_tokens"),
            func.sum(sa_case((ChatUsageEvent.status.not_in(["success", "fallback"]), 1), else_=0)).label("failures"),
            func.avg(ChatUsageEvent.latency_ms).label("avg_latency"),
        )
        .where(ChatUsageEvent.date >= cutoff, ChatUsageEvent.model.is_not(None))
        .group_by(ChatUsageEvent.provider, ChatUsageEvent.model)
        .order_by(func.count().desc())
    )
    model_rows = model_result.all()

    providers = []
    for r in prov_rows:
        req = r.requests or 0
        ok  = int(r.successes or 0)
        fb  = int(r.fallbacks or 0)
        i_t = int(r.input_tokens or 0)
        o_t = int(r.output_tokens or 0)
        lat = round(float(r.avg_latency), 1) if r.avg_latency else None
        providers.append(ProviderSummary(
            provider=r.provider or "unknown",
            requests=req,
            successes=ok,
            failures=req - ok,
            rate_limits=0,
            fallbacks=fb,
            input_tokens=i_t,
            output_tokens=o_t,
            total_tokens=i_t + o_t,
            success_rate=round(ok / req * 100, 1) if req else None,
            avg_latency_ms=lat,
        ))

    models = [
        ModelSummary(
            provider=r.provider or "unknown",
            model=r.model or "unknown",
            requests=r.requests or 0,
            input_tokens=int(r.input_tokens or 0),
            output_tokens=int(r.output_tokens or 0),
            total_tokens=int((r.input_tokens or 0) + (r.output_tokens or 0)),
            failures=int(r.failures or 0),
            avg_latency_ms=round(float(r.avg_latency), 1) if r.avg_latency else None,
        )
        for r in model_rows
    ]

    return ProvidersResponse(days=days, providers=providers, models=models)


async def get_key_health(session: AsyncSession) -> KeyHealthResponse:
    """
    Today's per-key counters from DB + live health from in-memory KeyState.
    Returns safe labels ("Groq Key 01") — never raw key values.
    """
    from chatbot.provider import provider_manager

    today = datetime.now(timezone.utc).date()

    # Today's DB counters per key
    result = await session.execute(
        select(ProviderKeyStats).where(ProviderKeyStats.date == today)
    )
    db_rows: Dict[tuple, ProviderKeyStats] = {
        (r.provider, r.key_idx): r
        for r in result.scalars().all()
    }

    # In-memory live status
    live = provider_manager.get_key_health_snapshot()

    entries: List[KeyHealthEntry] = []
    for info in live:
        provider  = info["provider"]
        key_idx   = info["key_idx"]
        label     = info["label"]
        status    = info["status"]
        last_used = info.get("last_used")

        db_row = db_rows.get((provider, key_idx))
        entries.append(KeyHealthEntry(
            label=label,
            provider=provider,
            key_idx=key_idx,
            status=status,
            requests_today=db_row.requests    if db_row else 0,
            successes_today=db_row.successes  if db_row else 0,
            failures_today=db_row.failures    if db_row else 0,
            rate_limits_today=db_row.rate_limits if db_row else 0,
            tokens_in_today=db_row.tokens_in  if db_row else 0,
            tokens_out_today=db_row.tokens_out if db_row else 0,
            last_used=last_used,
        ))

    return KeyHealthResponse(keys=entries)


async def get_recent_activity(
    session: AsyncSession,
    limit: int = 50,
) -> ActivityResponse:
    """Most recent N chat events — no PII, no key values."""
    result = await session.execute(
        select(ChatUsageEvent)
        .order_by(ChatUsageEvent.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()

    def _key_label(provider: Optional[str], idx: Optional[int]) -> Optional[str]:
        if not provider or not idx:
            return None
        name = "Groq" if provider == "groq" else "Gemini"
        return f"{name} Key {idx:02d}"

    events = [
        ActivityEntry(
            id=r.id,
            created_at=r.created_at,
            request_type=r.request_type,
            provider=r.provider,
            model=r.model,
            key_label=_key_label(r.provider, r.provider_key_idx),
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
            latency_ms=r.latency_ms,
            status=r.status,
            fallback_used=r.fallback_used,
        )
        for r in rows
    ]
    return ActivityResponse(limit=limit, events=events)


async def get_categories(session: AsyncSession, days: int = 30) -> CategoriesResponse:
    """Query category breakdown from pre-aggregated daily metrics."""
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    result = await session.execute(
        select(
            func.coalesce(func.sum(ChatDailyMetric.knowledge),    0),
            func.coalesce(func.sum(ChatDailyMetric.navigation),   0),
            func.coalesce(func.sum(ChatDailyMetric.greetings),    0),
            func.coalesce(func.sum(ChatDailyMetric.out_of_scope), 0),
            func.coalesce(func.sum(ChatDailyMetric.restricted),   0),
            func.coalesce(func.sum(ChatDailyMetric.no_answer),    0),
            func.coalesce(func.sum(ChatDailyMetric.failed),       0),
            func.coalesce(func.sum(ChatDailyMetric.total_requests), 0),
        ).where(ChatDailyMetric.date >= cutoff)
    )
    row = result.one()
    cats = CategoryBreakdown(
        knowledge=int(row[0]),
        navigation=int(row[1]),
        greeting=int(row[2]),
        out_of_scope=int(row[3]),
        restricted=int(row[4]),
        no_answer=int(row[5]),
        error=int(row[6]),
        total=int(row[7]),
    )
    return CategoriesResponse(days=days, categories=cats)
