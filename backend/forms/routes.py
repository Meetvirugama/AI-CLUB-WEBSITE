"""
forms/routes.py
---------------
FastAPI router for the Dynamic Event Form Builder.

Admin endpoints (JWT + super-admin required)
────────────────────────────────────────────
  POST   /api/admin/events/{event_id}/form-fields         Add a single field
  POST   /api/admin/events/{event_id}/form-fields/bulk    Add multiple fields at once
  GET    /api/admin/events/{event_id}/form-fields         Get full form template + fields
  PUT    /api/admin/form-fields/{field_id}                Update a single field
  DELETE /api/admin/form-fields/{field_id}                Delete a single field
  PUT    /api/admin/events/{event_id}/form-fields/reorder Reorder all fields

Public endpoints
────────────────
  GET    /api/events/{event_id}/form-schema               Returns the form schema for a
                                                          public-facing registration form
                                                          (no admin auth required)

Form submission endpoint (authenticated user required)
──────────────────────────────────────────────────────
  POST   /api/events/{event_id}/submit                    Submit a filled form.
                                                          Validates against the dynamic
                                                          schema. Handles file uploads
                                                          via multipart/form-data.

Error codes
───────────
  400 — validation error
  401 — not authenticated
  403 — not super-admin
  404 — event or field not found
  409 — duplicate label within same form
  413 — file too large
  415 — file type not allowed
  500 — unexpected server error
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

from fastapi import (
    APIRouter, Body, Depends, File, Form, HTTPException,
    Query, Request, UploadFile, status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from db import async_session
from events.admin import require_admin
from auth.middleware import get_current_user
from forms.file_handler import save_upload, validate_upload
from forms.models import FormField, FormTemplate
from forms.schemas import (
    BulkFormFieldCreateRequest,
    BulkFormFieldCreateResponse,
    FormFieldCreateRequest,
    FormFieldCreateResponse,
    FormFieldDeleteResponse,
    FormFieldResponse,
    FormFieldUpdateRequest,
    FormFieldUpdateResponse,
    FormTemplateResponse,
    build_submission_validator,
    _field_key,
)
from forms.service import (
    add_field,
    add_fields_bulk,
    delete_field,
    get_field_by_id,
    get_form_for_event,
    get_or_create_template,
    reorder_fields,
    update_field,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Form Builder"])


# ─── Dependency: yield a DB session ──────────────────────────────────────────

async def get_db():
    async with async_session() as session:
        yield session


# ─── Helper ──────────────────────────────────────────────────────────────────

def _field_responses(fields: list) -> List[FormFieldResponse]:
    return [FormFieldResponse.from_orm_field(f) for f in fields]


async def _resolve_form_or_404(session: AsyncSession, event_id: int):
    """Return (template, fields) or raise 404."""
    result = await get_form_for_event(session, event_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No form template found for event id={event_id}.",
        )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: POST /api/admin/events/{event_id}/form-fields
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/admin/events/{event_id}/form-fields",
    response_model=FormFieldCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a field to an event's form",
    description=(
        "**Admin only.** Adds one field to the event's form template. "
        "The template is created automatically on first field addition."
    ),
)
async def add_form_field(
    event_id: int,
    data: FormFieldCreateRequest,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        field = await add_field(db, event_id, data)
        return FormFieldCreateResponse(
            message="Form field added successfully.",
            field=FormFieldResponse.from_orm_field(field),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to add form field: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add form field.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: POST /api/admin/events/{event_id}/form-fields/bulk
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/admin/events/{event_id}/form-fields/bulk",
    response_model=BulkFormFieldCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add multiple fields to an event's form at once",
    description=(
        "**Admin only.** Creates multiple fields in a single atomic transaction. "
        "If any field fails validation the entire batch is rejected."
    ),
)
async def add_form_fields_bulk(
    event_id: int,
    data: BulkFormFieldCreateRequest,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        fields = await add_fields_bulk(db, event_id, data.fields)
        return BulkFormFieldCreateResponse(
            message=f"{len(fields)} field(s) added successfully.",
            fields=_field_responses(fields),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to bulk-add form fields: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add form fields.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: GET /api/admin/events/{event_id}/form-fields
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/events/{event_id}/form-fields",
    response_model=FormTemplateResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the form template for an event",
    description="**Admin only.** Returns the full form template and all fields, ordered by display order.",
)
async def get_form_fields_admin(
    event_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    template, fields = await _resolve_form_or_404(db, event_id)
    return FormTemplateResponse(
        template_id=template.id,
        event_id=template.event_id,
        fields=_field_responses(fields),
    )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: PUT /api/admin/form-fields/{field_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/api/admin/form-fields/{field_id}",
    response_model=FormFieldUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a form field",
    description="**Admin only.** Partially updates a field. Only provided fields are changed.",
)
async def update_form_field(
    field_id: int,
    data: FormFieldUpdateRequest,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        field = await update_field(db, field_id, data)
        return FormFieldUpdateResponse(field=FormFieldResponse.from_orm_field(field))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND
            if "not found" in str(exc).lower()
            else status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Failed to update form field id=%d: %s", field_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update form field.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: DELETE /api/admin/form-fields/{field_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/api/admin/form-fields/{field_id}",
    response_model=FormFieldDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a form field",
    description="**Admin only.** Permanently removes a field from the form.",
)
async def delete_form_field(
    field_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_field(db, field_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"FormField with id={field_id} not found.",
        )
    return FormFieldDeleteResponse(message=f"Field id={field_id} deleted successfully.")


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: PUT /api/admin/events/{event_id}/form-fields/reorder
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/api/admin/events/{event_id}/form-fields/reorder",
    response_model=BulkFormFieldCreateResponse,
    status_code=status.HTTP_200_OK,
    summary="Reorder form fields",
    description=(
        "**Admin only.** Reorders fields by supplying an ordered list of field ids. "
        "Order numbers are assigned as 0, 10, 20, … for the supplied sequence."
    ),
)
async def reorder_form_fields(
    event_id: int,
    ordered_ids: List[int] = Body(
        ...,
        description="Ordered list of field ids in desired display order.",
        examples=[[3, 1, 4, 2]],
    ),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    template, _ = await _resolve_form_or_404(db, event_id)
    try:
        fields = await reorder_fields(db, template.id, ordered_ids)
        return BulkFormFieldCreateResponse(
            message="Fields reordered successfully.",
            fields=_field_responses(fields),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to reorder fields: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder fields.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC: GET /api/events/{event_id}/form-schema
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/events/{event_id}/form-schema",
    response_model=FormTemplateResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public registration form schema",
    description=(
        "Returns the ordered list of form fields for an event. "
        "Use this to dynamically render the registration form on the frontend."
    ),
)
async def get_form_schema_public(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await get_form_for_event(db, event_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registration form has been configured for event id={event_id}.",
        )
    template, fields = result
    return FormTemplateResponse(
        template_id=template.id,
        event_id=template.event_id,
        fields=_field_responses(fields),
    )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC (AUTHENTICATED): POST /api/events/{event_id}/submit
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/events/{event_id}/submit",
    status_code=status.HTTP_200_OK,
    summary="Submit a registration form",
    description=(
        "Authenticated users submit a filled registration form for an event. "
        "The submission is validated against the event's dynamic schema. "
        "File fields must be sent as multipart/form-data parts. "
        "All other fields are sent as JSON in the `data` form field."
    ),
)
async def submit_form(
    event_id: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamic form submission handler.

    Flow
    ────
    1. Load the form template + fields for the event.
    2. Parse multipart/form-data: extract the `data` JSON blob and any files.
    3. Build a Pydantic validator dynamically from the form fields.
    4. Validate the submitted data against the dynamic schema.
    5. For each file field: run size/MIME validation, save to disk, replace
       the value with the returned URL string.
    6. Return the validated, normalised submission payload.

    Note: This endpoint returns the validated data. In a full system you
    would persist this in a `form_submissions` table (outside this task scope).
    """
    # ── Step 1: Load form template ────────────────────────────────────────────
    result = await get_form_for_event(db, event_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registration form found for event id={event_id}.",
        )
    template, fields = result

    # ── Step 2: Parse multipart form data ─────────────────────────────────────
    try:
        form_data = await request.form()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request must be multipart/form-data.",
        )

    # Extract the JSON data blob
    raw_data_str = form_data.get("data", "{}")
    try:
        submitted: dict = json.loads(raw_data_str)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'data' form field must be valid JSON.",
        )

    # Extract uploaded files keyed by field label slug
    uploaded_files: dict[str, UploadFile] = {}
    for key, value in form_data.multi_items():
        if isinstance(value, UploadFile):
            uploaded_files[key] = value

    # ── Step 3: Build dynamic validator ──────────────────────────────────────
    file_fields = {_field_key(f.label): f for f in fields if f.field_type == "file"}

    # For file fields, substitute the filename string into submitted data
    for label_key, upload_file in uploaded_files.items():
        if label_key in file_fields:
            submitted[label_key] = upload_file.filename  # placeholder for validation

    DynamicModel = build_submission_validator(fields)

    # ── Step 4: Validate ──────────────────────────────────────────────────────
    try:
        validated = DynamicModel(**submitted)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Form validation failed.", "errors": str(exc)},
        )

    # ── Step 5: Handle file uploads ───────────────────────────────────────────
    final_data = validated.model_dump()

    for label_key, upload_file in uploaded_files.items():
        if label_key not in file_fields:
            continue
        field_config = file_fields[label_key]
        max_kb    = field_config.file_max_size_kb or 5120
        mime_list = field_config.file_allowed_types or "application/octet-stream"

        file_bytes = await validate_upload(upload_file, max_kb, mime_list)
        public_url, _ = await save_upload(
            file_bytes,
            upload_file.filename or "upload",
            sub_folder=str(event_id),
        )
        final_data[label_key] = public_url

    # ── Step 6: Return validated data ────────────────────────────────────────
    return {
        "status":   "success",
        "message":  "Form submitted successfully.",
        "event_id": event_id,
        "user_id":  current_user.id,
        "data":     final_data,
    }
