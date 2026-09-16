"""
chatbot_rag/models.py
─────────────────────
SQLAlchemy model for the RAG knowledge chunk table.

Uses PostgreSQL full-text search (tsvector/tsquery) — no pgvector extension
required. All existing PostgreSQL installations support this natively.

Schema:
  chatbot_knowledge_chunks
    id            SERIAL PK
    source_type   VARCHAR  — "members", "projects", "events", "past_events", "resources", "roadmaps",
                              "achievements", "news", "faq", "static"
    source_id     VARCHAR  — original DB row ID (nullable for static content)
    title         TEXT     — human-readable chunk title (used in source attribution)
    content       TEXT     — the chunk text sent to the LLM as retrieved context
    url           VARCHAR  — canonical page URL for source attribution
    visibility    VARCHAR  — always "public" (private content never indexed)
    ts_vector     TSVECTOR — auto-generated full-text search vector
    created_at    TIMESTAMP
    updated_at    TIMESTAMP
"""

from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from db import Base


class KnowledgeChunk(Base):
    """
    A single RAG knowledge chunk from any public AI Club data source.

    Privacy guarantee: only source_type values from the public allowlist
    are ever written here. Restricted tables (registrations, users, etc.)
    are excluded at the indexer layer.
    """
    __tablename__ = "chatbot_knowledge_chunks"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    source_type = Column(String(50),  nullable=False, index=True)
    source_id   = Column(String(100), nullable=True,  index=True)  # Public source row ID; NULL for static chunks
    title       = Column(Text,        nullable=False, default="")
    content     = Column(Text,        nullable=False)
    url         = Column(String(500), nullable=True,  default="")
    visibility  = Column(String(20),  nullable=False, default="public")
    ts_vector   = Column(TSVECTOR,    nullable=True)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        # GIN index for fast full-text search
        Index("ix_knowledge_chunks_ts_vector", "ts_vector", postgresql_using="gin"),
        # Unique constraint enables ON CONFLICT upserts in the indexer
        UniqueConstraint("source_type", "source_id",
                         name="uq_knowledge_chunks_source"),
    )

    def __repr__(self) -> str:
        return f"<KnowledgeChunk source={self.source_type}/{self.source_id} title={self.title!r}>"
