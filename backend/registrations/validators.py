"""
registrations/validators.py
----------------------------
All pre-registration guard checks live here.

Functions are pure-async and receive the DB session + relevant domain
objects. They raise `RegistrationError` (a thin ValueError subclass with
an HTTP status code hint) so the route layer can convert them cleanly.

Guard checklist (executed in order)
────────────────────────────────────
1. event_exists              — event_id references a real ClubEvent row
2. registration_window_open  — now is between registration_start / end
3. not_already_registered    — user hasn't registered for this event yet
4. validate_event_type_match — team supplied ↔ event_type=='team'; else error
5. validate_team_size        — member count within [min, max] for team events
6. validate_team_name_unique — team name not already used in this event
7. validate_form_responses   — required fields are present and non-empty;
                               choice fields contain only valid options;
                               file fields contain a value (URL) or are skipped
                               (actual binary handled by file upload routes)

These validators are composable: the service calls them all sequentially
before any DB write so users get one consolidated error message per issue.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ─── Typed error so routes can map to the right HTTP code ────────────────────

class RegistrationError(Exception):
    """
    Raised by validators when a registration cannot proceed.

    Attributes:
        message:     Human-readable explanation.
        status_code: Suggested HTTP status code (400 / 404 / 409 / 422).
    """
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message     = message
        self.status_code = status_code


# ─── 1. Event existence ────────────────────────────────────────────────────────

async def check_event_exists(session: AsyncSession, event_id: int):
    """
    Returns the ClubEvent ORM object.
    Raises RegistrationError(404) if not found.
    """
    from events.models import ClubEvent  # noqa: PLC0415
    result = await session.execute(
        select(ClubEvent).where(ClubEvent.id == event_id)
    )
    event = result.scalars().first()
    if event is None:
        raise RegistrationError(
            f"Event with id={event_id} does not exist.", status_code=404
        )
    return event


# ─── 2. Registration window ────────────────────────────────────────────────────

def check_registration_window(event) -> None:
    """
    Raises RegistrationError(400) if the current UTC time is outside
    the event's registration window.

    If registration_start or registration_end is NULL (event created
    without those fields), the check is skipped — registration is allowed.
    """
    now = datetime.now(timezone.utc)

    reg_start = event.registration_start
    reg_end   = event.registration_end

    # If either bound is missing, skip the window check entirely
    if reg_start is None or reg_end is None:
        return

    # Make timezone-aware if naive
    if reg_start.tzinfo is None:
        reg_start = reg_start.replace(tzinfo=timezone.utc)
    if reg_end.tzinfo is None:
        reg_end = reg_end.replace(tzinfo=timezone.utc)

    if now < reg_start:
        raise RegistrationError(
            f"Registration has not opened yet. It opens on "
            f"{reg_start.strftime('%d %b %Y at %H:%M UTC')}.",
            status_code=400,
        )

    if now > reg_end:
        raise RegistrationError(
            f"Registration closed on {reg_end.strftime('%d %b %Y at %H:%M UTC')}.",
            status_code=400,
        )


# ─── 3. Duplicate registration ────────────────────────────────────────────────

async def check_not_already_registered(
    session: AsyncSession,
    event_id: int,
    user_id: int,
) -> None:
    """
    Raises RegistrationError(409) if the user already has a registration
    for this event.
    """
    from registrations.models import EventRegistration  # noqa: PLC0415
    result = await session.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id  == user_id,
        )
    )
    if result.scalars().first() is not None:
        raise RegistrationError(
            "You have already registered for this event.",
            status_code=409,
        )


# ─── 4. Event type ↔ team block match ─────────────────────────────────────────

def check_event_type_match(event, team_input) -> None:
    """
    For team events  : team_input must NOT be None.
    For individual   : team_input must be None.
    Raises RegistrationError(400) on mismatch.
    """
    event_type = event.event_type or "individual"  # treat NULL as individual
    if event_type == "team" and team_input is None:
        raise RegistrationError(
            "This is a team event. Please provide team details (team name and members).",
            status_code=400,
        )
    if event_type == "individual" and team_input is not None:
        raise RegistrationError(
            "This is an individual event. Team information must not be submitted.",
            status_code=400,
        )


# ─── 5. Team size ─────────────────────────────────────────────────────────────

def check_team_size(event, team_input) -> None:
    """
    Validates that the total team size (leader + members) is within
    [min_team_size, max_team_size].
    Raises RegistrationError(400) on violation.
    """
    if event.event_type != "team" or team_input is None:
        return

    # Leader counts as 1; members list provides the additional members
    total = 1 + len(team_input.members)
    min_s = event.min_team_size or 1
    max_s = event.max_team_size or 999

    if total < min_s:
        raise RegistrationError(
            f"Team size is too small. Minimum is {min_s} member(s) "
            f"(including the leader). You provided {total}.",
            status_code=400,
        )
    if total > max_s:
        raise RegistrationError(
            f"Team size exceeds the maximum of {max_s} member(s) "
            f"(including the leader). You provided {total}.",
            status_code=400,
        )


# ─── 6. Team name uniqueness ──────────────────────────────────────────────────

async def check_team_name_unique(
    session: AsyncSession,
    event_id: int,
    team_name: str,
) -> None:
    """
    Raises RegistrationError(409) if a team with the same name already
    exists for this event (case-insensitive check).
    """
    from registrations.models import Team  # noqa: PLC0415
    from sqlalchemy import func             # noqa: PLC0415
    result = await session.execute(
        select(Team).where(
            Team.event_id  == event_id,
            func.lower(Team.team_name) == team_name.lower().strip(),
        )
    )
    if result.scalars().first() is not None:
        raise RegistrationError(
            f"A team named '{team_name}' already exists for this event. "
            "Please choose a different name.",
            status_code=409,
        )


# ─── 7. Form response validation ──────────────────────────────────────────────

async def validate_form_responses(
    session: AsyncSession,
    event_id: int,
    responses: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Validate submitted form responses against the event's form template.

    Steps
    ─────
    a. Load the form template and its fields for this event.
    b. For each required field: ensure a non-empty value was submitted.
    c. For choice fields (dropdown/radio/checkbox): value must be in allowed options.
    d. For checkbox: value can be a list; each item validated against options.
    e. File fields: presence of a non-empty string is sufficient here
       (actual binary already uploaded and stored; only the URL string is in responses).

    Returns:
        The responses dict — potentially normalised (e.g., checkbox lists
        serialised to JSON strings for storage in TEXT column).

    Raises:
        RegistrationError(422) on any validation failure.
    """
    from forms.models import FormField, FormTemplate  # noqa: PLC0415

    # Load template
    tmpl_result = await session.execute(
        select(FormTemplate).where(FormTemplate.event_id == event_id)
    )
    template = tmpl_result.scalars().first()

    # No form template = no validation required
    if template is None:
        return responses

    fields_result = await session.execute(
        select(FormField)
        .where(FormField.template_id == template.id)
        .order_by(FormField.order_no.asc())
    )
    fields = list(fields_result.scalars().all())

    errors: List[str] = []
    normalised = dict(responses)  # work on a copy
    
    # Reject unknown fields
    valid_field_ids = {str(f.id) for f in fields}
    for key in responses.keys():
        if key not in valid_field_ids:
            errors.append(f"Unknown form field submitted: '{key}'.")

    for field in fields:
        fid      = str(field.id)
        label    = field.label
        ft       = field.field_type.lower()
        required = field.required
        raw_val  = normalised.get(fid)

        # ── Determine if value is "empty" ─────────────────────────────────────
        is_empty = (
            raw_val is None
            or (isinstance(raw_val, str) and not raw_val.strip())
            or (isinstance(raw_val, list) and len(raw_val) == 0)
        )

        if required and is_empty:
            errors.append(f"'{label}' is required.")
            continue  # no further checks on empty field

        if is_empty:
            continue  # optional and empty → skip

        # ── Type-specific validation ───────────────────────────────────────────
        if ft in {"dropdown", "radio"}:
            options = _parse_options(field.options_json)
            if raw_val not in options:
                errors.append(
                    f"'{label}': invalid option '{raw_val}'. "
                    f"Allowed: {', '.join(options)}"
                )

        elif ft == "checkbox":
            options = _parse_options(field.options_json)
            items = raw_val if isinstance(raw_val, list) else [raw_val]
            bad   = [x for x in items if x not in options]
            if bad:
                errors.append(
                    f"'{label}': invalid option(s) {bad}. "
                    f"Allowed: {', '.join(options)}"
                )
            # Normalise to JSON string for TEXT storage
            normalised[fid] = json.dumps(items)

        elif ft == "email":
            import re  # noqa: PLC0415
            EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
            if not EMAIL_RE.match(str(raw_val)):
                errors.append(f"'{label}': '{raw_val}' is not a valid email address.")

        elif ft == "number":
            try:
                normalised[fid] = str(float(raw_val))
            except (ValueError, TypeError):
                errors.append(f"'{label}': '{raw_val}' is not a valid number.")

        elif ft == "phone":
            import re  # noqa: PLC0415
            PHONE_RE = re.compile(r"^[\d\s\+\-\(\)]{7,20}$")
            if not PHONE_RE.match(str(raw_val)):
                errors.append(
                    f"'{label}': '{raw_val}' is not a valid phone number."
                )

        elif ft == "date":
            import re  # noqa: PLC0415
            DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
            if not DATE_RE.match(str(raw_val)):
                errors.append(f"'{label}': date must be in YYYY-MM-DD format.")

        # text / textarea / file — no additional type check needed

    if errors:
        raise RegistrationError(
            "Form validation failed: " + " | ".join(errors),
            status_code=422,
        )

    return normalised


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _parse_options(options_json: Optional[str]) -> List[str]:
    """Safely parse a JSON array from form_fields.options_json."""
    if not options_json:
        return []
    try:
        result = json.loads(options_json)
        return [str(o) for o in result] if isinstance(result, list) else []
    except (json.JSONDecodeError, TypeError):
        return []
