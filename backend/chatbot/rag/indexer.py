"""
chatbot_rag/indexer.py
──────────────────────
Indexes all public AI Club content into the chatbot_knowledge_chunks table.

Run modes:
  - Full reindex: deletes all existing chunks and rebuilds from scratch.
  - Incremental: upserts chunks by (source_type, source_id); skips unchanged content.

After inserting/updating, triggers PostgreSQL to recompute the tsvector column
using to_tsvector('english', title || ' ' || content).

Privacy guarantee:
  ONLY tables in _PUBLIC_SOURCES are ever read. Restricted tables
  (EventRegistration, RegistrationResponse, Team, TeamMember, User, etc.)
  are never accessed by this module.

Usage:
  await run_full_reindex(db_session)         # from admin route
  await run_incremental_index(db_session)    # for background refresh
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text, select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ── Public source allowlist ────────────────────────────────────────────────────
# NEVER add restricted tables here.
_PUBLIC_SOURCES = (
    "members", "projects", "events", "past_events",
    "resources", "roadmaps", "achievements", "news",
)

ROADMAP_PATHS = {
    "ml": "/roadmaps/ml",
    "dl": "/roadmaps/dl",
    "rl": "/roadmaps/rl",
    "nlp": "/roadmaps/nlp",
    "transformers": "/roadmaps/transformers",
    "genai": "/roadmaps/genai",
    "llm": "/roadmaps/llm",
    "agentic": "/roadmaps/agentic-ai",
    "agentic-ai": "/roadmaps/agentic-ai",
}


# ── Chunk builders — one per source type ─────────────────────────────────────

def _chunk(source_type: str, source_id: Any, title: str, content: str, url: str = "") -> dict:
    return {
        "source_type": source_type,
        "source_id":   str(source_id) if source_id is not None else None,
        "title":       title,
        "content":     content.strip(),
        "url":         url,
        "visibility":  "public",
    }


async def _collect_chunks(session: AsyncSession) -> list[dict]:
    """Read every allowed public table and produce a flat list of chunks."""
    from members.models      import ClubMember
    from projects.models     import ClubProject
    from events.models       import ClubEvent
    from past_events.models  import PastEvent
    from resources.models    import ClubResource
    from roadmaps.models     import ClubRoadmap
    from achievements.models import ClubAchievement
    from news.models         import ClubNews

    chunks: list[dict] = []

    # ── Members ───────────────────────────────────────────────────────────────
    try:
        result = await session.execute(sa_select(ClubMember).order_by(ClubMember.order_no))
        for m in result.scalars().all():
            parts = [f"{m.name or 'Unknown'} — {m.role or 'Member'}"]
            if m.description:
                parts.append(m.description)
            social = []
            if m.github:
                social.append(f"GitHub: {m.github}")
            if m.linkedin:
                social.append(f"LinkedIn: {m.linkedin}")
            if social:
                parts.append(" | ".join(social))
            chunks.append(_chunk("members", m.id, m.name or "Club Member",
                                 "\n".join(parts), "/team"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] members: {exc}")

    # ── Projects ──────────────────────────────────────────────────────────────
    try:
        result = await session.execute(sa_select(ClubProject).order_by(ClubProject.created_at.desc()))
        for p in result.scalars().all():
            parts = [p.title or "AI Club Project"]
            if p.description:
                parts.append(p.description)
            if p.author:
                parts.append(f"Author/Team: {p.author}")
            if p.contributors:
                parts.append(f"Contributors: {p.contributors}")
            if p.tags:
                try:
                    tag_list = json.loads(p.tags) if isinstance(p.tags, str) else p.tags
                    parts.append(f"Tags: {', '.join(tag_list)}")
                except Exception:
                    parts.append(f"Tags: {p.tags}")
            if p.github_link:
                parts.append(f"GitHub: {p.github_link}")
            chunks.append(_chunk("projects", p.id, p.title or "AI Club Project",
                                 "\n".join(parts), "/projects"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] projects: {exc}")

    # ── Events ────────────────────────────────────────────────────────────────
    try:
        result = await session.execute(sa_select(ClubEvent).order_by(ClubEvent.event_date.desc()))
        for ev in result.scalars().all():
            date_str = str(ev.event_date) if ev.event_date else "TBD"
            parts = [f"{ev.title or 'AI Club Event'} — {ev.category or 'event'} on {date_str}"]
            parts.append(f"Status: {ev.status}")
            if ev.description:
                parts.append(ev.description)
            if ev.venue:
                parts.append(f"Venue: {ev.venue}")
            if ev.winners:
                parts.append(f"Winners: {ev.winners}")
            if ev.registration_link:
                parts.append(f"Register: {ev.registration_link}")
            chunks.append(_chunk("events", ev.id, ev.title or "AI Club Event",
                                 "\n".join(parts), "/events"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] events: {exc}")

    # ── Past Events ───────────────────────────────────────────────────────────
    try:
        result = await session.execute(sa_select(PastEvent).order_by(PastEvent.sort_order))
        for pe in result.scalars().all():
            parts = [f"{pe.title or 'Past Event'} ({pe.date_label or ''})"]
            if pe.description:
                parts.append(pe.description)
            if pe.speaker:
                parts.append(f"Speaker: {pe.speaker}")
            if pe.participants:
                parts.append(f"Participants: {pe.participants}")
            if pe.winners:
                parts.append(f"Winners: {pe.winners}")
            if pe.category:
                parts.append(f"Category: {pe.category}")
            chunks.append(_chunk("past_events", pe.id, pe.title or "Past Event",
                                 "\n".join(parts), "/events"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] past_events: {exc}")

    # ── Resources ─────────────────────────────────────────────────────────────
    try:
        result = await session.execute(sa_select(ClubResource).order_by(ClubResource.order_no))
        for r in result.scalars().all():
            parts = [f"[{r.resource_type}] {r.title} (Group: {r.group_name})"]
            if r.description:
                parts.append(r.description)
            if r.url:
                parts.append(f"URL: {r.url}")
            chunks.append(_chunk("resources", r.id, r.title or "Learning Resource",
                                 "\n".join(parts), "/curriculum"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] resources: {exc}")

    # ── Roadmaps ──────────────────────────────────────────────────────────────
    try:
        result = await session.execute(
            sa_select(ClubRoadmap).order_by(ClubRoadmap.roadmap_type, ClubRoadmap.order_no)
        )
        for rm in result.scalars().all():
            try:
                topics_data = json.loads(rm.topics) if isinstance(rm.topics, str) else rm.topics
                topics_str = ", ".join(topics_data) if isinstance(topics_data, list) else str(topics_data)
            except Exception:
                topics_str = rm.topics or ""
            content = (
                f"[{rm.roadmap_type}] Phase {rm.phase}: {rm.title}\n"
                f"Duration: {rm.duration}\n"
                f"Topics: {topics_str}"
            )
            if rm.description:
                content += f"\n{rm.description}"
            chunks.append(_chunk("roadmaps", rm.id,
                                 f"{rm.roadmap_type} Roadmap — Phase {rm.phase}: {rm.title}",
                                 content, ROADMAP_PATHS.get(str(rm.roadmap_type).strip().lower(), "/roadmaps")))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] roadmaps: {exc}")

    # ── Achievements ──────────────────────────────────────────────────────────
    try:
        result = await session.execute(
            sa_select(ClubAchievement).order_by(ClubAchievement.created_at.desc())
        )
        for a in result.scalars().all():
            parts = [f"{a.title or 'Achievement'} — {a.category or 'General'}"]
            parts.append(f"Student/Team: {a.student or 'Unknown'}")
            if a.description:
                parts.append(a.description)
            chunks.append(_chunk("achievements", a.id, a.title or "Club Achievement",
                                 "\n".join(parts), "/achievements"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] achievements: {exc}")

    # ── News ──────────────────────────────────────────────────────────────────
    try:
        result = await session.execute(
            sa_select(ClubNews).order_by(ClubNews.created_at.desc()).limit(50)
        )
        for n in result.scalars().all():
            parts = [n.title or "Club News"]
            if n.description:
                parts.append(n.description)
            if n.sources:
                parts.append(f"Source: {n.sources}")
            if n.link:
                parts.append(f"Read more: {n.link}")
            chunks.append(_chunk("news", n.id, n.title or "Club News",
                                 "\n".join(parts), n.link or "/news"))
    except Exception as exc:
        logger.warning(f"[RAG Indexer] news: {exc}")

    return chunks


class RestrictedContentError(RuntimeError):
    """Raised when a chunk outside the public allowlist reaches the indexer."""


def _assert_public(chunk: dict) -> None:
    """
    Hard gate on everything written to the knowledge base.

    `_PUBLIC_SOURCES` documented the intended boundary but nothing enforced it:
    any future caller of `_upsert_chunks` could have written registration or
    user rows into the table, and the retriever would then have served them to
    the LLM as public context. The chatbot's entire privacy guarantee rests on
    this table containing public data only, so the check belongs at the write
    path rather than in a comment.
    """
    source_type = chunk.get("source_type")
    if source_type not in _PUBLIC_SOURCES:
        raise RestrictedContentError(
            f"Refusing to index chunk from non-public source {source_type!r}. "
            f"Allowed sources: {', '.join(_PUBLIC_SOURCES)}."
        )
    if chunk.get("visibility") != "public":
        raise RestrictedContentError(
            f"Refusing to index chunk with visibility {chunk.get('visibility')!r}."
        )


async def _upsert_chunks(session: AsyncSession, chunks: list[dict], *, commit: bool = True) -> int:
    """Upsert public chunks without relying on a partial/deferrable ON CONFLICT index.

    Existing installations may still have the old deferrable constraint, so this
    deliberately uses UPDATE-then-INSERT inside the current transaction.
    """
    if not chunks:
        return 0

    # Validate the whole batch before writing any of it.
    for chunk in chunks:
        _assert_public(chunk)

    now = datetime.now(timezone.utc)
    upserted = 0

    for chunk in chunks:
        source_type = chunk["source_type"]
        source_id = chunk["source_id"]
        if source_id is None:
            # Static chunks are identified by source_type + title.
            result = await session.execute(text("""
                UPDATE chatbot_knowledge_chunks
                SET title=:title, content=:content, url=:url, visibility=:visibility, updated_at=:now
                WHERE source_type=:source_type AND source_id IS NULL AND title=:title
            """), {**chunk, "now": now})
        else:
            result = await session.execute(text("""
                UPDATE chatbot_knowledge_chunks
                SET title=:title, content=:content, url=:url, visibility=:visibility, updated_at=:now
                WHERE source_type=:source_type AND source_id=:source_id
            """), {**chunk, "now": now})

        if result.rowcount == 0:
            await session.execute(text("""
                INSERT INTO chatbot_knowledge_chunks
                    (source_type, source_id, title, content, url, visibility, created_at, updated_at)
                VALUES
                    (:source_type, :source_id, :title, :content, :url, :visibility, :now, :now)
            """), {**chunk, "now": now})
        upserted += 1

    # Always refresh vectors for rows touched in this transaction.  The explicit
    # predicate avoids the previous AND/OR precedence bug.
    await session.execute(text("""
        UPDATE chatbot_knowledge_chunks
        SET ts_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
        WHERE visibility = 'public'
          AND (ts_vector IS NULL OR updated_at >= :now)
    """), {"now": now})

    if commit:
        await session.commit()
    return upserted


async def run_full_reindex(session: AsyncSession) -> dict:
    """Atomically rebuild the public knowledge index.

    The old index remains intact until the transaction commits. Any collection
    or indexing error rolls the transaction back instead of leaving a partial KB.
    """
    from chatbot.rag.models import KnowledgeChunk  # noqa: F401

    try:
        count_result = await session.execute(text("SELECT COUNT(*) FROM chatbot_knowledge_chunks"))
        existing = int(count_result.scalar_one() or 0)

        chunks = await _collect_chunks(session)
        await session.execute(text("DELETE FROM chatbot_knowledge_chunks"))
        indexed = await _upsert_chunks(session, chunks, commit=False)
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    source_counts: dict[str, int] = {}
    for c in chunks:
        source_counts[c["source_type"]] = source_counts.get(c["source_type"], 0) + 1

    logger.info("[RAG] Full reindex complete: %s replaced, %s indexed — %s", existing, indexed, source_counts)
    return {"deleted": existing, "indexed": indexed, "sources": source_counts}


async def run_incremental_index(session: AsyncSession) -> dict:
    """Synchronize the public KB, including deletion of stale source rows."""
    chunks = await _collect_chunks(session)
    current_keys = {(c["source_type"], c["source_id"]) for c in chunks if c["source_id"] is not None}

    try:
        indexed = await _upsert_chunks(session, chunks, commit=False)

        # Remove stale rows only for sources owned by this public indexer.
        result = await session.execute(text("""
            SELECT id, source_type, source_id
            FROM chatbot_knowledge_chunks
            WHERE visibility='public'
              AND source_type = ANY(:source_types)
        """), {"source_types": list(_PUBLIC_SOURCES)})
        stale_ids = [
            row.id for row in result
            if row.source_id is not None and (row.source_type, row.source_id) not in current_keys
        ]
        if stale_ids:
            await session.execute(
                text("DELETE FROM chatbot_knowledge_chunks WHERE id = ANY(:ids)"),
                {"ids": stale_ids},
            )

        await session.commit()
    except Exception:
        await session.rollback()
        raise

    source_counts: dict[str, int] = {}
    for c in chunks:
        source_counts[c["source_type"]] = source_counts.get(c["source_type"], 0) + 1

    logger.info("[RAG] Incremental index complete: %s upserted, %s stale removed — %s", indexed, len(stale_ids), source_counts)
    return {"indexed": indexed, "stale_deleted": len(stale_ids), "sources": source_counts}

