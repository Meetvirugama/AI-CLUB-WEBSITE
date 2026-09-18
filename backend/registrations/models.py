"""
registrations/models.py
-----------------------
ORM models for the Event Registration system.

Four tables
───────────
event_registrations   — one row per user-event registration
registration_responses— one row per form field answer
teams                 — one team per team-event registration
team_members          — individual members within a team
uploaded_files        — files uploaded as part of a registration

Key design decisions
─────────────────────
• UniqueConstraint(event_id, user_id) on event_registrations prevents
  duplicate registration at the DB level (defence-in-depth over the
  service-layer guard).
• ON DELETE CASCADE from event_registrations → responses / files so that
  deleting a registration cleans up everything automatically.
• Teams are tied to registrations (1-to-1) so a team is always owned by
  a single registration row and inherits its lifecycle.
• `team_name` is stored on BOTH the registration row (quick lookup) and
  the teams row (authoritative record with members).
• `value` in registration_responses is TEXT — the service layer serialises
  checkbox lists as JSON arrays before storage.
"""

from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, ForeignKey, Integer, String,
    Text, DateTime, UniqueConstraint, Index, text
)
from db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────

class EventRegistration(Base):
    """
    One row per user × event.
    Unique constraint prevents duplicate registrations at the DB level.
    """
    __tablename__ = "event_registrations"

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_registration_event_user"),
    )

    id            = Column(Integer, primary_key=True, index=True)
    event_id      = Column(Integer, ForeignKey("club_events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_name     = Column(String(255), nullable=True)   # NULL for individual events
    registered_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<EventRegistration id={self.id} event_id={self.event_id} user_id={self.user_id}>"


class RegistrationResponse(Base):
    """
    Stores the answer to each form field for a single registration.
    `value` is TEXT; checkbox answers are stored as JSON arrays.
    """
    __tablename__ = "registration_responses"

    id              = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("event_registrations.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id        = Column(Integer, ForeignKey("form_fields.id", ondelete="CASCADE"), nullable=False, index=True)
    value           = Column(Text, nullable=True)                   # NULL for unanswered optional fields

    def __repr__(self) -> str:
        return f"<RegistrationResponse reg={self.registration_id} field={self.field_id}>"


class Team(Base):
    """
    Team created as part of a team-event registration.
    One team per registration (1-to-1 with EventRegistration.id).
    """
    __tablename__ = "teams"

    __table_args__ = (
        Index("uq_team_event_name", "event_id", text("lower(team_name)"), unique=True),
    )

    id              = Column(Integer, primary_key=True, index=True)
    event_id        = Column(Integer, ForeignKey("club_events.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_id = Column(Integer, ForeignKey("event_registrations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    leader_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)   # user_id of team leader
    team_name       = Column(String(255), nullable=False)

    def __repr__(self) -> str:
        return f"<Team id={self.id} name={self.team_name!r} event={self.event_id}>"


class TeamMember(Base):
    """
    Individual members within a team.
    The leader is NOT duplicated here — they are identified by Team.leader_id.
    """
    __tablename__ = "team_members"

    id           = Column(Integer, primary_key=True, index=True)
    team_id      = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    member_name  = Column(String(255), nullable=False)
    member_email = Column(String(255), nullable=False)

    def __repr__(self) -> str:
        return f"<TeamMember id={self.id} team={self.team_id} email={self.member_email!r}>"


class UploadedFile(Base):
    """
    Tracks files uploaded as part of a registration form submission.
    The physical file is stored on disk. Both the public URL and the 
    local file path are stored here to allow for physical cleanup upon deletion.
    """
    __tablename__ = "uploaded_files"

    id              = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("event_registrations.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id        = Column(Integer, ForeignKey("form_fields.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url        = Column(String(500), nullable=False)
    local_path      = Column(String(500), nullable=True)            # absolute or relative path on disk for cleanup
    original_name   = Column(String(255), nullable=True)            # original filename for display
    uploaded_at     = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<UploadedFile id={self.id} reg={self.registration_id} url={self.file_url!r}>"
