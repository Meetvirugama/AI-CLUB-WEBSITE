"""
chatbot_analytics/schemas.py
-----------------------------
Pydantic response schemas for all chatbot analytics API endpoints.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────────────────────
# Overview
# ─────────────────────────────────────────────────────────────────────────────

class ChatOverviewResponse(BaseModel):
    # Today's stats
    today_requests:   int
    today_successful: int
    today_failed:     int
    today_input_tokens:  int
    today_output_tokens: int
    today_total_tokens:  int
    today_avg_latency_ms: Optional[float]
    today_success_rate:   Optional[float]   # 0.0–100.0
    today_fallbacks:  int
    today_rate_limited: int

    # All-time totals (from daily_metrics sum)
    total_requests:   int
    total_tokens:     int

    # Provider pool status — safe identifiers only
    groq_keys_total:  int
    gemini_keys_total: int
    provider_pool_ready: bool


# ─────────────────────────────────────────────────────────────────────────────
# Daily usage
# ─────────────────────────────────────────────────────────────────────────────

class DailyUsagePoint(BaseModel):
    date:           date
    total_requests: int
    successful:     int
    failed:         int
    rate_limited:   int
    fallbacks:      int
    input_tokens:   int
    output_tokens:  int
    total_tokens:   int
    groq_requests:  int
    gemini_requests: int
    avg_latency_ms: Optional[float]

class DailyUsageResponse(BaseModel):
    days:  int
    data:  List[DailyUsagePoint]


# ─────────────────────────────────────────────────────────────────────────────
# Provider analytics
# ─────────────────────────────────────────────────────────────────────────────

class ProviderSummary(BaseModel):
    provider:       str
    requests:       int
    successes:      int
    failures:       int
    rate_limits:    int
    fallbacks:      int
    input_tokens:   int
    output_tokens:  int
    total_tokens:   int
    success_rate:   Optional[float]
    avg_latency_ms: Optional[float]

class ModelSummary(BaseModel):
    provider:       str
    model:          str
    requests:       int
    input_tokens:   int
    output_tokens:  int
    total_tokens:   int
    failures:       int
    avg_latency_ms: Optional[float]

class ProvidersResponse(BaseModel):
    days:     int
    providers: List[ProviderSummary]
    models:    List[ModelSummary]


# ─────────────────────────────────────────────────────────────────────────────
# API key health
# ─────────────────────────────────────────────────────────────────────────────

class KeyHealthEntry(BaseModel):
    label:       str            # "Groq Key 01", "Gemini Key 02" — NEVER the actual key
    provider:    str
    key_idx:     int
    status:      str            # healthy | rate_limited | cooling | error | unknown
    requests_today: int
    successes_today: int
    failures_today:  int
    rate_limits_today: int
    tokens_in_today:   int
    tokens_out_today:  int
    last_used:   Optional[datetime]  # from in-memory KeyState, not DB

class KeyHealthResponse(BaseModel):
    keys: List[KeyHealthEntry]


# ─────────────────────────────────────────────────────────────────────────────
# Recent activity
# ─────────────────────────────────────────────────────────────────────────────

class ActivityEntry(BaseModel):
    id:           int
    created_at:   datetime
    request_type: str
    provider:     Optional[str]
    model:        Optional[str]
    key_label:    Optional[str]   # "Groq Key 01" style — never raw key
    input_tokens: int
    output_tokens: int
    latency_ms:   Optional[int]
    status:       str
    fallback_used: bool

class ActivityResponse(BaseModel):
    limit: int
    events: List[ActivityEntry]


# ─────────────────────────────────────────────────────────────────────────────
# Query categories
# ─────────────────────────────────────────────────────────────────────────────

class CategoryBreakdown(BaseModel):
    knowledge:    int
    navigation:   int
    greeting:     int
    out_of_scope: int
    restricted:   int
    no_answer:    int
    error:        int
    total:        int

class CategoriesResponse(BaseModel):
    days:       int
    categories: CategoryBreakdown
