"""
admin/routes.py
---------------
FastAPI router for the Admin Dashboard.

All routes require the `require_admin` dependency (JWT + DB is_admin check).

Endpoints
─────────
  GET  /api/admin/dashboard
      Five card stats + recent registrations (last 5).

  GET  /api/admin/events/{event_id}/registrations
      Paginated, filtered, searchable list of registrations for one event.
      Query params: page, limit, search, status, date_from, date_to,
                    sort_by, sort_order.

  GET  /api/admin/registrations/{registration_id}
      Full detail for a single registration (responses with field labels,
      team members, uploaded file URLs).

  GET  /api/admin/events/{event_id}/export
      Stream a UTF-8 CSV file as a download.
      Content-Disposition: attachment; filename="<event_title>_registrations.csv"

  DELETE /api/admin/registrations/{registration_id}
      Hard-delete a registration and all cascade-linked rows.

Performance notes
─────────────────
  • Dashboard endpoint completes in ≤ 3 DB round-trips.
  • Registration list uses a single JOIN query for both data and COUNT.
  • CSV export fetches all responses in ONE IN-clause query (no N+1).
  • StreamingResponse used for CSV so large files never buffer in RAM.
"""

from __future__ import annotations

import logging
import math
import re
from datetime import date
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db import async_session
from events.admin import require_admin
from admin.queries import (
    dashboard_stats,
    delete_registration,
    export_registrations_csv,
    recent_registrations,
    registration_detail_admin,
    search_registrations,
    log_audit_action,
)
from admin.schemas import (
    AdminRegistrationDetail,
    AdminRegistrationRow,
    DashboardResponse,
    DeleteRegistrationResponse,
    PaginatedRegistrationsResponse,
    StatusBreakdown,
    TeamDetail,
    TeamMemberDetail,
    UploadedFileDetail,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Dashboard"])


# ─── DB dependency ────────────────────────────────────────────────────────────

async def get_db():
    async with async_session() as session:
        yield session


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _row_to_reg_row(row: dict) -> AdminRegistrationRow:
    return AdminRegistrationRow(
        id            = row["id"],
        event_id      = row["event_id"],
        event_title   = row.get("event_title") or f"Event #{row['event_id']}",
        user_id       = row["user_id"],
        user_name     = row.get("user_name") or "",
        user_email    = row.get("user_email") or "",
        team_name     = row.get("team_name"),
        registered_at = row["registered_at"],
    )


def _row_to_detail(row: dict) -> AdminRegistrationDetail:
    team = None
    if row.get("team"):
        t = row["team"]
        team = TeamDetail(
            id        = t["id"],
            team_name = t["team_name"],
            leader_id = t["leader_id"],
            members   = [
                TeamMemberDetail(
                    id           = m["id"],
                    member_name  = m["member_name"],
                    member_email = m["member_email"],
                )
                for m in t.get("members", [])
            ],
        )

    files = [
        UploadedFileDetail(
            id            = f["id"],
            field_id      = f["field_id"],
            field_label   = f.get("field_label", f"field_{f['field_id']}"),
            file_url      = f["file_url"],
            original_name = f.get("original_name"),
            uploaded_at   = f["uploaded_at"],
        )
        for f in row.get("uploaded_files", [])
    ]

    return AdminRegistrationDetail(
        id             = row["id"],
        event_id       = row["event_id"],
        event_title    = row.get("event_title") or f"Event #{row['event_id']}",
        user_id        = row["user_id"],
        user_name      = row.get("user_name") or "",
        user_email     = row.get("user_email") or "",
        team_name      = row.get("team_name"),
        registered_at  = row["registered_at"],
        responses_flat = row.get("responses_flat", {}),
        team           = team,
        uploaded_files = files,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/dashboard",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin dashboard stats",
    description=(
        "Returns all dashboard card values (total events, registrations, "
        "active/upcoming/completed) and the 5 most recent registrations. "
        "Completed in ≤ 3 DB queries."
    ),
)
async def get_dashboard(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        stats  = await dashboard_stats(db)
        recent = await recent_registrations(db, limit=5)
    except Exception as exc:
        logger.exception("Dashboard stats failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard. Please try again.",
        )

    breakdown = StatusBreakdown(
        upcoming            = stats["upcoming"],
        registration_open   = stats["registration_open"],
        registration_closed = stats["registration_closed"],
        completed           = stats["completed"],
    )

    return DashboardResponse(
        total_events         = stats["total_events"],
        total_registrations  = stats["total_registrations"],
        active_events        = stats["registration_open"],
        upcoming_events      = stats["upcoming"],
        completed_events     = stats["completed"],
        status_breakdown     = breakdown,
        recent_registrations = [_row_to_reg_row(r) for r in recent],
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/events/{event_id}/registrations
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/events/{event_id}/registrations",
    response_model=PaginatedRegistrationsResponse,
    status_code=status.HTTP_200_OK,
    summary="List registrations for an event (admin)",
    description=(
        "Paginated, searchable, filterable list of all registrations for one event. "
        "Search matches user name, email, team name, and event title."
    ),
)
async def list_event_registrations(
    event_id: int,
    page:    int           = Query(default=1,   ge=1,    description="Page number."),
    limit:   int           = Query(default=20,  ge=1, le=100, description="Rows per page."),
    search:  Optional[str] = Query(default=None, description="Full-text search term."),
    event_status: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by event status.",
        pattern="^(upcoming|registration_open|registration_closed|completed)$",
    ),
    date_from: Optional[date] = Query(default=None, description="Registrations on or after this date (YYYY-MM-DD)."),
    date_to:   Optional[date] = Query(default=None, description="Registrations on or before this date (YYYY-MM-DD)."),
    sort_by:    str = Query(default="registered_at", pattern="^(registered_at|user_name|event_title|id)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        rows, total = await search_registrations(
            session    = db,
            event_id   = event_id,
            search     = search,
            status     = event_status,
            date_from  = date_from,
            date_to    = date_to,
            page       = page,
            limit      = limit,
            sort_by    = sort_by,
            sort_order = sort_order,
        )
    except Exception as exc:
        logger.exception("List registrations failed event_id=%d: %s", event_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch registrations.",
        )

    total_pages = math.ceil(total / limit) if total > 0 else 1
    return PaginatedRegistrationsResponse(
        total         = total,
        page          = page,
        limit         = limit,
        total_pages   = total_pages,
        registrations = [_row_to_reg_row(r) for r in rows],
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/registrations/{registration_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/registrations/{registration_id}",
    response_model=AdminRegistrationDetail,
    status_code=status.HTTP_200_OK,
    summary="Get full registration detail (admin)",
    description=(
        "Returns the complete registration record including form responses "
        "(with field labels, not IDs), team members, and uploaded file URLs."
    ),
)
async def get_registration_detail(
    registration_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        row = await registration_detail_admin(db, registration_id)
    except Exception as exc:
        logger.exception("Detail fetch failed id=%d: %s", registration_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch registration detail.",
        )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration id={registration_id} not found.",
        )

    return _row_to_detail(row)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/events/{event_id}/export
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/events/{event_id}/export",
    status_code=status.HTTP_200_OK,
    summary="Export event registrations as CSV",
    description=(
        "Streams a UTF-8 CSV file containing all registrations for the event. "
        "Columns include: registration_id, registered_at, user_name, user_email, "
        "team_name, and one column per form field. "
        "Checkbox answers are joined as comma-separated strings."
    ),
    responses={
        200: {
            "content": {"text/csv": {}},
            "description": "CSV file download.",
        }
    },
)
async def export_event_registrations_csv(
    event_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        csv_content, event_title = await export_registrations_csv(db, event_id)
    except Exception as exc:
        logger.exception("CSV export failed event_id=%d: %s", event_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate CSV export.",
        )

    # Sanitise the event title for use in a filename
    safe_title = re.sub(r"[^\w\-_\.]", "_", event_title)[:60]
    filename   = f"{safe_title}_registrations.csv"

    def _csv_stream():
        yield csv_content.encode("utf-8-sig")   # BOM for Excel compatibility

    return StreamingResponse(
        _csv_stream(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control":       "no-cache",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/admin/registrations/{registration_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/api/admin/registrations/{registration_id}",
    response_model=DeleteRegistrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a registration (admin)",
    description=(
        "Permanently deletes a registration and all cascade-linked rows "
        "(form responses, team, team members, uploaded file records). "
        "**This action cannot be undone.**"
    ),
)
async def delete_registration_admin(
    registration_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        # Fetch the registration state before deleting for audit logging
        reg_state = await registration_detail_admin(db, registration_id)
        
        deleted = await delete_registration(db, registration_id)
        
        if deleted and reg_state:
            # Log the destructive action
            await log_audit_action(
                session=db,
                admin_id=admin.id,
                admin_email=admin.email,
                action="DELETE_REGISTRATION",
                entity_type="EventRegistration",
                entity_id=str(registration_id),
                before_state=reg_state,
                after_state=None,
            )
            
    except Exception as exc:
        logger.exception("Delete failed id=%d: %s", registration_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete registration.",
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration id={registration_id} not found.",
        )

    return DeleteRegistrationResponse(
        message=f"Registration id={registration_id} and all related data deleted successfully."
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/files/{filename}
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "/api/admin/files/{filename:path}",
    response_class=FileResponse,
    summary="Download uploaded file",
    description="Serve private uploaded files to admins only.",
)
async def get_private_file(filename: str, _: None = Depends(require_admin)):
    from forms.file_handler import get_upload_dir
    upload_dir = get_upload_dir().resolve()

    # Containment is checked BEFORE touching the filesystem. Doing the
    # existence check first leaked whether arbitrary paths exist on the host
    # (404 vs 403), and `str.startswith` was not a correct containment test:
    # "/app/private_uploads_backup" has "/app/private_uploads" as a string
    # prefix while living outside it. `relative_to` compares path components.
    try:
        resolved_path = (upload_dir / filename).resolve()
        resolved_path.relative_to(upload_dir)
    except (ValueError, OSError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if not resolved_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Uploads are attacker-influenced bytes. Forcing a download with a generic
    # content type stops the browser rendering one in this origin, which would
    # otherwise be stored XSS against the admin viewing it.
    return FileResponse(
        path=resolved_path,
        media_type="application/octet-stream",
        filename=resolved_path.name,
        headers={
            "Content-Disposition": f'attachment; filename="{resolved_path.name}"',
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )
