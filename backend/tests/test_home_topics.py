"""Homepage topics strip: public list, admin CRUD, and the admin guard."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db import Base
from events.admin import require_admin
from home_topics.models import HomeTopic  # noqa: F401  (registers the table)
from home_topics.routes import get_db
from main import app


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: HomeTopic.__table__.create(c))
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _db():
        async with Session() as s:
            yield s

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[require_admin] = lambda: object()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_crud_and_public_list(client):
    a = (await client.post("/api/admin/home-topics", json={"label": "  Kaggle contests ", "order_no": 2})).json()
    b = (await client.post("/api/admin/home-topics", json={"label": "Buildathons", "order_no": 1})).json()
    assert a["label"] == "Kaggle contests"

    public = (await client.get("/api/home-topics")).json()
    assert [t["label"] for t in public] == ["Buildathons", "Kaggle contests"]

    hidden = await client.put(f"/api/admin/home-topics/{a['id']}", json={"is_active": False})
    assert hidden.status_code == 200
    assert [t["label"] for t in (await client.get("/api/home-topics")).json()] == ["Buildathons"]
    assert len((await client.get("/api/admin/home-topics")).json()) == 2

    assert (await client.delete(f"/api/admin/home-topics/{b['id']}")).status_code == 200
    assert (await client.delete(f"/api/admin/home-topics/{b['id']}")).status_code == 404


@pytest.mark.asyncio
async def test_rejects_blank_label(client):
    res = await client.post("/api/admin/home-topics", json={"label": "   "})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_admin_routes_require_admin(client):
    app.dependency_overrides.pop(require_admin)
    res = await client.post("/api/admin/home-topics", json={"label": "Nope"})
    assert res.status_code in (401, 403)
