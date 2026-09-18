"""
registrations/service.py
------------------------
Business logic for the Event Registration system.

All DB writes happen inside explicit transactions.
The service layer is HTTP-free: it only knows about domain objects and
the DB session. Routes call into here; validators are invoked here too.

Public functions
────────────────
  register_for_event    — complete registration flow (validate → write all tables)
  get_user_registrations— all registrations for the authenticated user
  get_event_registrations — all registrations for an event (admin)
  get_registration_detail — fetch one registration with all related data
  _build_detail           — assembles RegistrationDetail from DB rows
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy.exc

from registrations.models import (
    EventRegistration,
    RegistrationResponse,
    Team,
    TeamMember,
    UploadedFile,
)
from registrations.schemas import (
    RegistrationDetail,
    RegistrationListItem,
    RegistrationResponseItem,
    RegistrationSubmitRequest,
    TeamMemberResponse,
    TeamResponse,
    UploadedFileResponse,
)
from registrations.validators import (
    RegistrationError,
    check_event_exists,
    check_event_type_match,
    check_not_already_registered,
    check_registration_window,
    check_team_name_unique,
    check_team_size,
    validate_form_responses,
)

logger = logging.getLogger(__name__)


# ─── Main registration flow ────────────────────────────────────────────────────

async def register_for_event(
    session: AsyncSession,
    event_id: int,
    user_id: int,
    data: RegistrationSubmitRequest,
    uploaded_file_urls: Optional[dict] = None,
) -> RegistrationDetail:
    """
    Execute the full registration pipeline atomically.

    Pipeline
    ────────
    1. Run all guard checks (validators).
    2. Validate + normalise form responses.
    3. Write EventRegistration row.
    4. Write RegistrationResponse rows (one per submitted field).
    5. If team event: write Team + TeamMember rows.
    6. Write UploadedFile rows for any files.
    7. Assemble and return RegistrationDetail.

    Args:
        session:             Active async DB session.
        event_id:            Target event.
        user_id:             Authenticated user's id.
        data:                Validated request payload.
        uploaded_file_urls:  Dict of {field_id: (public_url, original_name)}
                             for file fields. Populated by the route layer
                             after saving uploads to disk.

    Raises:
        RegistrationError on any validation failure.
        Exception on unexpected DB errors.
    """
    # ── Guards ────────────────────────────────────────────────────────────────
    event = await check_event_exists(session, event_id)
    check_registration_window(event)
    await check_not_already_registered(session, event_id, user_id)
    check_event_type_match(event, data.team)
    check_team_size(event, data.team)

    if data.team:
        await check_team_name_unique(session, event_id, data.team.team_name)

    # ── Form validation ───────────────────────────────────────────────────────
    normalised_responses = await validate_form_responses(
        session, event_id, data.responses
    )

    # ── Step 3: EventRegistration ─────────────────────────────────────────────
    registration = EventRegistration(
        event_id      = event_id,
        user_id       = user_id,
        team_name     = data.team.team_name if data.team else None,
        registered_at = datetime.now(timezone.utc),
    )
    session.add(registration)
    # Flush to get registration.id before we write child rows
    await session.flush()

    # ── Step 4: RegistrationResponse rows ─────────────────────────────────────
    response_rows: List[RegistrationResponse] = []
    for field_id_str, value in normalised_responses.items():
        try:
            field_id_int = int(field_id_str)
        except (ValueError, TypeError):
            continue  # skip non-integer keys silently

        # Serialise list values (checkbox) if not already done by validator
        if isinstance(value, list):
            stored_value = json.dumps(value)
        else:
            stored_value = str(value) if value is not None else None

        row = RegistrationResponse(
            registration_id = registration.id,
            field_id        = field_id_int,
            value           = stored_value,
        )
        session.add(row)
        response_rows.append(row)

    # ── Step 5: Team + TeamMembers ────────────────────────────────────────────
    team_orm: Optional[Team] = None
    team_member_orms: List[TeamMember] = []

    if data.team:
        team_orm = Team(
            event_id        = event_id,
            registration_id = registration.id,
            leader_id       = user_id,
            team_name       = data.team.team_name.strip(),
        )
        session.add(team_orm)
        await session.flush()  # get team_orm.id

        for member in data.team.members:
            tm = TeamMember(
                team_id      = team_orm.id,
                member_name  = member.member_name,
                member_email = str(member.member_email),
            )
            session.add(tm)
            team_member_orms.append(tm)

    # ── Step 6: UploadedFile rows ─────────────────────────────────────────────
    file_rows: List[UploadedFile] = []
    for field_id_str, (file_url, original_name, local_path) in (uploaded_file_urls or {}).items():
        try:
            field_id_int = int(field_id_str)
        except (ValueError, TypeError):
            continue

        uf = UploadedFile(
            registration_id = registration.id,
            field_id        = field_id_int,
            file_url        = file_url,
            local_path      = local_path,
            original_name   = original_name,
        )
        session.add(uf)
        file_rows.append(uf)

    # ── Commit everything ─────────────────────────────────────────────────────
    try:
        await session.commit()
    except sqlalchemy.exc.IntegrityError as exc:
        await session.rollback()
        logger.error(f"DB IntegrityError during registration (duplicate?): {exc}")
        raise RegistrationError(
            "Registration failed due to a database integrity error. You or your team may have already registered.",
            status_code=409,
        ) from exc

    await session.refresh(registration)
    if team_orm:
        await session.refresh(team_orm)
        # Note: We omit refreshing every single response and file row to save DB round-trips.
        # The objects already have their populated data and IDs (if flushed).
    
    logger.info(
        "Registration id=%d created: event_id=%d user_id=%d team=%s",
        registration.id, event_id, user_id,
        data.team.team_name if data.team else "individual",
    )

    return _build_detail(
        registration  = registration,
        responses     = response_rows,
        team          = team_orm,
        team_members  = team_member_orms,
        uploaded_files= file_rows,
    )


# ─── Read helpers ──────────────────────────────────────────────────────────────

async def get_user_registrations(
    session: AsyncSession,
    user_id: int,
) -> List[RegistrationDetail]:
    """Return all registrations (with full detail) for the given user."""
    result = await session.execute(
        select(EventRegistration)
        .where(EventRegistration.user_id == user_id)
        .order_by(EventRegistration.registered_at.desc())
    )
    registrations = list(result.scalars().all())
    return [await _load_full_detail(session, reg) for reg in registrations]


async def get_event_registrations(
    session: AsyncSession,
    event_id: int,
) -> List[RegistrationDetail]:
    """Return all registrations (with full detail) for one event (admin use)."""
    result = await session.execute(
        select(EventRegistration)
        .where(EventRegistration.event_id == event_id)
        .order_by(EventRegistration.registered_at.desc())
    )
    registrations = list(result.scalars().all())
    return [await _load_full_detail(session, reg) for reg in registrations]


async def get_registration_detail(
    session: AsyncSession,
    registration_id: int,
) -> Optional[RegistrationDetail]:
    """Fetch one registration by id with all child rows."""
    result = await session.execute(
        select(EventRegistration).where(EventRegistration.id == registration_id)
    )
    reg = result.scalars().first()
    if reg is None:
        return None
    return await _load_full_detail(session, reg)


# ─── Private helpers ──────────────────────────────────────────────────────────

async def _load_full_detail(
    session: AsyncSession,
    registration: EventRegistration,
) -> RegistrationDetail:
    """Load all child rows for one EventRegistration and assemble a RegistrationDetail."""
    # Responses
    resp_result = await session.execute(
        select(RegistrationResponse)
        .where(RegistrationResponse.registration_id == registration.id)
    )
    responses = list(resp_result.scalars().all())

    # Team + members
    team_result = await session.execute(
        select(Team).where(Team.registration_id == registration.id)
    )
    team = team_result.scalars().first()

    team_members: List[TeamMember] = []
    if team:
        mem_result = await session.execute(
            select(TeamMember).where(TeamMember.team_id == team.id)
        )
        team_members = list(mem_result.scalars().all())

    # Uploaded files
    file_result = await session.execute(
        select(UploadedFile).where(UploadedFile.registration_id == registration.id)
    )
    uploaded_files = list(file_result.scalars().all())

    return _build_detail(
        registration   = registration,
        responses      = responses,
        team           = team,
        team_members   = team_members,
        uploaded_files = uploaded_files,
    )


def _build_detail(
    registration:   EventRegistration,
    responses:      List[RegistrationResponse],
    team:           Optional[Team],
    team_members:   List[TeamMember],
    uploaded_files: List[UploadedFile],
) -> RegistrationDetail:
    """Assemble a RegistrationDetail dataclass from ORM objects."""
    response_items = [RegistrationResponseItem.model_validate(r) for r in responses]

    team_resp: Optional[TeamResponse] = None
    if team:
        team_resp = TeamResponse(
            id        = team.id,
            team_name = team.team_name,
            leader_id = team.leader_id,
            members   = [
                TeamMemberResponse(
                    id           = m.id,
                    member_name  = m.member_name,
                    member_email = m.member_email,
                )
                for m in team_members
            ],
        )

    file_resps = [
        UploadedFileResponse(
            id            = uf.id,
            field_id      = uf.field_id,
            file_url      = uf.file_url,
            original_name = uf.original_name,
            uploaded_at   = uf.uploaded_at,
        )
        for uf in uploaded_files
    ]

    return RegistrationDetail(
        id             = registration.id,
        event_id       = registration.event_id,
        user_id        = registration.user_id,
        team_name      = registration.team_name,
        registered_at  = registration.registered_at,
        responses      = response_items,
        team           = team_resp,
        uploaded_files = file_resps,
    )
