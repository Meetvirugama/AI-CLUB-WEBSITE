"""
auth/middleware.py
------------------
FastAPI dependency functions for protecting routes.

Two dependency styles are provided:

1. `get_current_user`  — raises HTTP 401 if the token is missing/invalid.
   Use this for endpoints that MUST be authenticated.

2. `get_optional_user` — returns None instead of raising if unauthenticated.
   Use this for endpoints that work both with and without a session.

Token extraction order
──────────────────────
  a. HttpOnly cookie  `access_token`  (preferred — XSS-resistant)
  b. Authorization header  `Bearer <token>`  (for API clients / mobile)

If neither is present, the user is treated as unauthenticated.
"""

import logging
from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.jwt_handler import decode_access_token
from auth.service import get_user_by_id
from auth.models import User

logger = logging.getLogger(__name__)


# ─── Internal: extract raw token from request ─────────────────────────────────

def _extract_token(
    access_token: Optional[str] = Cookie(default=None),
) -> Optional[str]:
    """
    Pull the JWT from the HttpOnly cookie.
    """
    return access_token


# ─── Public dependencies ──────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(_extract_token),
):
    """
    FastAPI dependency — resolves to the authenticated User ORM object.

    Raises:
        HTTP 401 if no token is present or the token is invalid/expired.
        HTTP 401 if the user id in the token no longer exists in the DB.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_access_token(token)  # raises 401 on bad token

    # ── Import here to avoid circular imports at module load time ──────────────
    from db import async_session   # noqa: PLC0415

    async with async_session() as session:
        user = await get_user_by_id(session, user_id)

    if user is None:
        logger.warning("Token contained user_id=%d but no such user in DB.", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    token: Optional[str] = Depends(_extract_token),
):
    """
    FastAPI dependency — resolves to User ORM object OR None.

    Never raises. Use this on endpoints that serve both
    authenticated and unauthenticated visitors differently.
    """
    if not token:
        return None

    try:
        user_id = decode_access_token(token)
    except HTTPException:
        return None  # invalid token treated the same as no token

    try:
        from db import async_session   # noqa: PLC0415

        async with async_session() as session:
            return await get_user_by_id(session, user_id)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"Failed to fetch user from DB in auth middleware: {exc}")
        return None
