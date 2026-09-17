"""
auth/config.py
--------------
Centralised authentication configuration.
All auth-related settings are loaded from environment variables here
so that the rest of the app never calls os.getenv() directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class AuthConfig:
    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # ── JWT ───────────────────────────────────────────────────────────────────
    # Generate a strong random secret: python -c "import secrets; print(secrets.token_hex(64))"
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
    JWT_ALGORITHM: str = "HS256"
    # Access token expires in 7 days (in minutes)
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7))
    )

    # ── Cookie ────────────────────────────────────────────────────────────────
    COOKIE_NAME: str = "access_token"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "none"
    COOKIE_MAX_AGE: int = JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds

    # ── Misc ──────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    @classmethod
    def validate(cls) -> None:
        """Log warnings for critical auth settings if missing or insecure."""
        import logging
        if not cls.GOOGLE_CLIENT_ID:
            logging.warning("GOOGLE_CLIENT_ID environment variable is not set. Google Auth will be disabled.")
        if cls.JWT_SECRET_KEY == "CHANGE_ME_IN_PRODUCTION":
            if cls.ENVIRONMENT == "production":
                raise ValueError("FATAL: JWT_SECRET_KEY is missing or insecure in production environment.")
            logging.warning(
                "JWT_SECRET_KEY is set to default. Please set a strong JWT_SECRET_KEY in environment variables."
            )



settings = AuthConfig()
