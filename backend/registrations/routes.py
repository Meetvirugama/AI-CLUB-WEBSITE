"""
registrations/routes.py
-----------------------
FastAPI router for the Event Registration system.

Endpoints
─────────
  POST /api/events/{event_id}/register
      Authenticated. Supports JSON + multipart for file uploads.
      Validates everything, writes all tables atomically.

  GET  /api/user/registrations
      Authenticated. Returns all registrations for the current user
      with full detail (responses, team, uploaded files).

  GET  /api/admin/events/{event_id}/registrations
      Admin only. Returns all registrations for one event.

File upload handling
────────────────────
  Registration can include file-type form fields.
  Client sends multipart/form-data where:
    • `data`      — JSON string with regular field responses and optional team block
    • `files`     — one or more file parts named by field_id (e.g. "42")

  The route:
    a. Parses the multipart body.
    b. Extracts `data` JSON → RegistrationSubmitRequest.
    c. For each uploaded file: validate size + MIME (via forms.file_handler),
       save to disk, collect (url, original_name) per field_id.
    d. Calls service.register_for_event() with the collected file URLs.

Error mapping
─────────────
  RegistrationError.status_code → HTTP status code (400/404/409/422)
  Unexpected Exception           → HTTP 500 (logged, generic message)
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.middleware import get_current_user
from db import async_session
from events.admin import require_admin
from forms.file_handler import save_upload, validate_upload
from forms.models import FormField, FormTemplate
from forms.schemas import _field_key
from registrations.schemas import (
    RegistrationSubmitRequest,
    RegistrationSubmitResponse,
    UserRegistrationsResponse,
)
from registrations.service import (
    get_user_registrations,
    register_for_event,
    update_registration,
    delete_registration,
)
from registrations.validators import RegistrationError
from sqlalchemy import select

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Registrations"])


# ─── Dependency ───────────────────────────────────────────────────────────────

async def get_db():
    async with async_session() as session:
        yield session


# ─── Internal: load file fields for an event ─────────────────────────────────

async def _load_file_fields(session: AsyncSession, event_id: int) -> dict:
    """
    Return {field_id_str: FormField} for all file-type fields of an event's form.
    Used to validate and process uploaded files.
    """
    tmpl_result = await session.execute(
        select(FormTemplate).where(FormTemplate.event_id == event_id)
    )
    template = tmpl_result.scalars().first()
    if template is None:
        return {}

    field_result = await session.execute(
        select(FormField).where(
            FormField.template_id == template.id,
            FormField.field_type  == "file",
        )
    )
    return {str(f.id): f for f in field_result.scalars().all()}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/events/{event_id}/register
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register for an event",
    description=(
        "Authenticated users register for an event. "
        "Accepts **multipart/form-data** where:\n"
        "- `data` (required): JSON string with `responses` dict and optional `team` block.\n"
        "- `files` (optional): one or more binary file parts, each named by its `field_id`.\n\n"
        "For JSON-only forms (no file fields), `application/json` is also accepted "
        "by sending the request body directly."
    ),
)
async def register_for_event_endpoint(
    event_id: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registration endpoint that handles both JSON and multipart submissions.
    """
    # ── Parse body: multipart OR JSON ────────────────────────────────────────
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        # ── Multipart: extract data + file parts ─────────────────────────────
        try:
            form_data = await request.form()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not read the submitted form data.",
            )

        raw_data_str = form_data.get("data", "{}")
        try:
            payload_dict = json.loads(raw_data_str)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The 'data' form field must be valid JSON.",
            )

        # Collect uploaded file parts (keyed by field_id string)
        from fastapi import UploadFile  # noqa: PLC0415
        raw_uploads: dict[str, UploadFile] = {}
        for key, value in form_data.multi_items():
            if isinstance(value, UploadFile):
                raw_uploads[key] = value

    elif "application/json" in content_type or not content_type:
        # ── Pure JSON body ────────────────────────────────────────────────────
        try:
            payload_dict = await request.json()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body must be valid JSON.",
            )
        raw_uploads = {}

    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Content-Type must be application/json or multipart/form-data.",
        )

    # ── Pydantic validation of the data payload ───────────────────────────────
    try:
        reg_data = RegistrationSubmitRequest(**payload_dict)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Request validation failed.", "errors": str(exc)},
        )

    # ── Process uploaded files (validate + save) ──────────────────────────────
    uploaded_file_urls: dict[str, tuple] = {}
    saved_file_paths: list[str] = []

    if raw_uploads:
        file_fields = await _load_file_fields(db, event_id)

        for field_id_str, upload in raw_uploads.items():
            field_config = file_fields.get(field_id_str)

            max_kb    = (field_config.file_max_size_kb   if field_config else 5120)
            mime_list = (field_config.file_allowed_types if field_config else "application/octet-stream")

            try:
                file_bytes = await validate_upload(upload, max_kb, mime_list)
                public_url, local_path = await save_upload(
                    file_bytes,
                    upload.filename or "upload",
                    sub_folder=str(event_id),
                )
                saved_file_paths.append(local_path)
            except HTTPException:
                raise  # re-raise 413/415 as-is
            except Exception as exc:
                logger.exception("File upload failed for field %s: %s", field_id_str, exc)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to process uploaded file for field {field_id_str}.",
                )

            # The form responses table only needs the public URL.
            reg_data.responses[field_id_str] = public_url
            # The service needs the public_url, original filename, and local_path.
            uploaded_file_urls[field_id_str] = (public_url, upload.filename or "", local_path)

    # ── Call service ──────────────────────────────────────────────────────────
    try:
        detail = await register_for_event(
            session            = db,
            event_id           = event_id,
            user_id            = current_user.id,
            data               = reg_data,
            uploaded_file_urls = uploaded_file_urls,
        )
    except Exception as exc:
        # DB Transaction failed or validation failed. Clean up saved files.
        import os
        for path in saved_file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as cleanup_exc:
                logger.error(f"Failed to clean up file {path} after registration error: {cleanup_exc}")
        
        if isinstance(exc, RegistrationError):
            raise HTTPException(status_code=exc.status_code, detail=exc.message)

        logger.exception(
            "Unexpected error during registration event_id=%d user_id=%d: %s",
            event_id, current_user.id, exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to a server error. Please try again.",
        )

    return RegistrationSubmitResponse(
        message      = "Registration successful! You are now registered for this event.",
        registration = detail,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/user/registrations
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/user/registrations",
    status_code=status.HTTP_200_OK,
    summary="Get my registrations",
    description=(
        "Returns all events the authenticated user has registered for, "
        "with full detail including form responses, team info, and uploaded files."
    ),
)
async def get_my_registrations(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        from events.models import ClubEvent  # noqa: PLC0415

        details = await get_user_registrations(db, current_user.id)

        # Collect all event_ids and field_ids we need to look up
        event_ids = list({d.event_id for d in details})
        field_ids = set()
        for d in details:
            for r in d.responses:
                field_ids.add(r.field_id)

        # Batch-fetch event titles
        event_title_map: dict[int, str] = {}
        if event_ids:
            ev_result = await db.execute(
                select(ClubEvent.id, ClubEvent.title).where(ClubEvent.id.in_(event_ids))
            )
            for eid, etitle in ev_result.all():
                event_title_map[eid] = etitle or "Untitled Event"

        # Batch-fetch field labels
        field_label_map: dict[int, str] = {}
        if field_ids:
            fl_result = await db.execute(
                select(FormField.id, FormField.label).where(FormField.id.in_(list(field_ids)))
            )
            for fid, flabel in fl_result.all():
                field_label_map[fid] = flabel or f"Field {fid}"

        # Build enriched response
        enriched = []
        for d in details:
            # Build responses_flat: {label: value}
            responses_flat: dict[str, any] = {}
            for r in d.responses:
                label = field_label_map.get(r.field_id, f"Field {r.field_id}")
                responses_flat[label] = r.value

            # Build uploaded_files with field_label
            files_enriched = []
            for uf in d.uploaded_files:
                files_enriched.append({
                    "id": uf.id,
                    "field_label": field_label_map.get(uf.field_id, f"Field {uf.field_id}"),
                    "file_url": uf.file_url,
                    "original_name": uf.original_name,
                })

            enriched.append({
                "id": d.id,
                "event_id": d.event_id,
                "event_title": event_title_map.get(d.event_id, "Unknown Event"),
                "registered_at": d.registered_at.isoformat() if d.registered_at else None,
                "responses_flat": responses_flat,
                "team": {
                    "id": d.team.id,
                    "team_name": d.team.team_name,
                    "members": [
                        {"id": m.id, "member_name": m.member_name, "member_email": m.member_email}
                        for m in d.team.members
                    ],
                } if d.team else None,
                "uploaded_files": files_enriched,
            })

        return {"total": len(enriched), "registrations": enriched}
    except Exception as exc:
        logger.exception("Failed to fetch registrations for user_id=%d: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load your registrations. Please try again.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/events/{event_id}/registration  — edit my registration
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/api/events/{event_id}/registration",
    response_model=RegistrationSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Edit my registration",
    description=(
        "Authenticated users can update their registration while the "
        "registration window is still open. "
        "All existing form responses and team info are replaced atomically. "
        "Accepts the same multipart/form-data or application/json body as POST."
    ),
)
async def update_registration_endpoint(
    event_id: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ── Parse body: multipart OR JSON (same as POST) ──────────────────────────
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        try:
            form_data = await request.form()
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Failed to parse multipart form: {exc}")

        raw_data_str = form_data.get("data", "{}")
        try:
            payload_dict = json.loads(raw_data_str)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="The 'data' form field must be valid JSON.")

        from fastapi import UploadFile  # noqa: PLC0415
        raw_uploads: dict[str, UploadFile] = {}
        for key, value in form_data.multi_items():
            if isinstance(value, UploadFile):
                raw_uploads[key] = value

    elif "application/json" in content_type or not content_type:
        try:
            payload_dict = await request.json()
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid JSON body: {exc}")
        raw_uploads = {}
    else:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="Content-Type must be application/json or multipart/form-data.")

    try:
        reg_data = RegistrationSubmitRequest(**payload_dict)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"message": "Request validation failed.", "errors": str(exc)})

    # ── Process uploaded files ────────────────────────────────────────────────
    uploaded_file_urls: dict[str, tuple] = {}
    saved_file_paths: list[str] = []

    if raw_uploads:
        file_fields = await _load_file_fields(db, event_id)

        for field_id_str, upload in raw_uploads.items():
            field_config = file_fields.get(field_id_str)
            max_kb    = (field_config.file_max_size_kb   if field_config else 5120)
            mime_list = (field_config.file_allowed_types if field_config else "application/octet-stream")

            try:
                file_bytes = await validate_upload(upload, max_kb, mime_list)
                public_url, local_path = await save_upload(
                    file_bytes,
                    upload.filename or "upload",
                    sub_folder=str(event_id),
                )
                saved_file_paths.append(local_path)
            except HTTPException:
                raise
            except Exception as exc:
                logger.exception("File upload failed for field %s: %s", field_id_str, exc)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                    detail=f"Failed to process uploaded file for field {field_id_str}.")

            reg_data.responses[field_id_str] = public_url
            uploaded_file_urls[field_id_str] = (public_url, upload.filename or "", local_path)

    # ── Call service ──────────────────────────────────────────────────────────
    try:
        detail = await update_registration(
            session            = db,
            event_id           = event_id,
            user_id            = current_user.id,
            data               = reg_data,
            uploaded_file_urls = uploaded_file_urls,
        )
    except Exception as exc:
        import os as _os
        for path in saved_file_paths:
            try:
                if _os.path.exists(path):
                    _os.remove(path)
            except Exception as cleanup_exc:
                logger.error("Failed to clean up file %s: %s", path, cleanup_exc)

        if isinstance(exc, RegistrationError):
            raise HTTPException(status_code=exc.status_code, detail=exc.message)

        logger.exception("Unexpected error updating registration event_id=%d user_id=%d: %s",
                         event_id, current_user.id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Update failed: {type(exc).__name__}: {exc}")

    return RegistrationSubmitResponse(
        message      = "Registration updated successfully!",
        registration = detail,
    )


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/events/{event_id}/registration  — withdraw my registration
# ─────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/api/events/{event_id}/registration",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Withdraw my registration",
    description=(
        "Authenticated users can withdraw their registration while the "
        "registration window is still open. "
        "This permanently removes all form responses, team data, and uploaded files."
    ),
)
async def delete_registration_endpoint(
    event_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await delete_registration(
            session  = db,
            event_id = event_id,
            user_id  = current_user.id,
        )
    except RegistrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        logger.exception("Unexpected error withdrawing registration event_id=%d user_id=%d: %s",
                         event_id, current_user.id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Could not withdraw registration: {type(exc).__name__}: {exc}")
