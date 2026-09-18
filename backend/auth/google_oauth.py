"""
auth/google_oauth.py
---------------------
Server-side verification of Google OAuth2 ID-Tokens.

Why server-side?
────────────────
The frontend uses Google's Sign-In SDK (One-Tap / GIS) which issues a
signed JWT `credential` (ID-Token). We verify this token on the server
with Google's public keys so we never trust unverified client claims.

Flow
────
1. Frontend receives `credential` (JWT) from Google after the user consents.
2. Frontend POSTs the token to POST /api/auth/google.
3. This module verifies the token against Google's public-key endpoint.
4. Verified claims are returned as a typed `GoogleUserInfo` dict.

Errors
──────
• `google.auth.exceptions.TransportError` — network issue reaching Google.
• `ValueError` — token is invalid, expired, audience mismatch, etc.
Both are re-raised as HTTP 401 by the calling route.
"""

from dataclasses import dataclass
from typing import Optional

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from core.config import settings


@dataclass
class GoogleUserInfo:
    """Verified, typed claims extracted from a Google ID-Token."""
    google_id: str          # `sub` claim — unique per Google account
    email: str
    name: str
    profile_image: Optional[str]
    email_verified: bool


def verify_google_id_token(raw_token: str) -> GoogleUserInfo:
    """
    Verify the Google ID-Token and extract user claims.
    """
    if len(raw_token.split(".")) != 3:
        raise ValueError("Invalid Google ID-Token format. Expected a JWT.")

    try:
        idinfo: dict = id_token.verify_oauth2_token(
            raw_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise ValueError(f"Invalid Google ID-Token: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Could not reach Google's verification endpoint: {exc}") from exc

    # Extra safety: ensure email is verified by Google
    if not idinfo.get("email_verified", False):
        raise ValueError("Google account email is not verified.")

    return GoogleUserInfo(
        google_id=idinfo["sub"],
        email=idinfo["email"],
        name=idinfo.get("name", ""),
        profile_image=idinfo.get("picture"),
        email_verified=True,
    )
