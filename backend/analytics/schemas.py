"""
analytics/schemas.py
---------------------
Pydantic v2 request/response models for the first-party analytics API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Inbound (public track endpoint)
# ─────────────────────────────────────────────────────────────────────────────

class TrackEventRequest(BaseModel):
    visitor_id:   str = Field(..., max_length=64)
    session_id:   str = Field(..., max_length=64)
    event_type:   str = Field(..., max_length=64)
    page:         Optional[str] = Field(None, max_length=255)
    meta:         Optional[Dict[str, Any]] = None
    # Device info — sent on session start (first event)
    device_type:  Optional[str] = Field(None, max_length=32)
    browser:      Optional[str] = Field(None, max_length=64)
    os:           Optional[str] = Field(None, max_length=64)
    screen_width: Optional[int] = None


class SessionEndRequest(BaseModel):
    session_id:  str   = Field(..., max_length=64)
    duration_sec: float = Field(..., ge=0)


# ─────────────────────────────────────────────────────────────────────────────
# Outbound (admin dashboard)
# ─────────────────────────────────────────────────────────────────────────────

class TrafficOverview(BaseModel):
    unique_visitors:       int
    sessions:              int
    page_views:            int
    avg_session_duration:  Optional[float]   # seconds
    bounce_rate:           Optional[float]   # % sessions with 1 page view


class DailyPoint(BaseModel):
    date:            str   # YYYY-MM-DD
    unique_visitors: int
    sessions:        int
    page_views:      int


class HourlyPoint(BaseModel):
    hour:     int   # 0-23
    visitors: int
    sessions: int
    events:   int


class PageStat(BaseModel):
    page:          str
    views:         int
    avg_time_sec:  Optional[float]


class ActionCount(BaseModel):
    event_type: str
    count:      int


class DeviceStat(BaseModel):
    device_type: str
    count:       int
    pct:         float


class BrowserStat(BaseModel):
    browser: str
    count:   int
    pct:     float


class DeviceBreakdown(BaseModel):
    devices:  List[DeviceStat]
    browsers: List[BrowserStat]


class SessionRow(BaseModel):
    session_id:   str
    visitor_id:   str
    started_at:   datetime
    duration_sec: Optional[float]
    page_views:   int
    device_type:  Optional[str]
    browser:      Optional[str]


class EventEntry(BaseModel):
    id:         int
    event_type: str
    page:       Optional[str]
    timestamp:  datetime
    meta:       Optional[Dict[str, Any]]


class SessionTimeline(BaseModel):
    session_id: str
    events:     List[EventEntry]
