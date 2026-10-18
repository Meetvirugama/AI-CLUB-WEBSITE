from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import async_session
from events.admin import require_admin
from home_topics.models import HomeTopic
from home_topics.schemas import HomeTopicCreate, HomeTopicResponse, HomeTopicUpdate

router = APIRouter(tags=["Homepage"])


async def get_db():
    async with async_session() as session:
        yield session


@router.get("/api/home-topics", response_model=List[HomeTopicResponse])
async def list_public_topics(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(HomeTopic).where(HomeTopic.is_active.is_(True)).order_by(HomeTopic.order_no, HomeTopic.id)
    )
    return list(result.scalars().all())


@router.get("/api/admin/home-topics", response_model=List[HomeTopicResponse], dependencies=[Depends(require_admin)])
async def list_all_topics(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(HomeTopic).order_by(HomeTopic.order_no, HomeTopic.id))
    return list(result.scalars().all())


@router.post("/api/admin/home-topics", response_model=HomeTopicResponse, dependencies=[Depends(require_admin)])
async def create_topic(data: HomeTopicCreate, session: AsyncSession = Depends(get_db)):
    topic = HomeTopic(**data.model_dump())
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    return topic


@router.put("/api/admin/home-topics/{topic_id}", response_model=HomeTopicResponse, dependencies=[Depends(require_admin)])
async def update_topic(topic_id: int, data: HomeTopicUpdate, session: AsyncSession = Depends(get_db)):
    topic = (await session.execute(select(HomeTopic).where(HomeTopic.id == topic_id))).scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(topic, key, value)
    await session.commit()
    await session.refresh(topic)
    return topic


@router.delete("/api/admin/home-topics/{topic_id}", dependencies=[Depends(require_admin)])
async def delete_topic(topic_id: int, session: AsyncSession = Depends(get_db)):
    topic = (await session.execute(select(HomeTopic).where(HomeTopic.id == topic_id))).scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    await session.delete(topic)
    await session.commit()
    return {"status": "success", "message": "Topic deleted"}
