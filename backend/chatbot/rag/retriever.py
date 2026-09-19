"""
chatbot_rag/retriever.py
────────────────────────
PostgreSQL full-text search (FTS) retriever for the RAG pipeline.

How it works:
  1. Parse the user query into a tsquery using plainto_tsquery (handles
     stop words, stemming, multi-word phrases automatically).
  2. Search the chatbot_knowledge_chunks table using @@ operator against
     the pre-computed ts_vector column (GIN-indexed — very fast).
  3. Rank results with ts_rank() and return the top-k most relevant chunks.
  4. Fall back to a LIKE search if the FTS query returns no results.

Privacy:
  Only chunks with visibility='public' are ever returned.
  The indexer guarantees no restricted content enters the table,
  but this layer adds a second check as defense-in-depth.
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Maximum chunks to inject into the LLM context
_DEFAULT_TOP_K = 5
# Minimum rank score to include a result (filters noise)
_MIN_RANK = 0.01


async def retrieve_relevant_chunks(
    session: AsyncSession,
    query: str,
    top_k: int = _DEFAULT_TOP_K,
) -> list[dict]:
    """
    Full-text search the knowledge base and return the top-k most relevant chunks.

    Returns:
        List of dicts with keys: title, content, url, source_type, rank
        Empty list if nothing found or on DB error.
    """
    if not query or not query.strip():
        return []

    query = query.strip()

    try:
        # ── Primary: PostgreSQL full-text search ───────────────────────────
        fts_sql = text("""
            SELECT
                title,
                content,
                url,
                source_type,
                ts_rank(ts_vector, plainto_tsquery('english', :q)) AS rank
            FROM chatbot_knowledge_chunks
            WHERE
                visibility = 'public'
                AND ts_vector @@ plainto_tsquery('english', :q)
            ORDER BY rank DESC
            LIMIT :k
        """)
        result = await session.execute(fts_sql, {"q": query, "k": top_k})
        rows = result.fetchall()

        if rows:
            chunks = [
                {
                    "title":       r.title,
                    "content":     r.content,
                    "url":         r.url or "",
                    "source_type": r.source_type,
                    "rank":        float(r.rank),
                }
                for r in rows
                if float(r.rank) >= _MIN_RANK
            ]
            if chunks:
                logger.debug("[RAG] FTS returned %d chunks", len(chunks))
                return chunks

        # ── Fallback: ILIKE keyword search ─────────────────────────────────
        # Handles short queries, proper nouns, and exact terms that FTS stems away.
        words = [w.strip() for w in query.split() if len(w.strip()) >= 3]
        if not words:
            return []

        # Build: content ILIKE '%word1%' OR content ILIKE '%word2%' ...
        conditions = " OR ".join([f"content ILIKE :w{i}" for i in range(len(words))])
        like_sql = text(f"""
            SELECT title, content, url, source_type, 1.0::float AS rank
            FROM chatbot_knowledge_chunks
            WHERE visibility = 'public'
              AND ({conditions})
            ORDER BY updated_at DESC
            LIMIT :k
        """)
        params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}
        params["k"] = top_k

        result2 = await session.execute(like_sql, params)
        rows2 = result2.fetchall()
        if rows2:
            logger.debug("[RAG] ILIKE fallback returned %d chunks", len(rows2))
            return [
                {"title": r.title, "content": r.content, "url": r.url or "",
                 "source_type": r.source_type, "rank": 1.0}
                for r in rows2
            ]

    except Exception as exc:
        logger.warning(f"[RAG] Retrieval failed: {exc}")

    return []


def format_rag_context(chunks: list[dict]) -> str:
    """
    Format retrieved chunks into a string suitable for the LLM system prompt.
    Each chunk gets a numbered section with its source.
    """
    if not chunks:
        return ""

    lines = ["\n=== RETRIEVED KNOWLEDGE BASE RESULTS ==="]
    for i, chunk in enumerate(chunks, 1):
        lines.append(f"\n[{i}] {chunk['title']} (source: {chunk['source_type']})")
        lines.append(chunk["content"])
        if chunk.get("url"):
            lines.append(f"    Source: {chunk['url']}")

    return "\n".join(lines)
