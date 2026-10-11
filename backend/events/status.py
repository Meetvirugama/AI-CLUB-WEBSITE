"""
events/status.py
----------------
Auto-status computation engine for ClubEvent records.

Logic
─────
Given the current IST time and an event's four time boundaries, the status
is determined by the following priority-ordered rules:

  1. completed          — current IST datetime is AFTER event_end_date + end_time
                          (end_time is interpreted as IST — admin enters IST times)
  2. registration_open  — now is BETWEEN registration_start and registration_end (inclusive)
  3. registration_closed— registration_end has passed but the event hasn't started yet
  4. upcoming           — registration hasn't opened yet

All datetime comparisons are done in UTC after converting from IST where needed.
registration_start / registration_end come from the frontend as ISO 8601 with +05:30 offset
(sent explicitly as IST by parseLocalDateTime in utils.ts).

No database writes happen inside this module — that is the service layer's job.
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone, timedelta
from typing import Literal, Optional

EventStatus = Literal["upcoming", "registration_open", "registration_closed", "completed"]

# IST is UTC+05:30
IST = timezone(timedelta(hours=5, minutes=30))


def compute_status(
    event_end_date: Optional[date] = None,
    end_time: Optional[time] = None,
    registration_start: Optional[datetime] = None,
    registration_end: Optional[datetime] = None,
    now: Optional[datetime] = None,
) -> EventStatus:
    """
    Compute the correct event status for the given moment.

    event_end_date and end_time are treated as **IST** values because admins
    enter local (Indian) times in the admin panel.

    registration_start / registration_end are timezone-aware datetimes
    (the frontend sends them with +05:30 offset, stored as UTC in DB).
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # Rule 1 — event is over
    # Combine event_end_date + end_time treating both as IST
    if event_end_date and end_time:
        # Build an IST-aware datetime so comparison with UTC now is correct
        event_end_dt = datetime.combine(event_end_date, end_time, tzinfo=IST)
        if now > event_end_dt:
            return "completed"

    # Rule 2 — registration window
    if registration_start and registration_end:
        reg_start = _to_utc(registration_start)
        reg_end   = _to_utc(registration_end)
        if reg_start <= now <= reg_end:
            return "registration_open"
        if now > reg_end:
            return "registration_closed"

    # Rule 4 — fallback
    return "upcoming"


def _to_utc(dt: datetime) -> datetime:
    """Ensure a datetime is UTC-aware.
    Naive datetimes are assumed IST (admin's local timezone) and converted.
    Timezone-aware datetimes are converted to UTC regardless of their offset.
    """
    if dt.tzinfo is None:
        # Treat naive datetimes as IST (admin entered without offset)
        return dt.replace(tzinfo=IST).astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)
