"""
chatbot_rag/routes.py
─────────────────────
Admin-only API endpoints for managing the RAG knowledge base.

All routes require the `require_admin` dependency — HTTP 403 for non-admins.

Endpoints:
  POST /api/admin/chatbot/rag/reindex          — full rebuild
  POST /api/admin/chatbot/rag/reindex/incremental — upsert only
  GET  /api/admin/chatbot/rag/stats            — chunk count by source type
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from events.admin import require_admin
from db import get_db
from chatbot.rag.indexer import run_full_reindex, run_incremental_index

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/chatbot/rag", tags=["chatbot-rag-admin"])


@router.post("/reindex")
async def full_reindex(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Perform a full reindex: delete all existing RAG chunks and rebuild from
    all public AI Club database tables.

    This is a potentially long-running operation (seconds). In production,
    consider triggering this from a background task for very large datasets.
    """
    try:
        stats = await run_full_reindex(db)
        return {"status": "ok", "message": "Full reindex complete.", **stats}
    except Exception as exc:
        logger.error(f"[RAG] Full reindex failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reindex failed: {type(exc).__name__}")


@router.post("/reindex/incremental")
async def incremental_reindex(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Upsert all current public content into the knowledge base without
    deleting existing chunks. Faster than a full reindex.
    """
    try:
        stats = await run_incremental_index(db)
        return {"status": "ok", "message": "Incremental reindex complete.", **stats}
    except Exception as exc:
        logger.error(f"[RAG] Incremental reindex failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Incremental reindex failed: {type(exc).__name__}")


@router.get("/stats")
async def rag_stats(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Return summary statistics about the current RAG knowledge base:
    total chunk count, breakdown by source type, and last updated timestamp.
    """
    try:
        total_result = await db.execute(
            text("SELECT COUNT(*) FROM chatbot_knowledge_chunks WHERE visibility = 'public'")
        )
        total = total_result.scalar_one() or 0

        by_source_result = await db.execute(text("""
            SELECT source_type, COUNT(*) AS cnt
            FROM chatbot_knowledge_chunks
            WHERE visibility = 'public'
            GROUP BY source_type
            ORDER BY cnt DESC
        """))
        by_source = {row.source_type: row.cnt for row in by_source_result.fetchall()}

        last_updated_result = await db.execute(text("""
            SELECT MAX(updated_at) FROM chatbot_knowledge_chunks WHERE visibility = 'public'
        """))
        last_updated = last_updated_result.scalar_one()

        return {
            "total_chunks": total,
            "by_source_type": by_source,
            "last_updated": last_updated.isoformat() if last_updated else None,
            "indexed": total > 0,
        }
    except Exception as exc:
        logger.error(f"[RAG] Stats query failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not fetch RAG stats.")
