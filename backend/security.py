"""
security.py
-----------
Cross-cutting browser-security primitives used by the FastAPI app.

Contents
────────
  • `client_ip`                 — proxy-aware client IP resolution.
  • `RateLimiter`               — small in-process fixed-window limiter.
  • `CSRFOriginMiddleware`      — Origin/Referer enforcement on writes.
  • `SecurityHeadersMiddleware` — CSP and friends on every response.

Why an Origin check rather than CSRF tokens
───────────────────────────────────────────
In production the frontend and the API live on different sites, so the session
cookie has to be `SameSite=None` — which switches off the browser's own CSRF
protection. A synchroniser-token scheme would mean a new endpoint, new client
state, and a change to every write path.

Checking `Origin` (falling back to `Referer`) against the same allowlist CORS
already uses gets the same result with no client changes: browsers set these
headers on cross-site requests and forbid pages from forging them. This covers
the cases CORS does not — `multipart/form-data` and url-encoded form posts are
"simple" requests that a cross-origin `<form>` can send *without* a preflight,
which is exactly the shape of the event-registration endpoint.

Non-browser clients (curl, mobile) send no Origin and no cookie; they
authenticate with an `Authorization: Bearer` header, which cannot be attached
by a cross-site page, so they are allowed through.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Dict, Iterable, Optional, Tuple
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Methods that can change server state and therefore need CSRF protection.
_UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

# Paths exempt from the origin check (no cookie authority, no state change).
_CSRF_EXEMPT_PREFIXES = ("/api/health", "/health")


# ─────────────────────────────────────────────────────────────────────────────
# Client IP
# ─────────────────────────────────────────────────────────────────────────────

def _trust_proxy() -> bool:
    """
    Whether to believe `X-Forwarded-For`.

    Only enable this when the app genuinely sits behind a proxy that overwrites
    the header (Render, Vercel, Cloudflare, nginx). If it is enabled while the
    app is directly reachable, any client can spoof its own IP and walk around
    the rate limiter.
    """
    return os.getenv("TRUST_PROXY", "").strip().lower() in {"1", "true", "yes"}


def client_ip(request: Request) -> str:
    """
    Best-effort client IP for rate limiting.

    Behind a proxy the socket peer is the proxy itself, so every visitor would
    otherwise share a single rate-limit bucket — one abusive client would lock
    out the whole site. With TRUST_PROXY set we use the left-most entry of
    X-Forwarded-For, which is the original client.
    """
    if _trust_proxy():
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip

    return request.client.host if request.client else "unknown"


# ─────────────────────────────────────────────────────────────────────────────
# Rate limiting
# ─────────────────────────────────────────────────────────────────────────────

class RateLimiter:
    """
    Fixed-window in-process rate limiter.

    Deliberately simple and dependency-free. Two consequences worth knowing:
      • State is per-process, so N workers allow roughly N × the limit.
      • State is lost on restart.

    That is acceptable for abuse-dampening on a club website. A deployment
    running many workers, or one that needs hard guarantees, should move this
    to Redis — see SECURITY.md.
    """

    def __init__(self, *, max_requests: int, window_seconds: int = 60, max_tracked: int = 10_000):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_tracked = max_tracked
        self._hits: Dict[str, Tuple[int, float]] = {}

    def _evict_expired(self, now: float) -> None:
        expired = [k for k, (_, start) in self._hits.items() if now - start > self.window_seconds]
        for k in expired:
            del self._hits[k]

        # Hard ceiling so a flood of unique keys cannot exhaust memory.
        if len(self._hits) > self.max_tracked:
            for k in sorted(self._hits, key=lambda k: self._hits[k][1])[: len(self._hits) - self.max_tracked]:
                del self._hits[k]

    def check(self, key: str) -> bool:
        """Record a hit for `key`. Returns False when the limit is exceeded."""
        now = time.time()

        count, start = self._hits.get(key, (0, now))
        if now - start > self.window_seconds:
            count, start = 0, now

        count += 1
        self._hits[key] = (count, start)

        # Trim after inserting so the table never exceeds the ceiling.
        if len(self._hits) > self.max_tracked:
            self._evict_expired(now)

        return count <= self.max_requests


# ─────────────────────────────────────────────────────────────────────────────
# CSRF — Origin / Referer enforcement
# ─────────────────────────────────────────────────────────────────────────────

class CSRFOriginMiddleware(BaseHTTPMiddleware):
    """
    Reject cookie-authenticated writes that come from an unknown origin.

    A request is allowed when any of the following is true:
      • the method is safe (GET/HEAD/OPTIONS);
      • it carries no session cookie (so there is no authority to abuse);
      • it authenticates with an Authorization header instead of the cookie;
      • its Origin (or Referer host) is in the allowlist.
    """

    def __init__(self, app, *, allowed_origins: Iterable[str], cookie_name: str):
        super().__init__(app)
        self._allowed = {o.rstrip("/") for o in allowed_origins}
        self._cookie_name = cookie_name

    @staticmethod
    def _origin_of(url: str) -> Optional[str]:
        try:
            parsed = urlparse(url)
        except ValueError:
            return None
        if not parsed.scheme or not parsed.netloc:
            return None
        return f"{parsed.scheme}://{parsed.netloc}"

    async def dispatch(self, request: Request, call_next):
        if request.method not in _UNSAFE_METHODS:
            return await call_next(request)

        if request.url.path.startswith(_CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        # No cookie → nothing for a cross-site page to ride on.
        if self._cookie_name not in request.cookies:
            return await call_next(request)

        # Bearer tokens cannot be attached by a cross-site page.
        if request.headers.get("authorization", "").startswith("Bearer "):
            return await call_next(request)

        origin = request.headers.get("origin")
        if origin is None:
            referer = request.headers.get("referer")
            origin = self._origin_of(referer) if referer else None

        if origin is None:
            # A browser always sends Origin on cross-site writes. Its absence
            # means a same-origin request or a non-browser client.
            return await call_next(request)

        if origin.rstrip("/") not in self._allowed:
            logger.warning(
                "Blocked cross-origin %s %s from disallowed origin.",
                request.method,
                request.url.path,
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Cross-origin request blocked."},
            )

        return await call_next(request)


# ─────────────────────────────────────────────────────────────────────────────
# Security headers
# ─────────────────────────────────────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Attach browser hardening headers to every API response.

    The API serves JSON and file downloads — never HTML that a browser should
    execute — so its CSP can be maximally restrictive (`default-src 'none'`).
    The React app is a static Vercel deployment and gets its own, necessarily
    looser, CSP from `frontend/vercel.json`.
    """

    def __init__(self, app, *, is_production: bool):
        super().__init__(app)
        self._is_production = is_production

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Interactive docs are HTML and load Swagger assets from a CDN; a
        # `default-src 'none'` policy would break them. They are disabled in
        # production anyway, so only relax the policy for those dev-only paths.
        is_docs = request.url.path in ("/docs", "/redoc") or request.url.path.startswith("/docs")

        if not is_docs:
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
            )

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()"
        )
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"

        if self._is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response
