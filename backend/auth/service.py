"""
auth/service.py
---------------
Business logic layer for authentication.

Responsibilities
────────────────
• Upsert users: find by google_id → return existing; not found → create new.
• Duplicate-prevention: unique constraints on google_id AND email at DB level
  plus a pre-check here to give a friendly error instead of a DB exception.
• Fetch user by id (used by middleware).

This layer has no knowledge of HTTP — it works purely with DB sessions
and domain objects. Routes call into this layer; middleware does the same.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.google_oauth import GoogleUserInfo
from auth.models import User


async def get_or_create_user(session: AsyncSession, google_user: GoogleUserInfo):
    """
    Find an existing user by Google ID (or email as fallback) and return it,
    or create a new user record if this is the first login.

    Duplicate prevention strategy:
    ─────────────────────────────
    1. Look up by `google_id` first (primary identity).
    2. If not found, look up by `email` — catches edge case where someone
       previously registered with a different OAuth provider using same email.
    3. Only create a new record if neither lookup returns a row.

    Args:
        session:     An active async DB session (injected by the route).
        google_user: Verified claims from Google's token endpoint.

    Returns:
        Tuple[User, bool]: (user_record, is_new_user)
    """
    # 1. Primary lookup: by google_id
    result = await session.execute(
        select(User).where(User.google_id == google_user.google_id)
    )
    db_user = result.scalars().first()

    # Check if this user is a designated super admin
    from core.config import settings  # noqa: PLC0415
    is_super_admin = (google_user.email or "").strip().lower() in settings.super_admin_emails

    if db_user:
        # Sync mutable fields that can change in Google profile
        db_user.name = google_user.name
        db_user.profile_image = google_user.profile_image
        db_user.last_login = datetime.now(timezone.utc)
        if is_super_admin and not db_user.is_admin:
            db_user.is_admin = True
        await session.commit()
        await session.refresh(db_user)
        return db_user, False   # existing user

    # 2. Fallback lookup: by email (detects email reuse across providers)
    result = await session.execute(
        select(User).where(User.email == google_user.email)
    )
    email_user = result.scalars().first()

    if email_user:
        # Link existing email-based account to this Google ID
        email_user.google_id = google_user.google_id
        email_user.name = google_user.name
        email_user.profile_image = google_user.profile_image
        email_user.last_login = datetime.now(timezone.utc)
        if is_super_admin and not email_user.is_admin:
            email_user.is_admin = True
        await session.commit()
        await session.refresh(email_user)
        return email_user, False  # existing user (merged)

    # 3. New user — create record
    new_user = User(
        google_id=google_user.google_id,
        name=google_user.name,
        email=google_user.email,
        profile_image=google_user.profile_image,
        is_admin=is_super_admin,
        last_login=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user, True   # brand-new user


async def get_user_by_id(session: AsyncSession, user_id: int) -> Optional[User]:
    """
    Fetch a user record by primary key.

    Args:
        session: Active async DB session.
        user_id: Integer primary key.

    Returns:
        User ORM instance or None if not found.
    """
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalars().first()
