"""
admin/queries.py
----------------
Optimized SQL query builders for the Admin Dashboard.

All queries use SQLAlchemy Core expressions (not ORM lazy-loading) to:
  • Avoid N+1 queries — everything fetched in a single round-trip where possible.
  • Use COUNT(*) for pagination totals — no full row scans.
  • Use ilike for case-insensitive search across multiple text columns.
  • Use column-level indexes (event_id, user_id, registered_at) for filters.

Functions
─────────
  dashboard_stats       — five card counts in two queries (events + registrations)
  search_registrations  — paginated, filtered, searchable registration list
  registration_detail   — single registration with all joined data
  delete_registration   — hard delete with existence check
  export_registrations  — full CSV data for one event (no pagination)

Query strategy for search_registrations
────────────────────────────────────────
  We JOIN event_registrations → club_events → users in a single query.
  The search term is applied across: user name, user email, team name,
  and event title — all via ilike with the same parameter.
  Filters (event_id, status, date range) are applied as WHERE clauses.
  COUNT is computed with the same WHERE/JOIN conditions but without
  LIMIT/OFFSET to get the true total.
"""

from __future__ import annotations

import csv
import io
import json
import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, delete, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Audit Log Helper
# ─────────────────────────────────────────────────────────────────────────────

async def log_audit_action(
    session: AsyncSession,
    admin_id: int,
    admin_email: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    before_state: Optional[Dict] = None,
    after_state: Optional[Dict] = None,
    ip_address: Optional[str] = None,
):
    from admin.models import AuditLog
    audit = AuditLog(
        admin_id=admin_id,
        admin_email=admin_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address,
    )
    session.add(audit)
    await session.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Lazy imports (avoid circular deps at module load time)
# ─────────────────────────────────────────────────────────────────────────────

def _models():
    from events.models import ClubEvent
    from forms.models import FormField, FormTemplate
    from registrations.models import (
        EventRegistration, RegistrationResponse,
        Team, TeamMember, UploadedFile,
    )
    from auth.models import User
    return (
        ClubEvent, FormField, FormTemplate,
        EventRegistration, RegistrationResponse,
        Team, TeamMember, UploadedFile, User,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. Dashboard statistics
# ─────────────────────────────────────────────────────────────────────────────

async def dashboard_stats(session: AsyncSession) -> Dict[str, Any]:
    """
    Fetch all five card values in two efficient COUNT queries.

    Returns a dict with keys:
        total_events, total_registrations,
        upcoming, registration_open, registration_closed, completed
    """
    ClubEvent, _, _, EventRegistration, *_ = _models()

    # ── Event status counts (one query, GROUP BY) ──────────────────────────
    status_rows = await session.execute(
        select(ClubEvent.status, func.count(ClubEvent.id).label("cnt"))
        .group_by(ClubEvent.status)
    )
    status_map: Dict[str, int] = {row.status: row.cnt for row in status_rows}

    total_events        = sum(status_map.values())
    upcoming            = status_map.get("upcoming", 0)
    registration_open   = status_map.get("registration_open", 0)
    registration_closed = status_map.get("registration_closed", 0)
    completed           = status_map.get("completed", 0)

    # ── Total registrations (one COUNT) ────────────────────────────────────
    total_reg_row = await session.execute(
        select(func.count(EventRegistration.id))
    )
    total_registrations = total_reg_row.scalar_one()

    return {
        "total_events":        total_events,
        "total_registrations": total_registrations,
        "upcoming":            upcoming,
        "registration_open":   registration_open,
        "registration_closed": registration_closed,
        "completed":           completed,
    }


async def recent_registrations(session: AsyncSession, limit: int = 5) -> List[Dict]:
    """
    Fetch the N most recent registrations with joined user + event info.
    Used to populate the 'recent activity' section of the dashboard.
    """
    (ClubEvent, _, __, EventRegistration, *___) = _models()[:9]
    from auth.models import User  # noqa: PLC0415

    rows = await session.execute(
        select(
            EventRegistration.id,
            EventRegistration.event_id,
            EventRegistration.user_id,
            EventRegistration.team_name,
            EventRegistration.registered_at,
            ClubEvent.title.label("event_title"),
            User.name.label("user_name"),
            User.email.label("user_email"),
        )
        .join(ClubEvent, ClubEvent.id == EventRegistration.event_id, isouter=True)
        .join(User, User.id == EventRegistration.user_id, isouter=True)
        .order_by(EventRegistration.registered_at.desc())
        .limit(limit)
    )
    return [dict(row._mapping) for row in rows]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Paginated, filtered, searchable registration list
# ─────────────────────────────────────────────────────────────────────────────

async def search_registrations(
    session:     AsyncSession,
    event_id:    Optional[int]  = None,
    search:      Optional[str]  = None,
    status:      Optional[str]  = None,
    date_from:   Optional[date] = None,
    date_to:     Optional[date] = None,
    page:        int            = 1,
    limit:       int            = 20,
    sort_by:     str            = "registered_at",
    sort_order:  str            = "desc",
) -> Tuple[List[Dict], int]:
    """
    Optimised, single-query registration search with pagination.

    All filters are applied before LIMIT/OFFSET for correct totals.
    The total count is computed with the same WHERE clause.

    Args:
        event_id:   Filter to one event (None = all events).
        search:     Term matched against user name, email, team name, event title.
        status:     Filter by event status (e.g. 'registration_open').
        date_from:  Filter registrations on or after this date.
        date_to:    Filter registrations on or before this date.
        page:       1-indexed page number.
        limit:      Rows per page (max 100).
        sort_by:    Column to sort by (registered_at | user_name | event_title).
        sort_order: 'asc' or 'desc'.

    Returns:
        (list_of_dicts, total_count)
    """
    (ClubEvent, _, __, EventRegistration, *___) = _models()[:9]
    from auth.models import User  # noqa: PLC0415

    limit = min(limit, 100)
    offset = (page - 1) * limit

    # ── Base columns ──────────────────────────────────────────────────────────
    cols = [
        EventRegistration.id,
        EventRegistration.event_id,
        EventRegistration.user_id,
        EventRegistration.team_name,
        EventRegistration.registered_at,
        ClubEvent.title.label("event_title"),
        User.name.label("user_name"),
        User.email.label("user_email"),
    ]

    base = (
        select(*cols)
        .join(ClubEvent, ClubEvent.id == EventRegistration.event_id, isouter=True)
        .join(User, User.id == EventRegistration.user_id, isouter=True)
    )

    count_base = (
        select(func.count(EventRegistration.id))
        .join(ClubEvent, ClubEvent.id == EventRegistration.event_id, isouter=True)
        .join(User, User.id == EventRegistration.user_id, isouter=True)
    )

    # ── Build WHERE conditions ────────────────────────────────────────────────
    conditions = []

    if event_id is not None:
        conditions.append(EventRegistration.event_id == event_id)

    if status:
        conditions.append(ClubEvent.status == status)

    if date_from:
        conditions.append(
            func.date(EventRegistration.registered_at) >= date_from
        )

    if date_to:
        conditions.append(
            func.date(EventRegistration.registered_at) <= date_to
        )

    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
                EventRegistration.team_name.ilike(term),
                ClubEvent.title.ilike(term),
            )
        )

    if conditions:
        where_clause = and_(*conditions)
        base        = base.where(where_clause)
        count_base  = count_base.where(where_clause)

    # ── Sorting ───────────────────────────────────────────────────────────────
    sort_col_map = {
        "registered_at": EventRegistration.registered_at,
        "user_name":     User.name,
        "event_title":   ClubEvent.title,
        "id":            EventRegistration.id,
    }
    sort_col = sort_col_map.get(sort_by, EventRegistration.registered_at)
    if sort_order.lower() == "asc":
        base = base.order_by(sort_col.asc())
    else:
        base = base.order_by(sort_col.desc())

    # ── Execute both queries ──────────────────────────────────────────────────
    total_result = await session.execute(count_base)
    total        = total_result.scalar_one()

    rows_result = await session.execute(base.offset(offset).limit(limit))
    rows        = [dict(row._mapping) for row in rows_result]

    return rows, total


# ─────────────────────────────────────────────────────────────────────────────
# 3. Single registration detail (admin view)
# ─────────────────────────────────────────────────────────────────────────────

async def registration_detail_admin(
    session:         AsyncSession,
    registration_id: int,
) -> Optional[Dict[str, Any]]:
    """
    Fetch one registration with:
      • User info (name, email)
      • Event title
      • All form responses with field labels (not raw IDs)
      • Team + members (if team event)
      • Uploaded files with field labels

    Uses separate targeted queries instead of a mega-JOIN to keep
    the result structure clean and avoid column name collisions.
    Returns None if the registration doesn't exist.
    """
    (
        ClubEvent, FormField, FormTemplate,
        EventRegistration, RegistrationResponse,
        Team, TeamMember, UploadedFile, User,
    ) = _models()

    # ── Base registration row ─────────────────────────────────────────────────
    reg_row = await session.execute(
        select(
            EventRegistration.id,
            EventRegistration.event_id,
            EventRegistration.user_id,
            EventRegistration.team_name,
            EventRegistration.registered_at,
            ClubEvent.title.label("event_title"),
            User.name.label("user_name"),
            User.email.label("user_email"),
        )
        .join(ClubEvent, ClubEvent.id == EventRegistration.event_id, isouter=True)
        .join(User, User.id == EventRegistration.user_id, isouter=True)
        .where(EventRegistration.id == registration_id)
    )
    reg = reg_row.first()
    if reg is None:
        return None

    reg_dict = dict(reg._mapping)
    event_id = reg_dict["event_id"]

    # ── Field label lookup (template → fields) ────────────────────────────────
    field_label_map: Dict[int, str] = {}
    tmpl_result = await session.execute(
        select(FormTemplate).where(FormTemplate.event_id == event_id)
    )
    template = tmpl_result.scalars().first()
    if template:
        fields_result = await session.execute(
            select(FormField.id, FormField.label)
            .where(FormField.template_id == template.id)
        )
        for frow in fields_result:
            field_label_map[frow.id] = frow.label

    # ── Form responses → flat label: value dict ───────────────────────────────
    resp_result = await session.execute(
        select(RegistrationResponse)
        .where(RegistrationResponse.registration_id == registration_id)
    )
    responses_flat: Dict[str, Any] = {}
    for resp in resp_result.scalars().all():
        label = field_label_map.get(resp.field_id, f"field_{resp.field_id}")
        raw   = resp.value
        # Deserialize checkbox JSON arrays
        if raw and raw.startswith("["):
            try:
                raw = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass
        responses_flat[label] = raw

    # ── Team + members ────────────────────────────────────────────────────────
    team_dict: Optional[Dict] = None
    team_result = await session.execute(
        select(Team).where(Team.registration_id == registration_id)
    )
    team = team_result.scalars().first()
    if team:
        mem_result = await session.execute(
            select(TeamMember).where(TeamMember.team_id == team.id)
        )
        members = [
            {
                "id": m.id,
                "member_name": m.member_name,
                "member_email": m.member_email,
            }
            for m in mem_result.scalars().all()
        ]
        team_dict = {
            "id":        team.id,
            "team_name": team.team_name,
            "leader_id": team.leader_id,
            "members":   members,
        }

    # ── Uploaded files (with labels) ──────────────────────────────────────────
    file_result = await session.execute(
        select(UploadedFile).where(UploadedFile.registration_id == registration_id)
    )
    files = [
        {
            "id":            uf.id,
            "field_id":      uf.field_id,
            "field_label":   field_label_map.get(uf.field_id, f"field_{uf.field_id}"),
            "file_url":      uf.file_url,
            "original_name": uf.original_name,
            "uploaded_at":   uf.uploaded_at,
        }
        for uf in file_result.scalars().all()
    ]

    return {
        **reg_dict,
        "responses_flat": responses_flat,
        "team":           team_dict,
        "uploaded_files": files,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Delete registration
# ─────────────────────────────────────────────────────────────────────────────

async def delete_registration(
    session:         AsyncSession,
    registration_id: int,
) -> bool:
    """
    Hard-delete a registration and all cascade-linked rows
    (responses, team, team_members, uploaded_files).

    SQLAlchemy's CASCADE in the ORM definitions handles child rows automatically.
    Returns True if a row was deleted, False if not found.
    """
    (_, __, ___, EventRegistration, *____) = _models()

    result = await session.execute(
        select(EventRegistration).where(EventRegistration.id == registration_id)
    )
    reg = result.scalars().first()
    if reg is None:
        return False

    await session.delete(reg)
    await session.commit()
    logger.info("Admin deleted registration id=%d", registration_id)
    return True


# ─────────────────────────────────────────────────────────────────────────────
# 5. CSV export
# ─────────────────────────────────────────────────────────────────────────────

async def export_registrations_csv(
    session:  AsyncSession,
    event_id: int,
) -> Tuple[str, str]:
    """
    Export all registrations for one event as a UTF-8 CSV string.

    Columns
    ───────
    registration_id | registered_at | user_name | user_email |
    team_name       | [dynamic field labels...]

    Strategy
    ────────
    1. Fetch the event's form fields to build the column headers.
    2. Bulk-fetch all registrations for the event.
    3. Bulk-fetch all responses for those registrations in ONE query.
    4. Build a response lookup dict: {reg_id: {field_id: value}}.
    5. Stream rows into a StringIO buffer.

    Returns:
        (csv_string, event_title)
    """
    (
        ClubEvent, FormField, FormTemplate,
        EventRegistration, RegistrationResponse,
        Team, _, UploadedFile, User,
    ) = _models()

    # ── Event title ───────────────────────────────────────────────────────────
    ev_result = await session.execute(
        select(ClubEvent).where(ClubEvent.id == event_id)
    )
    event = ev_result.scalars().first()
    event_title = event.title if event else f"event_{event_id}"

    # ── Form fields (ordered) ─────────────────────────────────────────────────
    tmpl_result = await session.execute(
        select(FormTemplate).where(FormTemplate.event_id == event_id)
    )
    template = tmpl_result.scalars().first()

    field_rows: List = []
    if template:
        fr = await session.execute(
            select(FormField)
            .where(FormField.template_id == template.id)
            .order_by(FormField.order_no.asc(), FormField.id.asc())
        )
        field_rows = list(fr.scalars().all())

    field_id_to_label = {f.id: f.label for f in field_rows}

    # ── Registrations (with user info) ────────────────────────────────────────
    reg_rows = await session.execute(
        select(
            EventRegistration.id,
            EventRegistration.user_id,
            EventRegistration.team_name,
            EventRegistration.registered_at,
            User.name.label("user_name"),
            User.email.label("user_email"),
        )
        .join(User, User.id == EventRegistration.user_id, isouter=True)
        .where(EventRegistration.event_id == event_id)
        .order_by(EventRegistration.registered_at.asc())
    )
    registrations = [dict(r._mapping) for r in reg_rows]

    if not registrations:
        # Return empty CSV with just headers
        header_cols = (
            ["registration_id", "registered_at", "user_name", "user_email", "team_name"]
            + [f.label for f in field_rows]
        )
        buf = io.StringIO()
        csv.writer(buf).writerow(header_cols)
        return buf.getvalue(), event_title

    reg_ids = [r["id"] for r in registrations]

    # ── Bulk-fetch all responses in ONE query ─────────────────────────────────
    all_resp = await session.execute(
        select(RegistrationResponse)
        .where(RegistrationResponse.registration_id.in_(reg_ids))
    )
    # Build lookup: {reg_id: {field_id: value}}
    response_lookup: Dict[int, Dict[int, Any]] = {}
    for resp in all_resp.scalars().all():
        raw = resp.value
        if raw and raw.startswith("["):
            try:
                raw = ", ".join(json.loads(raw))   # flatten checkbox list → "A, B, C"
            except (json.JSONDecodeError, TypeError):
                pass
        response_lookup.setdefault(resp.registration_id, {})[resp.field_id] = raw

    # ── Build CSV ─────────────────────────────────────────────────────────────
    header_cols = (
        ["registration_id", "registered_at", "user_name", "user_email", "team_name"]
        + [f.label for f in field_rows]
    )

    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_ALL)
    writer.writerow(header_cols)

    for reg in registrations:
        reg_id    = reg["id"]
        resp_dict = response_lookup.get(reg_id, {})
        base_row  = [
            reg_id,
            reg["registered_at"].isoformat() if reg["registered_at"] else "",
            reg["user_name"] or "",
            reg["user_email"] or "",
            reg["team_name"] or "",
        ]
        field_values = [resp_dict.get(f.id, "") or "" for f in field_rows]
        writer.writerow(base_row + field_values)

    return buf.getvalue(), event_title
