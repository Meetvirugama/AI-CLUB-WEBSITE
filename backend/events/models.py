"""
events/models.py
----------------
SQLAlchemy ORM model for the `club_events` table.

Note: the table is named `club_events` (not `events`) to avoid colliding
with the legacy `events` table that already exists in the database.

Schema
──────
club_events
  id                   SERIAL PRIMARY KEY
  title                VARCHAR(255) NOT NULL
  description          TEXT        NOT NULL
  banner               VARCHAR(500)            — URL to banner image
  category             VARCHAR(100) NOT NULL
  venue                VARCHAR(500) NOT NULL    — physical address or online link
  contact_email        VARCHAR(255) NOT NULL
  event_type           VARCHAR(20)  NOT NULL    — 'individual' | 'team'
  min_team_size        INTEGER                  — NULL for individual events; >= 1 for team events
  max_team_size        INTEGER                  — NULL for individual events
  event_date           DATE        NOT NULL
  start_time           TIME        NOT NULL
  end_time             TIME        NOT NULL
  registration_start   TIMESTAMPTZ NOT NULL
  registration_end     TIMESTAMPTZ NOT NULL
  status               VARCHAR(30)  NOT NULL    — computed, stored for fast queries
  created_at           TIMESTAMPTZ DEFAULT NOW()
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Date, Time,
    DateTime, CheckConstraint,
)
from db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ClubEvent(Base):
    """
    ORM model for platform-managed events.

    Status values (auto-computed, never set manually by API consumers):
      • upcoming           — registration hasn't opened yet
      • registration_open  — between registration_start and registration_end
      • registration_closed— registration_end has passed but event hasn't happened
      • completed          — event_date has passed
    """
    __tablename__ = "club_events"

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('individual', 'team')",
            name="ck_event_type_values",
        ),
        CheckConstraint(
            "status IN ('upcoming', 'registration_open', 'registration_closed', 'completed')",
            name="ck_status_values",
        ),
        CheckConstraint(
            "(event_type = 'individual') OR "
            "(event_type = 'team' AND min_team_size IS NOT NULL AND max_team_size IS NOT NULL AND min_team_size >= 1 AND max_team_size >= min_team_size)",
            name="ck_team_size_consistency",
        ),
    )

    id                 = Column(Integer, primary_key=True, index=True)
    title              = Column(String(255), nullable=True, index=True)
    description        = Column(Text,        nullable=True)
    banner             = Column(Text,        nullable=True)
    category           = Column(String(100), nullable=True, index=True)
    venue              = Column(String(500), nullable=True)
    contact_email      = Column(String(255), nullable=True)
    event_type         = Column(String(20),  nullable=True)          # 'individual' | 'team'
    min_team_size      = Column(Integer,     nullable=True)
    max_team_size      = Column(Integer,     nullable=True)
    event_date         = Column(Date,        nullable=True, index=True)
    event_start_date   = Column(Date,        nullable=True)
    event_end_date     = Column(Date,        nullable=True)
    start_time         = Column(Time,        nullable=True)
    end_time           = Column(Time,        nullable=True)
    registration_start = Column(DateTime(timezone=True), nullable=True)
    registration_end   = Column(DateTime(timezone=True), nullable=True)
    status             = Column(String(30),  nullable=True, default="upcoming", index=True)
    winners            = Column(Text,        nullable=True)
    winner_link        = Column(String(500), nullable=True)
    registration_link  = Column(String(500), nullable=True)
    created_at         = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ClubEvent id={self.id} title={self.title!r} status={self.status!r}>"
