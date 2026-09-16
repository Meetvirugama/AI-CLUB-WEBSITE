-- NeuralNode RAG schema hardening
-- Run once against an existing PostgreSQL database.
-- This removes the old deferrable uniqueness constraint.

ALTER TABLE chatbot_knowledge_chunks
    DROP CONSTRAINT IF EXISTS uq_knowledge_chunks_source;

ALTER TABLE chatbot_knowledge_chunks
    ADD CONSTRAINT uq_knowledge_chunks_source
    UNIQUE (source_type, source_id);

CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_public_source
    ON chatbot_knowledge_chunks (source_type, source_id)
    WHERE visibility = 'public';
