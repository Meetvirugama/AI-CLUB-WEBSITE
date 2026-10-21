"""
events/routes.py
----------------
FastAPI router for the Event Management module.

Admin endpoints (JWT + super-admin required)
────────────────────────────────────────────
  POST   /api/admin/events          Create a new event
  PUT    /api/admin/events/{id}     Update an existing event (partial)
  DELETE /api/admin/events/{id}     Delete an event

Public endpoints (no auth required)
────────────────────────────────────
  GET    /api/events                List all events (filterable, paginated)
  GET    /api/events/{id}           Get a single event by id

Error handling
──────────────
• 400 — validation errors (Pydantic) surfaced as structured JSON via FastAPI default handler
• 401 — unauthenticated (from auth middleware)
• 403 — authenticated but not super-admin
• 404 — event not found
• 500 — unexpected server error (logged, generic message returned)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from db import async_session
from events.admin import require_admin
from events.schemas import (
    EventCreateRequest,
    EventCreateResponse,
    EventDeleteResponse,
    EventListResponse,
    EventResponse,
    EventUpdateRequest,
    EventUpdateResponse,
    EventWinnersShowcaseItem,
)
from events.service import (
    create_event,
    delete_event,
    get_event_by_id,
    list_events,
    update_event,
)
from events.winners_service import get_winners_showcase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Events"])


# ─── Dependency: yield a DB session ──────────────────────────────────────────

async def get_db():
    async with async_session() as session:
        yield session


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: POST /api/admin/events
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/admin/events",
    response_model=EventCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
    description=(
        "**Admin only.** Creates a new event. Status is computed automatically "
        "based on the provided dates and the current UTC time."
    ),
)
async def create_event_endpoint(
    data: EventCreateRequest,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new club event (super-admin only)."""
    try:
        ev = await create_event(db, data)
        return EventCreateResponse(
            message="Event created successfully.",
            event=EventResponse.model_validate(ev),
        )
    except Exception as exc:
        logger.exception("Failed to create event: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event. Please try again.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: PUT /api/admin/events/{event_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/api/admin/events/{event_id}",
    response_model=EventUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing event",
    description=(
        "**Admin only.** Partially updates an event. Only supplied fields are "
        "modified. Status is recomputed automatically after any change."
    ),
)
async def update_event_endpoint(
    event_id: int,
    data: EventUpdateRequest,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a club event by id (super-admin only)."""
    try:
        ev = await update_event(db, event_id, data)
        return EventUpdateResponse(event=EventResponse.model_validate(ev))
    except ValueError as exc:
        # "Event not found" comes from the service as ValueError
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Failed to update event id=%d: %s", event_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update event. Please try again.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: DELETE /api/admin/events/{event_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/api/admin/events/{event_id}",
    response_model=EventDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an event",
    description="**Admin only.** Permanently deletes an event by id.",
)
async def delete_event_endpoint(
    event_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hard-delete a club event by id (super-admin only)."""
    deleted = await delete_event(db, event_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id={event_id} not found.",
        )
    return EventDeleteResponse(message=f"Event id={event_id} deleted successfully.")


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC: GET /api/events
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/events",
    response_model=EventListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all events",
    description=(
        "Public endpoint. Returns a paginated list of events. "
        "Filter by `status` (upcoming / registration_open / registration_closed / completed) "
        "or `category`. Status is lazily refreshed on each read."
    ),
)
async def list_events_endpoint(
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by event status.",
        pattern="^(upcoming|registration_open|registration_closed|completed|active|all)$",
    ),
    category: Optional[str] = Query(
        default=None,
        description="Filter by category (case-insensitive).",
    ),
    page:  int = Query(default=1,  ge=1,   description="Page number (1-indexed)."),
    limit: int = Query(default=20, ge=1, le=100, description="Results per page."),
    db: AsyncSession = Depends(get_db),
):
    """Public paginated listing of all club events."""
    try:
        events, total = await list_events(
            db,
            status_filter=status_filter,
            category_filter=category,
            page=page,
            limit=limit,
        )
        return EventListResponse(
            total=total,
            page=page,
            limit=limit,
            events=[EventResponse.model_validate(ev) for ev in events],
        )
    except Exception as exc:
        logger.exception("Failed to list events: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve events. Please try again.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC: GET /api/events/winners (and GET /api/winners)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/events/winners",
    response_model=list[EventWinnersShowcaseItem],
    status_code=status.HTTP_200_OK,
    summary="Get official event winners showcase",
    description="Public endpoint. Returns data-driven results, podium standings, and archives for event winners.",
)
@router.get(
    "/api/winners",
    response_model=list[EventWinnersShowcaseItem],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def get_winners_showcase_endpoint(
    event_id: Optional[str] = Query(default=None, description="Filter by event identifier (e.g. 'club-16', '16', 'past-6')"),
    year: Optional[str] = Query(default=None, description="Filter by competition year (e.g. '2026')"),
    category: Optional[str] = Query(default=None, description="Filter by category (e.g. 'Hackathon', 'Competition')"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve official event winners showcase with podium and archive listings."""
    try:
        data = await get_winners_showcase(db, event_id=event_id, year=year, category=category)
        return [EventWinnersShowcaseItem.model_validate(item) for item in data]
    except Exception as exc:
        logger.exception("Failed to retrieve winners showcase: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve event winners. Please try again.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC: GET /api/events/{event_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/events/{event_id}",
    response_model=EventResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single event",
    description=(
        "Public endpoint. Returns full details for one event. "
        "Status is lazily refreshed on read."
    ),
)
async def get_event_endpoint(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Fetch one club event by id."""
    ev = await get_event_by_id(db, event_id)
    if ev is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id={event_id} not found.",
        )
    return EventResponse.model_validate(ev)
