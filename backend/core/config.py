"""
core/config.py
--------------
Centralised application configuration using pydantic-settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    
    # ── Google OAuth ──
    GOOGLE_CLIENT_ID: str = ""
    
    # ── JWT ──
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    # ── Cookie ──
    COOKIE_NAME: str = "access_token"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "none"  # Must be 'none' for cross-origin Vercel→Render (requires Secure=True)
    
    # ── Database ──
    DATABASE_URL: str = ""
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5
    
    # ── Admin ──
    SUPER_ADMIN_EMAIL: Optional[str] = None
    
    # ── CORS ──
    ALLOWED_ORIGINS: Optional[str] = None
    
    # ── Uploads ──
    VERCEL: Optional[str] = None
    UPLOAD_DIR: Optional[str] = None
    UPLOAD_BASE_URL: str = "/api/admin/files"
    
    # ── Deployment ──
    RENDER_EXTERNAL_URL: str = "https://ai-club-website-e9zk.onrender.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def COOKIE_MAX_AGE(self) -> int:
        return self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

    @property
    def cors_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS:
            return [orig.strip() for orig in self.ALLOWED_ORIGINS.split(",") if orig.strip()]
        return [
            "http://localhost:5173",
            "http://localhost:8080",
            "http://localhost:3000",
        ]

    def validate_production(self):
        import logging
        if not self.GOOGLE_CLIENT_ID:
            logging.warning("GOOGLE_CLIENT_ID environment variable is not set. Google Auth will be disabled.")
        if self.ENVIRONMENT == "production":
            if self.JWT_SECRET_KEY == "CHANGE_ME_IN_PRODUCTION" or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("FATAL: JWT_SECRET_KEY is missing or insecure in production environment. Must be >= 32 chars.")

settings = Settings()
