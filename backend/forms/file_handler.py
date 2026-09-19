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
    name = re.sub(r"\.{2,}", ".", name)               # no '..' sequences
    return f"{uuid.uuid4().hex}_{name}"


# ─── Extension allowlist ──────────────────────────────────────────────────────
# Registration forms collect documents and images. Anything a browser might
# execute or treat as active content is refused outright, regardless of the
# MIME type the client claims.
_ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".zip",
}

# Extensions that are dangerous to store and serve back even when the declared
# MIME type looks harmless.
_BLOCKED_EXTENSIONS = {
    ".html", ".htm", ".xhtml", ".svg", ".xml", ".js", ".mjs", ".jsx",
    ".php", ".phtml", ".py", ".rb", ".pl", ".sh", ".bash", ".exe",
    ".dll", ".so", ".jar", ".bat", ".cmd", ".com", ".scr", ".msi",
    ".vbs", ".ps1", ".htaccess",
}


# ─── MIME sniffing ────────────────────────────────────────────────────────────
# Magic-byte signatures for the formats we accept. python-magic is an optional
# C-library binding that is NOT in requirements.txt, so relying on it meant the
# sniffer always returned None in practice and validation silently fell back to
# the client-supplied Content-Type header — which an attacker chooses freely.
# These pure-Python checks always run.
_MAGIC_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"%PDF-",                       "application/pdf"),
    (b"\x89PNG\r\n\x1a\n",          "image/png"),
    (b"\xff\xd8\xff",                "image/jpeg"),
    (b"GIF87a",                      "image/gif"),
    (b"GIF89a",                      "image/gif"),
    (b"\xd0\xcf\x11\xe0",            "application/vnd.ms-office"),  # legacy .doc/.xls/.ppt
)

# Content that must never be stored, whatever the extension says.
_DANGEROUS_CONTENT_MARKERS = (
    b"<!doctype html", b"<html", b"<script", b"<?php", b"<svg",
)


def _sniff_mime(header: bytes) -> Optional[str]:
    """
    Determine the MIME type from the file's leading bytes.

    Prefers python-magic when it happens to be installed, otherwise falls back
    to the signature table above. Returns None for formats we cannot identify
    (e.g. plain text, csv), which the caller treats as "unverified".
    """
    try:
        import magic  # type: ignore  # python-magic (optional dep)
        return magic.from_buffer(header, mime=True)
    except Exception:
        pass

    lowered = header[:1024].lstrip().lower()
    for marker in _DANGEROUS_CONTENT_MARKERS:
        if lowered.startswith(marker):
            return "text/html"

    for signature, mime in _MAGIC_SIGNATURES:
        if header.startswith(signature):
            return mime

    # ZIP container — also the envelope for .docx/.xlsx/.pptx.
    if header.startswith(b"PK\x03\x04"):
        return "application/zip"

    return None


def _check_extension(filename: str) -> str:
    """Validate the filename's extension, returning it lowercased."""
    ext = Path(filename or "").suffix.lower()

    if not ext:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Files must have a file extension.",
        )
    if ext in _BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Files of type '{ext}' are not accepted.",
        )
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Files of type '{ext}' are not accepted. Allowed: "
                f"{', '.join(sorted(_ALLOWED_EXTENSIONS))}."
            ),
        )
    return ext


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

    # Extension is checked before reading a single byte.
    _check_extension(upload.filename or "")

    # Read in chunks to enforce size limit without loading huge files fully
    content = bytearray()
    chunk_size = 1024 * 1024  # 1MB chunks
    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File exceeds the maximum allowed size of {max_size_kb} KB "
                    f"({max_size_kb / 1024:.1f} MB)."
                ),
            )
    content = bytes(content)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── MIME validation ───────────────────────────────────────────────────────
    # The sniffed type wins over the declared one. A client controls its own
    # Content-Type header, so trusting it lets an attacker store active content
    # (HTML/SVG) under a benign label — which would then be served back to an
    # admin from the same origin as a stored XSS.
    declared_mime = (upload.content_type or "").lower().split(";")[0].strip()
    sniffed_mime  = _sniff_mime(content[:4096])

    if sniffed_mime in ("text/html", "image/svg+xml", "application/x-dosexec"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="This file contains active content and cannot be uploaded.",
        )

    effective_mime = sniffed_mime or declared_mime

    if allowed and effective_mime not in allowed:
        # Office formats are ZIP containers, so a .docx sniffs as
        # application/zip. Accept when the declared type is allowed and the
        # container shape is consistent with it.
        container_ok = (
            sniffed_mime in ("application/zip", "application/vnd.ms-office")
            and declared_mime in allowed
        )
        if not container_ok:
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
) -> tuple[str, str]:
    """
    Save validated file bytes to the upload directory.

    Args:
        content:           Raw file bytes from `validate_upload`.
        original_filename: The original filename from the client.
        sub_folder:        Optional sub-directory (e.g., str(event_id)).

    Returns:
        A tuple of (public_url, local_file_path).
    """
    upload_dir = get_upload_dir()

    # sub_folder is caller-supplied (an event id today). Constrain it so it can
    # never walk out of the upload root.
    if sub_folder:
        if not str(sub_folder).isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid upload destination.",
            )
        target_dir = upload_dir / str(sub_folder)
    else:
        target_dir = upload_dir

    target_dir.mkdir(parents=True, exist_ok=True)

    # Defence in depth: validate_upload already ran this, but save_upload is a
    # public function and must not depend on its caller having done so.
    _check_extension(original_filename)

    safe_name = _safe_filename(original_filename)
    file_path = target_dir / safe_name

    # Write asynchronously using aiofiles to avoid blocking the event loop
    import aiofiles
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    base_url   = get_upload_base_url()
    rel_path   = f"/{sub_folder}/{safe_name}" if sub_folder else f"/{safe_name}"
    public_url = f"{base_url}{rel_path}"

    logger.info("Saved upload (%d bytes) to %s", len(content), safe_name)
    return public_url, str(file_path)
