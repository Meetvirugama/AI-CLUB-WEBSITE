"""
tests/conftest.py
─────────────────
Shared fixtures for all chatbot tests.

Uses httpx.AsyncClient with the FastAPI ASGI interface so tests
run without a real network connection and without an actual DB.

DB calls are patched via AsyncMock — tests are pure unit/integration
tests of the chatbot logic layer, not the database.
"""

import sys
import os

# Ensure the backend directory is on the path so imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Set required environment variables for tests
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-123"

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

# Patch provider_manager before importing main so no real API keys are needed
import chatbot.provider as chatbot_provider
chatbot_provider.provider_manager = MagicMock()
chatbot_provider.provider_manager.is_ready = True

from chatbot.provider import ChatCallResult

# Default mock result — Groq key 1 success
_DEFAULT_CALL_RESULT = ChatCallResult(
    provider="groq",
    provider_key_idx=1,
    model="test-model",
    input_tokens=100,
    output_tokens=50,
    latency_ms=200,
    status="success",
    fallback_used=False,
)


@pytest.fixture(autouse=True)
def patch_analytics(mocker):
    """Silence analytics so every test doesn't need a real DB."""
    mocker.patch("chatbot.routes.log_chat_event", new_callable=AsyncMock)
    mocker.patch("chatbot.routes._log_chat_analytics", new_callable=AsyncMock)


@pytest.fixture(autouse=True)
def patch_rag(mocker):
    """Return empty RAG results by default (tests that need RAG override this)."""
    mocker.patch("chatbot.routes.retrieve_relevant_chunks", new_callable=AsyncMock, return_value=[])


@pytest.fixture(autouse=True)
def patch_db_context(mocker):
    """Return empty context string by default (tests override per-case)."""
    mocker.patch(
        "chatbot.routes.build_chatbot_context_filtered",
        new_callable=AsyncMock,
        return_value=("AI Club DAU is an AI/ML club at DAU, Gandhinagar.", []),
    )


@pytest.fixture(autouse=True)
def clear_rate_limits():
    """Clear the rate limit dictionary before each test to avoid 429 errors."""
    from chatbot.routes import CHAT_RATE_LIMITS, _STREAMING_CACHE
    CHAT_RATE_LIMITS.clear()
    _STREAMING_CACHE.clear()


@pytest_asyncio.fixture
async def client():
    """Async HTTP client pointed at the FastAPI app (no real server needed)."""
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def admin_client(client):
    """Client with admin JWT already injected into get_optional_user."""
    from main import app
    from auth.middleware import get_optional_user
    admin_user = MagicMock()
    admin_user.id = 1
    admin_user.email = "admin@test.com"
    admin_user.is_admin = True
    app.dependency_overrides[get_optional_user] = lambda: admin_user
    yield client
    app.dependency_overrides.pop(get_optional_user, None)


@pytest_asyncio.fixture
async def anonymous_client(client):
    """Client with anonymous user (None)."""
    from main import app
    from auth.middleware import get_optional_user
    app.dependency_overrides[get_optional_user] = lambda: None
    yield client
    app.dependency_overrides.pop(get_optional_user, None)


@pytest_asyncio.fixture
async def normal_client(client):
    """Client with normal user (is_admin=False)."""
    from main import app
    from auth.middleware import get_optional_user
    normal_user = MagicMock()
    normal_user.is_admin = False
    app.dependency_overrides[get_optional_user] = lambda: normal_user
    yield client
    app.dependency_overrides.pop(get_optional_user, None)



def make_generate_mock(reply: str, call_result: ChatCallResult | None = None):
    """Helper: return a function that returns an async generator for generate_stream()."""
    result = call_result or _DEFAULT_CALL_RESULT
    
    async def mock_generator(*args, **kwargs):
        yield reply, None
        yield None, result
        
    return MagicMock(side_effect=mock_generator)
