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
                                 content, f"/roadmaps/{rm.roadmap_type.lower()}"))
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


async def _upsert_chunks(session: AsyncSession, chunks: list[dict]) -> int:
    """
    Upsert chunks into the knowledge table using a raw SQL ON CONFLICT statement,
    then refresh the tsvector column for inserted/updated rows.
    Returns the number of rows upserted.
    """
    if not chunks:
        return 0

    now = datetime.now(timezone.utc)
    upserted = 0

    for chunk in chunks:
        await session.execute(text("""
            INSERT INTO chatbot_knowledge_chunks
                (source_type, source_id, title, content, url, visibility, created_at, updated_at)
            VALUES
                (:source_type, :source_id, :title, :content, :url, :visibility, :now, :now)
            ON CONFLICT (source_type, source_id)
                WHERE source_id IS NOT NULL
            DO UPDATE SET
                title      = EXCLUDED.title,
                content    = EXCLUDED.content,
                url        = EXCLUDED.url,
                updated_at = EXCLUDED.updated_at
        """), {**chunk, "now": now})
        upserted += 1

    # Refresh ts_vector for all public chunks in bulk
    await session.execute(text("""
        UPDATE chatbot_knowledge_chunks
        SET ts_vector = to_tsvector('english', title || ' ' || content)
        WHERE visibility = 'public' AND ts_vector IS NULL
           OR updated_at > created_at
    """))

    await session.commit()
    return upserted


async def run_full_reindex(session: AsyncSession) -> dict:
    """
    Delete all existing chunks and rebuild the entire knowledge base from scratch.
    Returns stats dict: {deleted, indexed, sources}.
    """
    # Count existing
    from chatbot_rag.models import KnowledgeChunk  # noqa: ensure registered
    count_result = await session.execute(text("SELECT COUNT(*) FROM chatbot_knowledge_chunks"))
    deleted = count_result.scalar_one() or 0

    # Delete all
    await session.execute(text("DELETE FROM chatbot_knowledge_chunks"))
    await session.commit()

    # Collect and index
    chunks = await _collect_chunks(session)
    indexed = await _upsert_chunks(session, chunks)

    source_counts: dict[str, int] = {}
    for c in chunks:
        source_counts[c["source_type"]] = source_counts.get(c["source_type"], 0) + 1

    logger.info(f"[RAG] Full reindex complete: {deleted} deleted, {indexed} indexed — {source_counts}")
    return {"deleted": deleted, "indexed": indexed, "sources": source_counts}


async def run_incremental_index(session: AsyncSession) -> dict:
    """
    Upsert all public content without deleting existing chunks.
    Useful for background refresh after content changes.
    Returns stats dict: {indexed, sources}.
    """
    chunks = await _collect_chunks(session)
    indexed = await _upsert_chunks(session, chunks)

    source_counts: dict[str, int] = {}
    for c in chunks:
        source_counts[c["source_type"]] = source_counts.get(c["source_type"], 0) + 1

    logger.info(f"[RAG] Incremental index complete: {indexed} upserted — {source_counts}")
    return {"indexed": indexed, "sources": source_counts}
