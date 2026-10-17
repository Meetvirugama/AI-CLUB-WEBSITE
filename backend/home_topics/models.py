from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class HomeTopic(Base):
    """One item in the scrolling topics strip on the homepage."""

    __tablename__ = "home_topics"
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(120), nullable=False)
    order_no = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
