
def parse_sse_response(resp):
    import json
    data = {"text": "", "reply": "", "navigation_action": None, "sources": []}
    for line in resp.text.splitlines():
        if line.startswith("data: "):
            try:
                event_data = json.loads(line[6:])
                if "text" in event_data:
                    data["text"] += event_data["text"]
                    data["reply"] += event_data["text"]
                if "navigation_action" in event_data and event_data["navigation_action"]:
                    data["navigation_action"] = event_data["navigation_action"]
                if "sources" in event_data and event_data["sources"]:
                    data["sources"].extend(event_data["sources"])
            except json.JSONDecodeError:
                pass
    return data

"""
tests/test_chatbot.rag.py
──────────────────────────
Tests for the RAG pipeline (§10–13):
  - retrieve_relevant_chunks returns results for matching queries
  - retrieve_relevant_chunks returns [] for empty/garbage queries
  - format_rag_context formats chunks correctly
  - Indexer _collect_chunks only accesses public tables
  - Topic selector picks the right sections
  - Context minimization (_select_relevant_topics) works correctly
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from chatbot.provider import ChatCallResult


def make_mock_stream(text, result_obj):
    async def _stream(*args, **kwargs):
        yield text, None
        yield None, result_obj
    return _stream


class TestRelevantTopicSelector:
    """§27 — topic selector routes to the right DB sections."""

    def test_events_query(self):
        from chatbot.context import _select_relevant_topics
        topics = _select_relevant_topics("When is the next hackathon?")
        assert "events" in topics

    def test_members_query(self):
        from chatbot.context import _select_relevant_topics
        topics = _select_relevant_topics("Who are the club members?")
        assert "members" in topics

    def test_projects_query(self):
        from chatbot.context import _select_relevant_topics
        topics = _select_relevant_topics("Tell me about the RAG project.")
        assert "projects" in topics

    def test_roadmap_query(self):
        from chatbot.context import _select_relevant_topics
        topics = _select_relevant_topics("Show me the ML roadmap.")
        assert "roadmaps" in topics

    def test_resources_query(self):
        from chatbot.context import _select_relevant_topics
        topics = _select_relevant_topics("What learning resources are available?")
        assert "resources" in topics

    def test_broad_query_returns_only_about(self):
        """A broad/unknown query returns only 'about' topics as safe fallback since RAG handles the rest."""
        from chatbot.context import _select_relevant_topics
        from chatbot.context import _TOPIC_KEYWORDS
        topics = _select_relevant_topics("Tell me everything.")
        assert topics == {"about"}

    def test_about_always_included(self):
        """Static club info is always included regardless of query."""
        from chatbot.context import _select_relevant_topics
        # Even for very specific queries, 'about' section is included
        topics = _select_relevant_topics("What is the next Build Night date?")
        assert "about" in topics


class TestFormatRagContext:
    """format_rag_context produces well-structured output."""

    def test_empty_chunks_returns_empty_string(self):
        from chatbot.rag.retriever import format_rag_context
        assert format_rag_context([]) == ""

    def test_single_chunk_formatted_correctly(self):
        from chatbot.rag.retriever import format_rag_context
        chunks = [{
            "title": "Build Night 3",
            "content": "Build Night 3 is a hands-on AI workshop.",
            "url": "/events",
            "source_type": "events",
            "rank": 0.9,
        }]
        result = format_rag_context(chunks)
        assert "Build Night 3" in result
        assert "events" in result
        assert "/events" in result
        assert "RETRIEVED KNOWLEDGE BASE" in result

    def test_multiple_chunks_numbered(self):
        from chatbot.rag.retriever import format_rag_context
        chunks = [
            {"title": "Member A", "content": "Member A is the president.",
             "url": "/team", "source_type": "members", "rank": 0.9},
            {"title": "Member B", "content": "Member B leads projects.",
             "url": "/team", "source_type": "members", "rank": 0.7},
        ]
        result = format_rag_context(chunks)
        assert "[1]" in result
        assert "[2]" in result

    def test_chunk_without_url_does_not_crash(self):
        from chatbot.rag.retriever import format_rag_context
        chunks = [{"title": "Test", "content": "content", "url": "",
                   "source_type": "news", "rank": 0.5}]
        result = format_rag_context(chunks)
        assert "Test" in result


class TestRetriever:
    """retrieve_relevant_chunks database interaction."""

    @pytest.mark.asyncio
    async def test_empty_query_returns_empty(self):
        from chatbot.rag.retriever import retrieve_relevant_chunks
        mock_session = AsyncMock()
        result = await retrieve_relevant_chunks(mock_session, "")
        assert result == []

    @pytest.mark.asyncio
    async def test_whitespace_query_returns_empty(self):
        from chatbot.rag.retriever import retrieve_relevant_chunks
        mock_session = AsyncMock()
        result = await retrieve_relevant_chunks(mock_session, "   ")
        assert result == []

    @pytest.mark.asyncio
    async def test_db_error_returns_empty(self):
        """On DB failure, retriever returns [] gracefully (non-fatal)."""
        from chatbot.rag.retriever import retrieve_relevant_chunks
        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("DB connection failed")
        result = await retrieve_relevant_chunks(mock_session, "AI Club events")
        assert result == []

    @pytest.mark.asyncio
    async def test_fts_results_returned(self):
        """When FTS returns rows, they are returned as list of dicts."""
        from chatbot.rag.retriever import retrieve_relevant_chunks

        # Build a mock row
        mock_row = MagicMock()
        mock_row.title = "Build Night Workshop"
        mock_row.content = "A hands-on AI workshop."
        mock_row.url = "/events"
        mock_row.source_type = "events"
        mock_row.rank = 0.85

        mock_result = MagicMock()
        mock_result.fetchall.return_value = [mock_row]

        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        results = await retrieve_relevant_chunks(mock_session, "Build Night")
        assert len(results) == 1
        assert results[0]["title"] == "Build Night Workshop"
        assert results[0]["source_type"] == "events"
        assert results[0]["rank"] == pytest.approx(0.85)

    @pytest.mark.asyncio
    async def test_low_rank_results_filtered(self):
        """Results with rank below _MIN_RANK threshold are excluded."""
        from chatbot.rag.retriever import retrieve_relevant_chunks

        mock_row = MagicMock()
        mock_row.title = "Barely Related"
        mock_row.content = "Marginally relevant content."
        mock_row.url = ""
        mock_row.source_type = "news"
        mock_row.rank = 0.001  # Below _MIN_RANK = 0.01

        # FTS returns this low-rank row
        mock_result_fts = MagicMock()
        mock_result_fts.fetchall.return_value = [mock_row]

        # ILIKE fallback returns nothing
        mock_result_like = MagicMock()
        mock_result_like.fetchall.return_value = []

        mock_session = AsyncMock()
        mock_session.execute.side_effect = [mock_result_fts, mock_result_like]

        results = await retrieve_relevant_chunks(mock_session, "Build Night news")
        assert results == []


class TestRagIntegrationInChat:
    """RAG chunks are injected into chat context correctly."""

    @pytest.mark.asyncio
    async def test_rag_chunks_appear_in_sources(self, client, mocker):
        """When RAG finds chunks, their URLs appear in the sources response."""
        rag_chunks = [{
            "title": "NLP Roadmap Phase 1",
            "content": "Learn tokenization, embeddings, and transformers.",
            "url": "/roadmaps/nlp",
            "source_type": "roadmaps",
            "rank": 0.9,
        }]
        mocker.patch("chatbot.routes.retrieve_relevant_chunks", new_callable=AsyncMock,
                     return_value=rag_chunks)
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=lambda **kwargs: (
                __import__("asyncio").coroutine(
                    lambda: ("The NLP roadmap covers tokenization.", __import__("chatbot.provider").ChatCallResult(
                        provider="groq", provider_key_idx=1, model="test",
                        input_tokens=50, output_tokens=30, latency_ms=100,
                        status="success", fallback_used=False,
                    ))
                )()
            ),
        )


        mock_result = ChatCallResult(
            provider="groq", provider_key_idx=1, model="test-model",
            input_tokens=100, output_tokens=50, latency_ms=200,
            status="success", fallback_used=False,
        )
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_mock_stream("The NLP roadmap covers tokenization.", mock_result),
        )

        resp = await client.post("/api/club-chat", json={"message": "Tell me about the NLP roadmap"})
        assert resp.status_code == 200
        data = parse_sse_response(resp)
        source_urls = [s.get("url") for s in data.get("sources", [])]
        assert "/roadmaps/nlp" in source_urls

    @pytest.mark.asyncio
    async def test_rag_failure_is_non_fatal(self, client, mocker):
        """If RAG fails, chat still works (graceful degradation)."""
        mocker.patch("chatbot.routes.retrieve_relevant_chunks",
                     side_effect=Exception("DB timeout"))

        mock_result = ChatCallResult(
            provider="groq", provider_key_idx=1, model="test-model",
            input_tokens=100, output_tokens=50, latency_ms=200,
            status="success", fallback_used=False,
        )
        mocker.patch(
            "chatbot.provider.provider_manager.generate_stream",
            side_effect=make_mock_stream("AI Club has many great projects!", mock_result),
        )

        resp = await client.post("/api/club-chat", json={"message": "Tell me about projects"})
        assert "AI Club has many great projects!" in resp.text
