"""
events/admin.py
---------------
Admin guard dependency.

Strategy
────────
The `require_admin` dependency:
  1. Calls `get_current_user` to ensure the request is authenticated.
  2. Checks whether the authenticated user's `is_admin` attribute is True.
  3. Raises HTTP 403 if not.

To promote an admin, update their user record in the database, setting `is_admin = True`.
"""

import os
import logging

from fastapi import Depends, HTTPException, status

from auth.middleware import get_current_user

logger = logging.getLogger(__name__)


async def require_admin(
    current_user=Depends(get_current_user),
):
    """
    FastAPI dependency — resolves to the current user only if they are the
    super admin. Raises HTTP 403 otherwise.

    Usage:
        @router.post("/api/admin/events")
        async def create(admin=Depends(require_admin)):
            ...
    """
    if not current_user.is_admin:
        logger.warning(
            "Admin access denied for user id=%s",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )

    return current_user
