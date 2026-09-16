# NeuralNode Chatbot — Production Checklist

## Applied in this package
- Strict Pydantic message/history bounds and role validation.
- Off-topic requests are rejected before an LLM call when retrieval also has no match.
- RAG is preferred over full DB context to avoid duplicate prompt tokens.
- Retrieved content is explicitly treated as untrusted data, not instructions.
- Model-generated markdown link targets are restricted to relative/http/https URLs.
- Successful Gemini fallback is recorded as a successful request with `fallback_used=true`.
- RAG full reindex is transactional: failures roll back instead of leaving a partial index.
- Incremental RAG indexing removes stale public source rows.
- RAG vector refresh has explicit AND/OR grouping.
- Roadmap URLs use a fixed allowlist mapping.
- Provider key labels preserve their original environment-variable index.
- `get_running_loop()` is used for asyncio.
- Python bytecode caches are excluded from the archive.

## Required deployment step
Run `backend/chatbot/rag/001_fix_knowledge_constraint.sql` once on an existing database that still has the old RAG uniqueness constraint.

## Still dependent on the surrounding application
Authentication/JWT implementation, database migrations, Redis/shared rate limiting, CORS/CSRF policy, package lockfiles, deployment configuration, and frontend files outside this archive must be audited in the complete application repository.
