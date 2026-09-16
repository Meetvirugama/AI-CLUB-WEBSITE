import json
import logging
import random as _random
from typing import List, Tuple
from sqlalchemy.future import select as sa_select
from members.models import ClubMember
from projects.models import ClubProject
from events.models import ClubEvent
from past_events.models import PastEvent
from resources.models import ClubResource
from roadmaps.models import ClubRoadmap
from achievements.models import ClubAchievement
from news.models import ClubNews
from weekly_veneza.models import WeeklyVenezaWeek

# ---------------------------------------------------------------------------
# STATIC CLUB INFO — non-database facts about the club itself
# ---------------------------------------------------------------------------
CLUB_STATIC_INFO = """
ABOUT AI CLUB DAU:
AI Club DAU is the Artificial Intelligence and Machine Learning club at DAU
(Dhirubhai Ambani University, formerly DAIICT), Gandhinagar, Gujarat, India.
The club runs events, workshops, hackathons, and collaborative projects to help
students explore AI/ML. All branches are welcome to join.

SOCIAL LINKS:
- Discord: https://discord.gg/yB3Huet5
- Instagram: https://www.instagram.com/aiclub_dau/
- GitHub: https://github.com/ai-club-dau
- LinkedIn: https://www.linkedin.com/company/ai-club-dau/

HOW TO JOIN:
Fill out the Join Form on the website (scroll to the footer). Provide your name,
branch, area of interest, and reason for joining.

FREQUENTLY ASKED QUESTIONS:
Q: How do I join AI Club DAU?
A: Fill out the Join Form at the bottom of the website.
Q: Who can join?
A: Any DAU student interested in AI/ML. All branches are welcome.
Q: Where can I find the club on social media?
A: Discord: https://discord.gg/yB3Huet5 | Instagram: @aiclub_dau | GitHub: ai-club-dau | LinkedIn: AI Club DAU
"""

# ---------------------------------------------------------------------------
# ACCESS CONTROL — explicit allowlist of tables the chatbot may query.
# The chatbot layer NEVER accesses: event_registrations, registration_responses,
# teams, team_members, uploaded_files, users, user_resource_progress,
# form_templates, form_fields, or any other table not listed below.
# ---------------------------------------------------------------------------
_CHATBOT_ALLOWED_MODELS = (
    "club_members",
    "club_projects",
    "club_events",
    "past_events",
    "club_resources",
    "club_roadmaps",
    "club_achievements",
    "club_news_items",
)


async def build_chatbot_context(db) -> tuple[str, List[dict]]:
    """
    Query every allowed public table and build a structured context string
    for the LLM. Returns (context_text, sources_list).

    Only tables in _CHATBOT_ALLOWED_MODELS are ever accessed here.
    Restricted tables (registrations, users, teams, etc.) are never touched.
    """
    from sqlalchemy.future import select as sa_select

    context_parts: List[str] = [CLUB_STATIC_INFO]
    sources: List[dict] = []

    # ── 1. Members ────────────────────────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubMember).order_by(ClubMember.order_no.asc())
        )
        members = result.scalars().all()
        if members:
            lines = ["\n=== CLUB MEMBERS ==="]
            for m in members:
                parts = [f"- {m.name or 'Unknown'} ({m.role or 'Member'})"]
                if m.description:
                    parts.append(f"  Bio: {m.description}")
                if m.github:
                    parts.append(f"  GitHub: {m.github}")
                if m.linkedin:
                    parts.append(f"  LinkedIn: {m.linkedin}")
                lines.append("\n".join(parts))
            context_parts.append("\n".join(lines))
            sources.append({"title": "Club Members", "type": "members", "url": "/team"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch members: {e}")

    # ── 2. Projects ───────────────────────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubProject).order_by(ClubProject.created_at.desc())
        )
        projects = result.scalars().all()
        if projects:
            lines = ["\n=== CLUB PROJECTS ==="]
            for p in projects:
                entry = [f"- {p.title or 'Untitled'} (by {p.author or 'Unknown'})"]
                if p.description:
                    entry.append(f"  Description: {p.description}")
                if p.tags:
                    try:
                        tag_list = json.loads(p.tags) if isinstance(p.tags, str) else p.tags
                        entry.append(f"  Tags: {', '.join(tag_list)}")
                    except Exception:
                        entry.append(f"  Tags: {p.tags}")
                if p.github_link:
                    entry.append(f"  GitHub: {p.github_link}")
                if p.contributors:
                    entry.append(f"  Contributors: {p.contributors}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            sources.append({"title": "Club Projects", "type": "projects", "url": "/projects"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch projects: {e}")

    # ── 3. Upcoming & active events ───────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubEvent)
            .where(ClubEvent.status.in_(["upcoming", "registration_open", "registration_closed"]))
            .order_by(ClubEvent.event_date.asc())
            .limit(20)
        )
        upcoming = result.scalars().all()
        if upcoming:
            lines = ["\n=== UPCOMING / ACTIVE EVENTS ==="]
            for ev in upcoming:
                date_str = str(ev.event_date) if ev.event_date else "TBD"
                entry = [f"- {ev.title or 'Untitled'} [{ev.category or 'event'}] on {date_str} (Status: {ev.status})"]
                if ev.description:
                    entry.append(f"  Description: {ev.description}")
                if ev.venue:
                    entry.append(f"  Venue: {ev.venue}")
                if ev.registration_link:
                    entry.append(f"  Register: {ev.registration_link}")
                if ev.event_type:
                    entry.append(f"  Type: {ev.event_type}")
                if ev.event_type == "team" and ev.max_team_size:
                    entry.append(f"  Team size: {ev.min_team_size}–{ev.max_team_size}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            sources.append({"title": "Upcoming Events", "type": "events", "url": "/events"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch upcoming events: {e}")

    # ── 4. Completed / past events (from club_events) ─────────────────────
    try:
        result = await db.execute(
            sa_select(ClubEvent)
            .where(ClubEvent.status == "completed")
            .order_by(ClubEvent.event_date.desc())
            .limit(15)
        )
        completed = result.scalars().all()
        if completed:
            lines = ["\n=== RECENT COMPLETED EVENTS ==="]
            for ev in completed:
                date_str = str(ev.event_date) if ev.event_date else "Unknown date"
                entry = [f"- {ev.title or 'Untitled'} [{ev.category or 'event'}] on {date_str}"]
                if ev.description:
                    entry.append(f"  Description: {ev.description}")
                if ev.winners:
                    entry.append(f"  Winners: {ev.winners}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            # Only add events source once
            if not any(s["type"] == "events" for s in sources):
                sources.append({"title": "Club Events", "type": "events", "url": "/events"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch completed events: {e}")

    # ── 5. Past events (separate past_events table) ───────────────────────
    try:
        result = await db.execute(
            sa_select(PastEvent).order_by(PastEvent.sort_order.asc()).limit(20)
        )
        past = result.scalars().all()
        if past:
            lines = ["\n=== PAST EVENTS (ARCHIVE) ==="]
            for pe in past:
                entry = [f"- {pe.title or 'Untitled'} ({pe.date_label or ''})"]
                if pe.description:
                    entry.append(f"  Description: {pe.description}")
                if pe.category:
                    entry.append(f"  Category: {pe.category}")
                if pe.speaker:
                    entry.append(f"  Speaker: {pe.speaker}")
                if pe.participants:
                    entry.append(f"  Participants: {pe.participants}")
                if pe.winners:
                    entry.append(f"  Winners: {pe.winners}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            if not any(s["type"] == "events" for s in sources):
                sources.append({"title": "Club Events", "type": "events", "url": "/events"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch past events: {e}")

    # ── 6. Resources ──────────────────────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubResource).order_by(ClubResource.order_no.asc())
        )
        resources = result.scalars().all()
        if resources:
            lines = ["\n=== LEARNING RESOURCES ==="]
            for r in resources:
                entry = [f"- [{r.resource_type}] {r.title} (Group: {r.group_name})"]
                if r.description:
                    entry.append(f"  {r.description}")
                if r.url:
                    entry.append(f"  URL: {r.url}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            sources.append({"title": "Learning Resources", "type": "resources", "url": "/curriculum"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch resources: {e}")

    # ── 7. Roadmaps ───────────────────────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubRoadmap)
            .order_by(ClubRoadmap.roadmap_type.asc(), ClubRoadmap.order_no.asc())
        )
        roadmaps = result.scalars().all()
        if roadmaps:
            lines = ["\n=== LEARNING ROADMAPS ==="]
            for rm in roadmaps:
                try:
                    topics = json.loads(rm.topics) if isinstance(rm.topics, str) else rm.topics
                    topics_str = ", ".join(topics) if isinstance(topics, list) else str(topics)
                except Exception:
                    topics_str = rm.topics or ""
                lines.append(
                    f"- [{rm.roadmap_type}] Phase {rm.phase}: {rm.title} ({rm.duration}) — Topics: {topics_str}"
                )
            context_parts.append("\n".join(lines))
            sources.append({"title": "Club Roadmaps", "type": "roadmaps", "url": "/roadmaps/ml"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch roadmaps: {e}")

    # ── 8. Achievements ───────────────────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubAchievement).order_by(ClubAchievement.created_at.desc()).limit(20)
        )
        achievements = result.scalars().all()
        if achievements:
            lines = ["\n=== CLUB ACHIEVEMENTS ==="]
            for a in achievements:
                entry = [f"- {a.title or 'Achievement'} (Student: {a.student or 'Unknown'}, Category: {a.category or 'General'})"]
                if a.description:
                    entry.append(f"  {a.description}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            sources.append({"title": "Club Achievements", "type": "achievements", "url": "/achievements"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch achievements: {e}")

    # ── 9. News / Blog posts ──────────────────────────────────────────────
    try:
        result = await db.execute(
            sa_select(ClubNews).order_by(ClubNews.created_at.desc()).limit(10)
        )
        news_items = result.scalars().all()
        if news_items:
            lines = ["\n=== CLUB NEWS & BLOG POSTS ==="]
            for n in news_items:
                entry = [f"- {n.title or 'News item'}"]
                if n.description:
                    entry.append(f"  {n.description}")
                if n.link:
                    entry.append(f"  Read more: {n.link}")
                if n.sources:
                    entry.append(f"  Source: {n.sources}")
                lines.append("\n".join(entry))
            context_parts.append("\n".join(lines))
            sources.append({"title": "Club News", "type": "news", "url": "/news"})
    except Exception as e:
        logging.warning(f"Chatbot: could not fetch news: {e}")

    return "\n".join(context_parts), sources


# ---------------------------------------------------------------------------
# GREETING SHORT-CIRCUIT — deterministic responses, no LLM call needed (§32)
# ---------------------------------------------------------------------------
_GREETING_TOKENS = {
    "hi", "hello", "hey", "hii", "hiii", "heyy", "heya", "howdy", "sup",
    "hi there", "hello there", "hey there", "good morning", "good afternoon",
    "good evening", "good night", "greetings",
    "thanks", "thank you", "thank u", "thx", "ty", "tysm", "many thanks",
    "thanks a lot", "thank you so much", "cheers",
    "okay", "ok", "cool", "got it", "sure", "alright", "noted",
    "bye", "goodbye", "see you", "see ya", "cya",
    "what can you do", "what can you help with", "what do you do",
    "who are you", "what are you", "tell me about yourself",
    "help", "help me",
}

_GREETING_REPLY = (
    "Hi! \U0001f916 I'm **NeuralNode**, the AI Club DAU website assistant.\n\n"
    "I can help you with:\n"
    "- \U0001f5d3 **Events** — upcoming workshops, hackathons, Build Nights\n"
    "- \U0001f465 **Members** — who's in the club\n"
    "- \U0001f680 **Projects** — what the club is building\n"
    "- \U0001f4da **Resources & Roadmaps** — learning paths and materials\n"
    "- \U0001f3c6 **Achievements** — club wins and recognition\n"
    "- \U0001f517 **Navigation** — take you anywhere on the site\n\n"
    "What would you like to know?"
)

_FAQ_CACHE = {
    "what is ai club": "AI Club DAU is a community of students passionate about Artificial Intelligence. We host workshops, build nights, and competitions!",
    "what does ai club do": "We organize events like hackathons and workshops, work on AI projects, and provide roadmaps to help you learn AI!",
    "how to join": "You can join AI Club DAU by attending our events and registering on this website! Keep an eye on our Events page.",
    "how can i join": "You can join AI Club DAU by attending our events and registering on this website! Keep an eye on our Events page.",
    "who built this website": "This website was built by Meet Virugama (Extended Core Member).",
    "who built the website": "This website was built by Meet Virugama (Extended Core Member).",
}

def _get_faq_reply(msg: str) -> str | None:
    normalized = msg.lower().strip().rstrip("!.,?")
    return _FAQ_CACHE.get(normalized)

import random as _random

def _get_greeting_reply(msg: str) -> str | None:
    """
    Returns a deterministic reply for simple greetings/thanks/byes,
    or None if this is not a greeting and should be sent to the LLM.
    """
    normalized = msg.lower().strip().rstrip("!.,?")
    if normalized not in _GREETING_TOKENS:
        return None
    if any(w in normalized for w in ("bye", "goodbye", "see you", "see ya", "cya")):
        return _random.choice([
            "Goodbye! \U0001f44b Hope to see you at an AI Club event soon!",
            "See you! Feel free to come back if you have more questions about AI Club DAU.",
        ])
    if any(w in normalized for w in ("thanks", "thank", "thx", "ty", "cheers")):
        return _random.choice([
            "You're welcome! \U0001f60a Let me know if there's anything else I can help with.",
            "Happy to help! Feel free to ask anything else about AI Club DAU.",
            "Anytime! Is there anything else you'd like to know?",
        ])
    return _GREETING_REPLY


# ---------------------------------------------------------------------------
# TOPIC-AWARE CONTEXT SELECTOR (§27) — only include relevant DB sections
# ---------------------------------------------------------------------------
_TOPIC_KEYWORDS: dict[str, set[str]] = {
    "members":      {"member", "team", "who", "person", "people", "staff", "lead", "president", "coordinator"},
    "projects":     {"project", "build", "repo", "github", "work", "app", "tool", "make"},
    "events":       {"event", "workshop", "hackathon", "build night", "competition", "when", "date",
                     "upcoming", "next", "schedule", "night"},
    "weekly_veneza":{"veneza", "weekly", "weekly veneza"},
    "resources":    {"resource", "learn", "tutorial", "video", "article", "material", "curriculum", "study"},
    "roadmaps":     {"roadmap", "path", "track", "ml", "deep learning", "nlp", "genai", "llm",
                     "transformer", "agentic", "reinforcement"},
    "achievements": {"achievement", "win", "award", "prize", "winner", "recognition"},
    "news":         {"news", "blog", "announcement", "post", "article", "update"},
    "about":        {"about", "what is", "join", "how to", "discord", "instagram", "social", "club", "dau"},
}

def _select_relevant_topics(user_message: str) -> set[str]:
    """
    Returns the set of DB topic sections relevant to the user's query.
    If the query is broad or unclear, returns all topics (safe fallback).
    """
    msg_lower = user_message.lower()
    matched: set[str] = {"about"}  # always include static club info
    for topic, keywords in _TOPIC_KEYWORDS.items():
        if any(kw in msg_lower for kw in keywords):
            matched.add(topic)
            
    # If no specific DB topics were matched, ONLY return "about".
    # Do not fallback to pulling the entire DB. Let RAG handle specifics.
    return matched


async def build_chatbot_context_filtered(db, user_message: str) -> tuple[str, list[dict]]:
    """
    Topic-aware context builder (§27 context minimization).
    Only fetches and includes DB sections relevant to the user's query.
    Falls back to full context if the query is broad.
    """
    from sqlalchemy.future import select as sa_select
    topics = _select_relevant_topics(user_message)

    context_parts: list[str] = [CLUB_STATIC_INFO]
    sources: list[dict] = []

    if "members" in topics:
        try:
            result = await db.execute(sa_select(ClubMember).order_by(ClubMember.order_no.asc()))
            members = result.scalars().all()
            if members:
                lines = ["\n=== CLUB MEMBERS ==="]
                for m in members:
                    parts = [f"- {m.name or 'Unknown'} ({m.role or 'Member'})"]
                    if m.description:
                        parts.append(f"  Bio: {m.description}")
                    if m.github:
                        parts.append(f"  GitHub: {m.github}")
                    if m.linkedin:
                        parts.append(f"  LinkedIn: {m.linkedin}")
                    lines.append("\n".join(parts))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Club Members", "type": "members", "url": "/team"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch members: {e}")

    if "projects" in topics:
        try:
            result = await db.execute(sa_select(ClubProject).order_by(ClubProject.created_at.desc()))
            projects = result.scalars().all()
            if projects:
                lines = ["\n=== CLUB PROJECTS ==="]
                for p in projects:
                    entry = [f"- {p.title or 'Untitled'} (by {p.author or 'Unknown'})"]
                    if p.description:
                        entry.append(f"  Description: {p.description}")
                    if p.tags:
                        try:
                            tag_list = json.loads(p.tags) if isinstance(p.tags, str) else p.tags
                            entry.append(f"  Tags: {', '.join(tag_list)}")
                        except Exception:
                            entry.append(f"  Tags: {p.tags}")
                    if p.contributors:
                        entry.append(f"  Contributors: {p.contributors}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Club Projects", "type": "projects", "url": "/projects"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch projects: {e}")

    if "events" in topics:
        try:
            r1 = await db.execute(
                sa_select(ClubEvent)
                .where(ClubEvent.status.in_(["upcoming", "registration_open", "registration_closed"]))
                .order_by(ClubEvent.event_date.asc()).limit(5)
            )
            upcoming = r1.scalars().all()
            if upcoming:
                lines = ["\n=== UPCOMING / ACTIVE EVENTS ==="]
                for ev in upcoming:
                    date_str = str(ev.event_date) if ev.event_date else "TBD"
                    entry = [f"- {ev.title or 'Untitled'} [{ev.category or 'event'}] on {date_str} (Status: {ev.status})"]
                    if ev.description:
                        entry.append(f"  Description: {ev.description}")
                    if ev.venue:
                        entry.append(f"  Venue: {ev.venue}")
                    if ev.registration_link:
                        entry.append(f"  Register: {ev.registration_link}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Upcoming Events", "type": "events", "url": "/events"})

            r2 = await db.execute(
                sa_select(ClubEvent).where(ClubEvent.status == "completed")
                .order_by(ClubEvent.event_date.desc()).limit(3)
            )
            completed = r2.scalars().all()
            if completed:
                lines = ["\n=== RECENT COMPLETED EVENTS ==="]
                for ev in completed:
                    date_str = str(ev.event_date) if ev.event_date else "Unknown date"
                    entry = [f"- {ev.title or 'Untitled'} [{ev.category or 'event'}] on {date_str}"]
                    if ev.description:
                        entry.append(f"  Description: {ev.description}")
                    if ev.winners:
                        entry.append(f"  Winners: {ev.winners}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))

            r3 = await db.execute(sa_select(PastEvent).order_by(PastEvent.sort_order.asc()).limit(5))
            past_evs = r3.scalars().all()
            if past_evs:
                lines = ["\n=== PAST EVENTS (ARCHIVE) ==="]
                for pe in past_evs:
                    entry = [f"- {pe.title or 'Untitled'} ({pe.date_label or ''})"]
                    if pe.description:
                        entry.append(f"  Description: {pe.description}")
                    if pe.speaker:
                        entry.append(f"  Speaker: {pe.speaker}")
                    if pe.winners:
                        entry.append(f"  Winners: {pe.winners}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))

            if not any(s["type"] == "events" for s in sources):
                sources.append({"title": "Club Events", "type": "events", "url": "/events"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch events: {e}")

    if "weekly_veneza" in topics:
        try:
            from sqlalchemy.orm import selectinload
            result = await db.execute(
                sa_select(WeeklyVenezaWeek)
                .options(selectinload(WeeklyVenezaWeek.resources))
                .order_by(WeeklyVenezaWeek.week_number.desc()).limit(3)
            )
            weeks = result.scalars().all()
            if weeks:
                lines = ["\n=== WEEKLY VENEZA ==="]
                for w in weeks:
                    entry = [f"- Week {w.week_number}: {w.title} (Status: {w.status})"]
                    if w.description:
                        entry.append(f"  Description: {w.description}")
                    if w.resources:
                        entry.append("  Topics/Resources:")
                        for r in w.resources:
                            entry.append(f"    * {r.title} ({r.resource_type})")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Weekly Veneza", "type": "weekly_veneza", "url": "/weekly-veneza"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch weekly veneza: {e}")

    if "resources" in topics:
        try:
            result = await db.execute(sa_select(ClubResource).order_by(ClubResource.order_no.asc()))
            resources = result.scalars().all()
            if resources:
                lines = ["\n=== LEARNING RESOURCES ==="]
                for r in resources:
                    entry = [f"- [{r.resource_type}] {r.title} (Group: {r.group_name})"]
                    if r.description:
                        entry.append(f"  {r.description}")
                    if r.url:
                        entry.append(f"  URL: {r.url}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Learning Resources", "type": "resources", "url": "/curriculum"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch resources: {e}")

    if "roadmaps" in topics:
        try:
            result = await db.execute(
                sa_select(ClubRoadmap).order_by(ClubRoadmap.roadmap_type.asc(), ClubRoadmap.order_no.asc())
            )
            roadmaps = result.scalars().all()
            if roadmaps:
                lines = ["\n=== LEARNING ROADMAPS ==="]
                for rm in roadmaps:
                    try:
                        topics_data = json.loads(rm.topics) if isinstance(rm.topics, str) else rm.topics
                        topics_str = ", ".join(topics_data) if isinstance(topics_data, list) else str(topics_data)
                    except Exception:
                        topics_str = rm.topics or ""
                    lines.append(
                        f"- [{rm.roadmap_type}] Phase {rm.phase}: {rm.title} ({rm.duration}) — Topics: {topics_str}"
                    )
                context_parts.append("\n".join(lines))
                sources.append({"title": "Club Roadmaps", "type": "roadmaps", "url": "/roadmaps/ml"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch roadmaps: {e}")

    if "achievements" in topics:
        try:
            result = await db.execute(
                sa_select(ClubAchievement).order_by(ClubAchievement.created_at.desc()).limit(5)
            )
            achievements = result.scalars().all()
            if achievements:
                lines = ["\n=== CLUB ACHIEVEMENTS ==="]
                for a in achievements:
                    entry = [f"- {a.title or 'Achievement'} (Student: {a.student or 'Unknown'}, Category: {a.category or 'General'})"]
                    if a.description:
                        entry.append(f"  {a.description}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Club Achievements", "type": "achievements", "url": "/achievements"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch achievements: {e}")

    if "news" in topics:
        try:
            result = await db.execute(sa_select(ClubNews).order_by(ClubNews.created_at.desc()).limit(3))
            news_items = result.scalars().all()
            if news_items:
                lines = ["\n=== CLUB NEWS & BLOG POSTS ==="]
                for n in news_items:
                    entry = [f"- {n.title or 'News item'}"]
                    if n.description:
                        entry.append(f"  {n.description}")
                    if n.link:
                        entry.append(f"  Read more: {n.link}")
                    lines.append("\n".join(entry))
                context_parts.append("\n".join(lines))
                sources.append({"title": "Club News", "type": "news", "url": "/news"})
        except Exception as e:
            logging.warning(f"Chatbot: could not fetch news: {e}")

    return "\n".join(context_parts), sources


# Maps destination keys (returned by the LLM) to actual application routes.
# The LLM NEVER controls URLs directly — it only emits a key from this list.
# Backend validates the key and checks admin permission before including
# navigation_action in the response. Frontend does a second independent check.
# ---------------------------------------------------------------------------
NAVIGATION_ALLOWLIST: dict[str, dict] = {
    "home":             {"path": "/",                   "label": "Home",               "auth": False, "admin": False},
    "events":           {"path": "/events",              "label": "Events",             "auth": False, "admin": False},
    "projects":         {"path": "/projects",            "label": "Projects",           "auth": False, "admin": False},
    "team":             {"path": "/team",                "label": "Team",               "auth": False, "admin": False},
    "achievements":     {"path": "/achievements",        "label": "Achievements",       "auth": False, "admin": False},
    "news":             {"path": "/news",                "label": "News",               "auth": False, "admin": False},
    "curriculum":       {"path": "/curriculum",          "label": "Curriculum",         "auth": False, "admin": False},
    "weekly-veneza":    {"path": "/weekly-veneza",       "label": "Weekly Veneza",      "auth": False, "admin": False},
    "roadmap-ml":       {"path": "/roadmaps/ml",         "label": "ML Roadmap",         "auth": False, "admin": False},
    "roadmap-dl":       {"path": "/roadmaps/dl",         "label": "Deep Learning Roadmap", "auth": False, "admin": False},
    "roadmap-rl":       {"path": "/roadmaps/rl",         "label": "Reinforcement Learning Roadmap", "auth": False, "admin": False},
    "roadmap-nlp":      {"path": "/roadmaps/nlp",        "label": "NLP Roadmap",        "auth": False, "admin": False},
    "roadmap-transformers": {"path": "/roadmaps/transformers", "label": "Transformers Roadmap", "auth": False, "admin": False},
    "roadmap-genai":    {"path": "/roadmaps/genai",      "label": "GenAI Roadmap",      "auth": False, "admin": False},
    "roadmap-llm":      {"path": "/roadmaps/llm",        "label": "LLM Roadmap",        "auth": False, "admin": False},
    "roadmap-agentic":  {"path": "/roadmaps/agentic-ai", "label": "Agentic AI Roadmap", "auth": False, "admin": False},
    "my-registrations": {"path": "/my-registrations",   "label": "My Registrations",  "auth": True,  "admin": False},
    "admin":            {"path": "/admin",               "label": "Admin Dashboard",   "auth": True,  "admin": True},
}


def _get_navigation_reply(msg: str, current_user) -> dict | None:
    """
    Checks if the user message is a simple navigation intent.
    If so, returns a dict with 'reply' and 'navigation_action', avoiding the LLM.
    """
    msg_lower = msg.lower().strip().rstrip("!.,?")
    
    prefixes = ["take me to ", "go to ", "open ", "show me ", "show ", "navigate to ", "i want to go to ", "i want to go ", "can i go to "]
    target = msg_lower
    
    for prefix in prefixes:
        if msg_lower.startswith(prefix):
            target = msg_lower[len(prefix):].strip()
            break
        elif msg_lower == prefix.strip():
            target = msg_lower
            break
            
    if not target:
        return None
        
    synonyms = {
        "events page": "events",
        "projects page": "projects",
        "team page": "team",
        "members": "team",
        "admin": "admin",
        "my registrations": "my-registrations",
        "registrations": "my-registrations",
        "ml roadmap": "roadmap-ml",
        "dl roadmap": "roadmap-dl",
        "nlp roadmap": "roadmap-nlp",
        "genai roadmap": "roadmap-genai",
        "llm roadmap": "roadmap-llm",
        "agentic roadmap": "roadmap-agentic",
        "weekly veneza": "weekly-veneza",
    }
    
    dest_key = None
    if target in NAVIGATION_ALLOWLIST:
        dest_key = target
    elif target in synonyms:
        dest_key = synonyms[target]
    else:
        for key, info in NAVIGATION_ALLOWLIST.items():
            if target == info["label"].lower():
                dest_key = key
                break
                
    if dest_key:
        route_info = NAVIGATION_ALLOWLIST[dest_key]
        if route_info["admin"] and (not current_user or not current_user.is_admin):
            return {
                "reply": "You don't have permission to access the Admin Dashboard. That area requires admin privileges.",
                "navigation_action": None
            }
        elif route_info["auth"] and not current_user:
            return {
                "reply": f"You need to be logged in to access {route_info['label']}. Please sign in first.",
                "navigation_action": None
            }
        else:
            return {
                "reply": f"Taking you to the {route_info['label']} page!",
                "navigation_action": {
                    "destination": dest_key,
                    "path": route_info["path"],
                    "label": route_info["label"],
                }
            }
    return None


# ── AI Chatbot ─────────────────────────────────────────────────────────────

