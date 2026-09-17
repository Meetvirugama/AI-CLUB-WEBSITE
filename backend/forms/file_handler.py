"""
forms/file_handler.py
---------------------
File upload utilities for form submissions.

Responsibilities
────────────────
• `validate_upload`  — checks size and MIME type against the FormField config.
• `save_upload`      — persists the file to a configurable directory and
                       returns a public-facing URL/path string.
• `get_upload_dir`   — resolves the upload directory from the environment.

Integration pattern
───────────────────
The file field in form submissions is handled via FastAPI's `UploadFile`.
When a form template contains a `file` field, the submission route reads
the file from multipart form data, calls `validate_upload`, then `save_upload`,
and stores the returned path string in the submission record.

Configuration (env vars)
────────────────────────
  UPLOAD_DIR       — absolute or relative path to store uploaded files.
                     Default: ./uploads
  UPLOAD_BASE_URL  — public base URL prefix for returned file paths.
                     Default: /uploads

Security notes
──────────────
• Uploaded filenames are sanitised and prefixed with a UUID to prevent
  path traversal and name collisions.
• MIME type is validated from the file's Content-Type header AND by
  sniffing the first 2 KB of the file (using `python-magic` if available,
  otherwise header-only).
• Files exceeding `file_max_size_kb` are rejected before full read.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger(__name__)


# ─── Configuration ────────────────────────────────────────────────────────────

def get_upload_dir() -> Path:
    default_dir = "/tmp/private_uploads" if os.getenv("VERCEL") else "./private_uploads"
    upload_dir = Path(os.getenv("UPLOAD_DIR", default_dir))
    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        # Fallback to /tmp/private_uploads if directory creation fails due to read-only filesystem
        upload_dir = Path("/tmp/private_uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def get_upload_base_url() -> str:
    return os.getenv("UPLOAD_BASE_URL", "/api/admin/files").rstrip("/")


# ─── Sanitise filename ────────────────────────────────────────────────────────

def _safe_filename(original: str) -> str:
    """
    Strip dangerous characters from a filename and prepend a UUID4.
    'My File (1).pdf' → '<uuid>.My_File_1_.pdf'
    """
    import re
    name = Path(original).name                        # strip any directory part
    name = re.sub(r"[^\w\.\-]", "_", name)            # replace unsafe chars
    name = re.sub(r"_+", "_", name).strip("_")        # collapse underscores
    return f"{uuid.uuid4().hex}_{name}"


# ─── MIME sniffing (best-effort) ──────────────────────────────────────────────

def _sniff_mime(header: bytes) -> Optional[str]:
    """
    Attempt to determine MIME type from the first bytes of the file.
    Returns None if python-magic is not installed (graceful degradation).
    """
    try:
        import magic  # type: ignore  # python-magic (optional dep)
        return magic.from_buffer(header, mime=True)
    except ImportError:
        return None


# ─── Public API ───────────────────────────────────────────────────────────────

async def validate_upload(
    upload: UploadFile,
    max_size_kb: int,
    allowed_types: str,
) -> bytes:
    """
    Validate an UploadFile against the field's size and MIME constraints.

    Reads the entire file into memory for validation (files are bounded by
    max_size_kb so memory usage is controlled).

    Args:
        upload:       FastAPI UploadFile object.
        max_size_kb:  Maximum allowed size in kilobytes.
        allowed_types: Comma-separated MIME types string, e.g. "image/jpeg,image/png".

    Returns:
        The raw file bytes (so the caller doesn't need to re-read).

    Raises:
        HTTP 413 if the file exceeds the size limit.
        HTTP 415 if the MIME type is not allowed.
    """
    allowed = {t.strip().lower() for t in allowed_types.split(",") if t.strip()}
    max_bytes = max_size_kb * 1024

    # Read in chunks to enforce size limit without loading huge files fully
    content = b""
    async for chunk in upload:
        content += chunk
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File '{upload.filename}' exceeds the maximum allowed size "
                    f"of {max_size_kb} KB ({max_size_kb / 1024:.1f} MB)."
                ),
            )

    # ── MIME validation ────────────────────────────────────────────────────────
    declared_mime = (upload.content_type or "").lower().split(";")[0].strip()
    sniffed_mime  = _sniff_mime(content[:2048])
    effective_mime = sniffed_mime or declared_mime

    if allowed and effective_mime not in allowed:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"File type '{effective_mime}' is not allowed for this field. "
                f"Allowed types: {', '.join(sorted(allowed))}"
            ),
        )

    return content


async def save_upload(
    content: bytes,
    original_filename: str,
    sub_folder: str = "",
) -> str:
    """
    Save validated file bytes to the upload directory.

    Args:
        content:           Raw file bytes from `validate_upload`.
        original_filename: The original filename from the client.
        sub_folder:        Optional sub-directory (e.g., str(event_id)).

    Returns:
        A URL-style path string relative to the upload base URL.
        Example: "/uploads/42/3fa8b1c2_resume.pdf"
    """
    upload_dir = get_upload_dir()
    target_dir = upload_dir / sub_folder if sub_folder else upload_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _safe_filename(original_filename)
    file_path = target_dir / safe_name

    # Write asynchronously using aiofiles to avoid blocking the event loop
    import aiofiles
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    base_url   = get_upload_base_url()
    rel_path   = f"/{sub_folder}/{safe_name}" if sub_folder else f"/{safe_name}"
    public_url = f"{base_url}{rel_path}"

    logger.info("Saved upload: %s → %s", original_filename, file_path)
    return public_url
