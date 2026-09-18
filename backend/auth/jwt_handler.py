"""
auth/jwt_handler.py
-------------------
Stateless JWT utilities: create, decode, and validate access tokens.

Strategy
────────
• Tokens are signed with HS256 using a secret stored in the environment.
• The token payload carries the internal DB user `id` (integer) and
  a `type` claim to prevent token-type confusion attacks.
• Expiry is validated both by the `exp` claim and by explicit checks here.
• All errors are surfaced as HTTP 401 so middleware can handle them uniformly.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import HTTPException, status

from core.config import settings


# ─── Token type constants ─────────────────────────────────────────────────────
_TOKEN_TYPE = "access"


# ─── Public API ──────────────────────────────────────────────────────────────

def create_access_token(user_id: int) -> str:
    """
    Create a signed JWT access token for the given DB user id.

    Args:
        user_id: The integer primary-key from the users table.

    Returns:
        A compact, URL-safe JWT string.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),         # subject — always a string per RFC 7519
        "iat": now,                  # issued-at
        "exp": expire,               # expiry
        "type": _TOKEN_TYPE,         # token-type guard
    }

    token: str = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> int:
    """
    Verify and decode a JWT access token.

    Args:
        token: The compact JWT string.

    Returns:
        The integer user id embedded in `sub`.

    Raises:
        HTTPException 401 on any validation failure (expired, bad signature,
        wrong type, malformed payload, etc.).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: dict = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    # Guard against token-type confusion
    if payload.get("type") != _TOKEN_TYPE:
        raise credentials_exception

    # Extract and validate user id
    sub: Optional[str] = payload.get("sub")
    if sub is None:
        raise credentials_exception

    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise credentials_exception

    return user_id
