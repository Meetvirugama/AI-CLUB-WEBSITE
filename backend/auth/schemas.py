"""
auth/schemas.py
---------------
Pydantic request / response models used exclusively by auth routes.
Keeping them separate avoids coupling with the rest of the app's schemas.
"""

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────

class GoogleTokenRequest(BaseModel):
    """
    Payload sent from the frontend after the Google One-Tap / OAuth flow.
    The frontend receives a credential (JWT ID-Token) from Google and
    forwards it to our backend for server-side verification.
    """
    id_token: str

    @field_validator("id_token")
    @classmethod
    def id_token_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("id_token must not be empty.")
        return v


# ─────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────

class UserPublicResponse(BaseModel):
    """
    Safe, serialisable representation of a user returned to the client.
    Never expose sensitive internals (e.g. raw google_id) unnecessarily.
    """
    id: int
    name: str
    email: EmailStr
    profile_image: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthSuccessResponse(BaseModel):
    """Returned on a successful login. Token is delivered exclusively via HttpOnly cookie."""
    status: str = "success"
    message: str
    user: UserPublicResponse


class AuthMeResponse(BaseModel):
    """Returned by GET /api/auth/me."""
    authenticated: bool
    user: Optional[UserPublicResponse] = None


class LogoutResponse(BaseModel):
    """Returned on a successful logout."""
    status: str = "success"
    message: str = "Logged out successfully."
