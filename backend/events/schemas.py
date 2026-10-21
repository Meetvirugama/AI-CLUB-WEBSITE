"""
events/schemas.py
-----------------
Pydantic v2 request and response models for the Event Management module.

Design notes
────────────
• `EventCreateRequest` / `EventUpdateRequest` — used for POST and PUT bodies.
  `EventUpdateRequest` makes every field Optional so partial updates work cleanly.
• `EventResponse` — what the API returns; includes the computed `status`.
• All time/date fields use proper Python types (date, time, datetime) so
  FastAPI auto-generates correct OpenAPI schema and performs type coercion.
• Cross-field validation (dates ordering, team sizes) lives here so errors
  surface at the boundary before hitting the DB layer.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ─── Allowed values ───────────────────────────────────────────────────────────

EventType   = Literal["individual", "team"]
EventStatus = Literal["upcoming", "registration_open", "registration_closed", "completed"]

ALLOWED_CATEGORIES = {
    "hackathon", "workshop", "talk", "competition",
    "networking", "webinar", "bootcamp", "other",
}


# ─────────────────────────────────────────────────────────────────────────────
# Request models
# ─────────────────────────────────────────────────────────────────────────────

class EventCreateRequest(BaseModel):
    """Payload for POST /api/admin/events — optional venue, contact_email, dates, and times."""

    title: Optional[str] = Field(None, max_length=255,
                       description="Public event title.")
    description: Optional[str] = Field(None,
                              description="Full event description.")
    banner: Optional[str] = Field(None, description="URL to the event banner image.")
    category: Optional[str] = Field(None, description=f"One of: {', '.join(sorted(ALLOWED_CATEGORIES))}")
    venue: Optional[str] = Field(None, max_length=500,
                                 description="Physical address or online meeting link.")
    contact_email: Optional[EmailStr] = Field(None, description="Organiser contact e-mail.")

    event_type: Optional[EventType] = Field(None, description="'individual' or 'team'.")
    min_team_size: Optional[int] = Field(None, ge=1, le=100,
                                         description="Required when event_type='team'.")
    max_team_size: Optional[int] = Field(None, ge=1, le=100,
                                         description="Required when event_type='team'.")

    event_date: Optional[date]           = Field(None, description="Date the event takes place (YYYY-MM-DD).")
    event_start_date: Optional[date]     = Field(None, description="Date the event starts (YYYY-MM-DD).")
    event_end_date: Optional[date]       = Field(None, description="Date the event ends (YYYY-MM-DD).")
    start_time: Optional[time]           = Field(None, description="Event start time (HH:MM:SS).")
    end_time:   Optional[time]           = Field(None, description="Event end time (HH:MM:SS).")
    registration_start: Optional[datetime] = Field(None, description="When registration opens (ISO 8601 with TZ).")
    registration_end:   Optional[datetime] = Field(None, description="When registration closes (ISO 8601 with TZ).")
    winners:            Optional[str]      = Field(None, description="Winners of the event.")
    winner_link:        Optional[str]      = Field(None, max_length=500, description="URL/Link to the event winner document, PDF, or leaderboard.")
    registration_link:  Optional[str]      = Field(None, max_length=500, description="External URL for event registration (e.g. Google Form).")

    # ── Field-level validators ────────────────────────────────────────────────

    @field_validator("category")
    @classmethod
    def category_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.lower().strip()
            if v not in ALLOWED_CATEGORIES:
                raise ValueError(
                    f"Invalid category '{v}'. Allowed: {', '.join(sorted(ALLOWED_CATEGORIES))}"
                )
        return v

    @field_validator("banner")
    @classmethod
    def banner_must_be_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("banner must be a valid http/https URL.")
        return v

    @field_validator("winner_link", "registration_link")
    @classmethod
    def link_must_be_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Link must be a valid http/https URL.")
        return v

    # ── Cross-field validators ────────────────────────────────────────────────

    @model_validator(mode="after")
    def validate_dates_and_team(self) -> "EventCreateRequest":
        errors: list[str] = []

        # 1. start_time must be before end_time on single day events if both set
        if self.event_start_date and self.event_end_date and self.start_time and self.end_time:
            if self.event_start_date == self.event_end_date and self.start_time >= self.end_time:
                errors.append("start_time must be before end_time on single day events.")

        # 2. event_start_date must be on or before event_end_date if both set
        if self.event_start_date and self.event_end_date:
            if self.event_start_date > self.event_end_date:
                errors.append("event_start_date must be on or before event_end_date.")

        # 3. registration window must be ordered if both set
        if self.registration_start and self.registration_end:
            if self.registration_start >= self.registration_end:
                errors.append("registration_start must be before registration_end.")

        # 4. registration must close on or before the event start date if both set
        #    Convert registration_end to IST date for a correct apples-to-apples comparison
        #    (event_start_date is an IST calendar date entered by admin)
        if self.registration_end and self.event_start_date:
            _IST = timezone(timedelta(hours=5, minutes=30))
            reg_end_ist_date = self.registration_end.astimezone(_IST).date() if self.registration_end.tzinfo else (
                self.registration_end.replace(tzinfo=_IST).date()
            )
            if reg_end_ist_date > self.event_start_date:
                errors.append("registration_end cannot be after event_start_date.")

        # 4. team fields required for team events
        if self.event_type == "team":
            if self.min_team_size is None or self.max_team_size is None:
                errors.append(
                    "min_team_size and max_team_size are required for team events."
                )
            elif self.min_team_size > self.max_team_size:
                errors.append("min_team_size cannot exceed max_team_size.")

        # 5. individual events must NOT supply team sizes
        if self.event_type == "individual" and (
            self.min_team_size is not None or self.max_team_size is not None
        ):
            errors.append(
                "min_team_size and max_team_size must not be set for individual events."
            )

        if errors:
            from pydantic import ValidationError  # noqa: PLC0415
            raise ValueError(" | ".join(errors))

        return self


class EventUpdateRequest(BaseModel):
    """
    Payload for PUT /api/admin/events/:id — every field is optional.
    Only provided fields are updated (partial update / PATCH semantics).
    """

    title:              Optional[str]      = None
    description:        Optional[str]      = None
    banner:             Optional[str]      = None
    category:           Optional[str]      = None
    venue:              Optional[str]      = None
    contact_email:      Optional[EmailStr] = None
    event_type:         Optional[EventType] = None
    min_team_size:      Optional[int]      = Field(None, ge=1, le=100)
    max_team_size:      Optional[int]      = Field(None, ge=1, le=100)
    event_date:         Optional[date]     = None
    event_start_date:   Optional[date]     = None
    event_end_date:     Optional[date]     = None
    start_time:         Optional[time]     = None
    end_time:           Optional[time]     = None
    registration_start: Optional[datetime] = None
    registration_end:   Optional[datetime] = None
    winners:            Optional[str]      = Field(None, description="Winners of the event.")
    winner_link:        Optional[str]      = Field(None, max_length=500, description="URL/Link to the event winner document, PDF, or leaderboard.")
    registration_link:  Optional[str]      = Field(None, max_length=500, description="External URL for event registration (e.g. Google Form).")

    @field_validator("category")
    @classmethod
    def category_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.lower().strip()
            if v not in ALLOWED_CATEGORIES:
                raise ValueError(
                    f"Invalid category '{v}'. Allowed: {', '.join(sorted(ALLOWED_CATEGORIES))}"
                )
        return v

    @field_validator("banner")
    @classmethod
    def banner_must_be_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("banner must be a valid http/https URL.")
        return v

    @field_validator("winner_link", "registration_link")
    @classmethod
    def link_must_be_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Link must be a valid http/https URL.")
        return v


# ─────────────────────────────────────────────────────────────────────────────
# Response models
# ─────────────────────────────────────────────────────────────────────────────

class EventResponse(BaseModel):
    """Full event object returned by the API."""

    id:                 int
    title:              Optional[str] = None
    description:        Optional[str] = None
    banner:             Optional[str]
    category:           Optional[str] = None
    venue:              Optional[str] = None
    contact_email:      Optional[str] = None
    event_type:         Optional[str] = None
    min_team_size:      Optional[int] = None
    max_team_size:      Optional[int] = None
    event_date:         Optional[date] = None
    event_start_date:   Optional[date] = None
    event_end_date:     Optional[date] = None
    start_time:         Optional[time] = None
    end_time:           Optional[time] = None
    registration_start: Optional[datetime] = None
    registration_end:   Optional[datetime] = None
    status:             str
    winners:            Optional[str] = None
    winner_link:        Optional[str] = None
    registration_link:  Optional[str] = None
    created_at:         datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    """Paginated list of events."""
    total:  int
    page:   int
    limit:  int
    events: list[EventResponse]


class EventCreateResponse(BaseModel):
    status:  str = "success"
    message: str
    event:   EventResponse


class EventUpdateResponse(BaseModel):
    status:  str = "success"
    message: str = "Event updated successfully."
    event:   EventResponse


class EventDeleteResponse(BaseModel):
    status:  str = "success"
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Winners Showcase models
# ─────────────────────────────────────────────────────────────────────────────

class EventWinnerItem(BaseModel):
    id:                 str
    eventId:            str
    name:               str
    placement:          int
    category:           Optional[str] = None
    score:              Optional[float] = None
    imageUrl:           Optional[str] = None
    members:            Optional[list[str]] = None
    projectTitle:       Optional[str] = None
    projectDescription: Optional[str] = None
    award:              Optional[str] = None


class EventWinnersShowcaseItem(BaseModel):
    id:                str
    title:             str
    edition:           str
    date:              Optional[str] = None
    status:            str = "completed"
    category:          Optional[str] = None
    description:       Optional[str] = None
    banner:            Optional[str] = None
    winner_link:       Optional[str] = None
    registration_link: Optional[str] = None
    featured:          bool = False
    winners:           list[EventWinnerItem]

