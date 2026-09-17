import os
import json
import logging
import asyncio
import httpx
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Tuple

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime, timezone

# ── Multi-provider LLM key pool ────────────────────────────────────────────
from chatbot.provider import provider_manager

# SQLAlchemy AsyncIO imports
from sqlalchemy import Column, Integer, String, Text, DateTime, select

# ── Shared DB (engine + session factory + Base) ────────────────────────────
from db import Base, async_session, engine, get_db  # noqa: E402

# ── Auth module ────────────────────────────────────────────────────────────
from auth.config import settings as auth_settings
from auth.models import User  # registers User table with Base
from auth.routes import router as auth_router

# ── Events module ──────────────────────────────────────────────────────────
from events.models import ClubEvent   # registers the table with Base
from events.routes import router as events_router

# ── Forms module (Dynamic Event Form Builder) ──────────────────────────────
from forms.models import FormTemplate, FormField   # registers tables with Base
from forms.routes import router as forms_router

# ── Registrations module ───────────────────────────────────────────────────
from registrations.models import (
    EventRegistration, RegistrationResponse,
    Team, TeamMember, UploadedFile,
)
from registrations.routes import router as registrations_router

# ── Admin Dashboard module ─────────────────────────────────────────────────
from admin.routes import router as admin_router

# ── Members, Projects, Resources, Roadmaps ─────────────────────────────────
from members.models import ClubMember
from members.routes import router as members_router

from projects.models import ClubProject
from projects.routes import router as projects_router

from resources.models import ClubResource
from resources.routes import router as resources_router

from roadmaps.models import ClubRoadmap
from roadmaps.routes import router as roadmaps_router

# ── Tracks module ──────────────────────────────────────────────────────────
from auth.middleware import get_optional_user
from tracks.models import ClubTrack
from tracks.routes import router as tracks_router

# ── Achievements module ────────────────────────────────────────────────────
from achievements.models import ClubAchievement
from achievements.routes import router as achievements_router

# ── Past Events module ─────────────────────────────────────────────────────
from past_events.models import PastEvent
from past_events.routes import router as past_events_router

# ── News module ────────────────────────────────────────────────────────────
from news.models import ClubNews
from news.routes import router as news_router

# ── Weekly Veneza module ───────────────────────────────────────────────────
from weekly_veneza.models import WeeklyVenezaWeek, WeeklyVenezaResource, UserWeeklyVenezaProgress
from weekly_veneza.routes import router as weekly_veneza_router

# ── Chatbot Analytics module ───────────────────────────────────────────────
from chatbot.analytics.models import ChatUsageEvent, ChatDailyMetric, ProviderKeyStats  # noqa: registers tables
from chatbot.analytics.routes import router as chatbot_analytics_router
from chatbot.analytics.queries import log_chat_event

# ── Chatbot RAG module ─────────────────────────────────────────────────────
from chatbot.routes import router as chatbot_router
from chatbot.rag.models import KnowledgeChunk  # noqa: registers table
from chatbot.rag.routes import router as chatbot_rag_router
from chatbot.rag.retriever import retrieve_relevant_chunks, format_rag_context


load_dotenv()
logging.basicConfig(level=logging.INFO)

# --- RATE LIMITER STATE ---
CHAT_RATE_LIMITS: Dict[str, Tuple[int, float]] = {}
MAX_REQUESTS_PER_MINUTE = 10

# ── Startup/Shutdown Lifespan ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate auth configuration early so we fail fast.
    auth_settings.validate()

    # Load all LLM API keys into the provider pool.
    provider_manager.load_from_env()

    # Auto-create all tables (idempotent).
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logging.warning(f"Could not connect to database for table creation: {str(e)}")

    # Start the keep-alive background task
    task = asyncio.create_task(keep_alive_task())
    yield
    task.cancel()

# Disable interactive docs in production to avoid exposing the API schema publicly
_is_production = os.getenv("ENVIRONMENT") == "production"
app = FastAPI(
    title="AI Club DAU API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# --- CORS SETUP ---
# Set ALLOWED_ORIGINS in your environment as a comma-separated list of allowed origins.
# In development without ALLOWED_ORIGINS set, only localhost origins are allowed.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# --- UPLOADS DIRECTORY SETUP ---
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "private_uploads")
os.makedirs(uploads_dir, exist_ok=True)
# Intentionally not mounting /uploads statically to protect files



# ── Register routers ───────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(forms_router)
app.include_router(registrations_router)
app.include_router(admin_router)
app.include_router(achievements_router)
app.include_router(members_router)
app.include_router(projects_router)
app.include_router(resources_router)
app.include_router(roadmaps_router)
app.include_router(tracks_router)
app.include_router(past_events_router)
app.include_router(news_router)
app.include_router(weekly_veneza_router)
app.include_router(chatbot_analytics_router)
app.include_router(chatbot_rag_router)
app.include_router(chatbot_router)

# ── Stats Endpoint (Navbar) ────────────────────────────────────────────────
from sqlalchemy.future import select
from sqlalchemy import func

@app.get("/api/stats")
async def get_club_stats(db=Depends(get_db)):
    events_count = await db.scalar(select(func.count(ClubEvent.id)))
    projects_count = await db.scalar(select(func.count(ClubProject.id)))
    members_count = await db.scalar(select(func.count(ClubMember.id)))
    
    return {
        "events": events_count or 0,
        "projects": projects_count or 0,
        "members": members_count or 0,
    }


# ── Startup ────────────────────────────────────────────────────────────────
async def keep_alive_task():
    """
    Pings the /health endpoint every 14 minutes and 50 seconds to prevent
    Render free tier from spinning down the instance.
    Pings /health (not /docs) so the API schema is never exposed just for keep-alive.
    """
    render_external_url = os.getenv("RENDER_EXTERNAL_URL", "https://ai-club-website-e9zk.onrender.com")
    url = f"{render_external_url}/health"
    while True:
        await asyncio.sleep(890)  # 14 minutes and 50 seconds
        try:
            async with httpx.AsyncClient() as client:
                await client.get(url, timeout=10)
                logging.info(f"Keep-alive ping sent to {url}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logging.error(f"Keep-alive ping failed: {e}")



# Used only for local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
