"""
auth/routes.py
--------------
FastAPI router that provides the three public auth endpoints.

Endpoints
─────────
POST /api/auth/google
    Verifies a Google ID-Token from the frontend, upserts the user in the DB,
    signs a JWT, and sets it as an HttpOnly cookie.

POST /api/auth/logout
    Clears the HttpOnly cookie, effectively ending the session.

GET  /api/auth/me
    Returns the currently authenticated user's public profile,
    or 401 if the request is not authenticated.

Security notes
──────────────
• The JWT is stored in an HttpOnly, Secure (production), SameSite=Lax cookie.
  This makes it inaccessible to JavaScript and immune to XSS attacks.
• The `Secure` flag is set only in production (ENVIRONMENT=production).
• Token theft via CSRF is mitigated by SameSite=Lax + server-side token
  validation (audience, expiry, type checks in jwt_handler.py).
• All validation errors surface as structured JSON with appropriate HTTP codes.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.config import settings
from auth.google_oauth import verify_google_id_token
from auth.jwt_handler import create_access_token
from auth.middleware import get_current_user
from auth.models import User
from auth.schemas import (
    AuthMeResponse,
    AuthSuccessResponse,
    GoogleTokenRequest,
    LogoutResponse,
    UserPublicResponse,
)
from auth.service import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ─── Helper: set auth cookie ──────────────────────────────────────────────────

def _set_auth_cookie(response: Response, token: str) -> None:
    """Attach the JWT as an HttpOnly cookie to the outgoing response."""
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.COOKIE_MAX_AGE,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Remove the JWT cookie by setting it with max_age=0."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/auth/google
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/google",
    response_model=AuthSuccessResponse,
    summary="Authenticate with Google OAuth",
    description=(
        "Accepts a Google ID-Token from the frontend, verifies it server-side, "
        "upserts the user in the database, and returns a JWT in an HttpOnly cookie."
    ),
    status_code=status.HTTP_200_OK,
)
async def google_auth(
    token_request: GoogleTokenRequest,
    response: Response,
    request: Request,
):
    """
    Main Google OAuth login endpoint.

    1. Verify the Google ID-Token with Google's public keys.
    2. Upsert the user (create if new, update if existing).
    3. Issue a signed JWT and set it as an HttpOnly cookie.
    4. Return the user's public profile.
    """
    # ── Step 1: Verify token with Google ──────────────────────────────────────
    try:
        google_user = verify_google_id_token(token_request.id_token)
    except ValueError as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except RuntimeError as exc:
        logger.error("Google verification network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach Google's verification service. Try again later.",
        )

    # ── Step 2: Upsert user in database ───────────────────────────────────────
    try:
        # Import the shared session factory from the db module.
        # Done at call time to avoid circular imports.
        from db import async_session     # noqa: PLC0415

        async with async_session() as session:
            db_user, is_new = await get_or_create_user(session, google_user)

    except Exception as exc:
        logger.exception("Database error during Google auth: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A database error occurred during authentication.",
        )

    # ── Step 3: Issue JWT ──────────────────────────────────────────────────────
    access_token = create_access_token(user_id=db_user.id)
    _set_auth_cookie(response, access_token)

    logger.info(
        "User %s (id=%d) %s.",
        db_user.email,
        db_user.id,
        "registered" if is_new else "logged in",
    )

    # ── Step 4: Return public profile ─────────────────────────────────────────
    # NOTE: The JWT is delivered via the HttpOnly cookie set above (Step 3).
    # We do NOT return it in the response body to prevent localStorage storage (SEC-02).
    return AuthSuccessResponse(
        status="success",
        message="Account created successfully." if is_new else "Logged in successfully.",
        user=UserPublicResponse.model_validate(db_user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/auth/logout
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Logout current user",
    description="Clears the auth cookie, ending the user's session.",
    status_code=status.HTTP_200_OK,
)
async def logout(response: Response):
    """
    Logout endpoint.

    Clears the HttpOnly JWT cookie. Because JWTs are stateless, the token
    itself is not invalidated server-side — the cookie removal is what ends
    the session for browser clients.

    For enhanced security in production, consider maintaining a server-side
    token blocklist (e.g., Redis) keyed on `jti` claim.
    """
    _clear_auth_cookie(response)
    return LogoutResponse()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/auth/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=AuthMeResponse,
    summary="Get current authenticated user",
    description=(
        "Returns the authenticated user's public profile. "
        "Returns 401 if not authenticated."
    ),
    status_code=status.HTTP_200_OK,
)
async def get_me(
    current_user=Depends(get_current_user),
):
    """
    Protected endpoint — requires a valid JWT in the cookie or
    Authorization header.

    The `get_current_user` dependency handles all token extraction,
    validation, and user lookup. If anything is wrong it raises HTTP 401
    before this function is ever called.
    """
    return AuthMeResponse(
        authenticated=True,
        user=UserPublicResponse.model_validate(current_user),
    )
