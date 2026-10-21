"""
events/winners_service.py
-------------------------
Service layer for the AI Club Event Winners & Championship Showcase.

Provides data-driven access to past and completed event winners,
normalizing structured JSON or unstructured legacy text entries into
consistent, validated EventWinner models conforming to task.md.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from events.models import ClubEvent
from past_events.models import PastEvent

logger = logging.getLogger(__name__)






def normalize_unicode_text(text: str) -> str:
    """Normalize mathematical alphanumeric characters (e.g., 𝟏𝐬𝐭 -> 1st)."""
    if not text:
        return ""
    return unicodedata.normalize("NFKD", text).strip()


def parse_raw_winner_string(raw: str, event_id: str) -> List[Dict[str, Any]]:
    """
    Parses arbitrary winner text strings into structured EventWinner dictionaries.
    Handles JSON arrays, emoji badges (🥇, 🥈, 🥉), ordinals (1st, 2nd, 3rd),
    and project annotations in parentheses.
    """
    if not raw or not raw.strip():
        return []

    cleaned = raw.strip()

    # Case 1: Already JSON array
    if cleaned.startswith("[") and cleaned.endswith("]"):
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                result = []
                for idx, item in enumerate(parsed):
                    if isinstance(item, dict):
                        result.append({
                            "id": str(item.get("id") or f"{event_id}-w{idx + 1}"),
                            "eventId": event_id,
                            "name": str(item.get("name") or "Participant"),
                            "placement": int(item.get("placement") or (idx + 1)),
                            "category": item.get("category"),
                            "score": float(item["score"]) if item.get("score") is not None else None,
                            "imageUrl": item.get("imageUrl") or item.get("image_url"),
                            "members": item.get("members"),
                            "projectTitle": item.get("projectTitle") or item.get("project_title"),
                            "projectDescription": item.get("projectDescription") or item.get("project_description"),
                            "award": item.get("award"),
                        })
                if result:
                    return result
        except Exception as e:
            logger.debug("Failed parsing winner string as JSON: %s", e)

    # Case 2: Line-by-line text parsing
    normalized = normalize_unicode_text(cleaned)
    lines = [line.strip() for line in normalized.split("\n") if line.strip()]
    parsed_winners: List[Dict[str, Any]] = []

    for idx, line in enumerate(lines):
        placement = idx + 1
        award = None
        project_title = None

        # Check for placement indicators
        if "1st" in line or "🥇" in line:
            placement = 1
            award = "1st Place Winner"
        elif "2nd" in line or "🥈" in line:
            placement = 2
            award = "2nd Place Runner-Up"
        elif "3rd" in line or "🥉" in line:
            placement = 3
            award = "3rd Place"
        elif "4th" in line:
            placement = 4
            award = "Finalist (4th Place)"
        elif "5th" in line:
            placement = 5
            award = "Finalist (5th Place)"

        # Strip emojis and leading labels
        text = re.sub(r"^[🥇🥈🥉🏅🏆\s]+", "", line)
        text = re.sub(r"^\d+(st|nd|rd|th)?\s*(place)?\s*[:\-–—]\s*", "", text, flags=re.IGNORECASE)

        # Extract cash prize if present (e.g. "Dirgh Patel – ₹500")
        prize_match = re.search(r"[–—\-]\s*(₹\s*\d+[\d,]*)", text)
        if prize_match:
            prize_str = prize_match.group(1).replace(" ", "")
            award = f"{award or f'Place #{placement}'} · Prize: {prize_str}"
            text = text[:prize_match.start()].strip()

        # Extract project in parentheses if present (e.g. "Cheetah Sprinter (DAU Pulse)")
        proj_match = re.search(r"\(([^)]+)\)", text)
        if proj_match:
            project_title = proj_match.group(1).strip()
            text = text[:proj_match.start()].strip()

        name = text.strip() or f"Finalist #{placement}"

        parsed_winners.append({
            "id": f"{event_id}-w{idx + 1}",
            "eventId": event_id,
            "name": name,
            "placement": placement,
            "category": "Official Placement",
            "score": None,
            "imageUrl": None,
            "members": None,
            "projectTitle": project_title,
            "projectDescription": None,
            "award": award or f"Place #{placement}",
        })

    return parsed_winners


async def get_winners_showcase(
    db: AsyncSession,
    event_id: Optional[str] = None,
    year: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieves, normalizes, and aggregates official event winners.
    Parses real records from `club_events` and `past_events` without dummy data.
    """
    events_map: Dict[str, Dict[str, Any]] = {}

    # 1. Fetch club_events that have winners
    try:
        club_stmt = select(ClubEvent).where(
            ClubEvent.winners.isnot(None) & (ClubEvent.winners != "")
        ).order_by(ClubEvent.event_date.desc().nullslast(), ClubEvent.id.desc())
        club_res = await db.execute(club_stmt)
        club_events = club_res.scalars().all()

        for ev in club_events:
            ev_key = f"club-{ev.id}"
            ev_year = str(ev.event_date.year) if ev.event_date else "2026"
            winners_list = parse_raw_winner_string(ev.winners or "", ev_key)

            if winners_list:
                events_map[ev_key] = {
                    "id": ev_key,
                    "title": ev.title or "AI Club Event",
                    "edition": ev_year,
                    "date": ev.event_date.strftime("%B %d, %Y") if ev.event_date else "2026",
                    "status": "completed",
                    "category": (ev.category or "Event").capitalize(),
                    "description": ev.description,
                    "banner": ev.banner,
                    "winner_link": ev.winner_link,
                    "registration_link": ev.registration_link,
                    "featured": False,
                    "winners": winners_list,
                }
    except Exception as exc:
        logger.exception("Error loading club_events for winners showcase: %s", exc)

    # 2. Fetch past_events that have winners
    try:
        past_stmt = select(PastEvent).where(
            PastEvent.winners.isnot(None) & (PastEvent.winners != "")
        ).order_by(PastEvent.sort_order.asc(), PastEvent.id.desc())
        past_res = await db.execute(past_stmt)
        past_events = past_res.scalars().all()

        for pe in past_events:
            pe_key = f"past-{pe.id}"
            year_match = re.search(r"\b(20\d\d)\b", pe.date_label or "")
            pe_year = year_match.group(1) if year_match else "2026"
            winners_list = parse_raw_winner_string(pe.winners or "", pe_key)

            if winners_list:
                events_map[pe_key] = {
                    "id": pe_key,
                    "title": pe.title or "Past Competition",
                    "edition": pe_year,
                    "date": pe.date_label or pe_year,
                    "status": "completed",
                    "category": (pe.category or "Competition").capitalize(),
                    "description": pe.description,
                    "banner": pe.image_url,
                    "winner_link": pe.winner_link,
                    "registration_link": None,
                    "featured": False,
                    "winners": winners_list,
                }
    except Exception as exc:
        logger.exception("Error loading past_events for winners showcase: %s", exc)

    results = list(events_map.values())

    # Sort: edition descending, then event id descending
    results.sort(
        key=lambda ev: (
            ev.get("edition", "2026"),
            ev.get("id", ""),
        ),
        reverse=True,
    )

    # Mark the latest event as featured
    if results:
        results[0]["featured"] = True

    # Apply filters
    if event_id:
        results = [ev for ev in results if ev["id"].lower() == event_id.lower() or ev["id"].endswith(f"-{event_id}")]

    if year:
        results = [ev for ev in results if ev["edition"] == str(year)]

    if category:
        cat_lower = category.lower()
        results = [ev for ev in results if (ev.get("category") or "").lower() == cat_lower]

    return results

