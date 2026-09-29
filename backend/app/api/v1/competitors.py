from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.models.competitor import Competitor, CompetitorObservation
from app.schemas.competitor import CompetitorCreate, CompetitorOut, CompetitorObservationOut
from app.services.crawler_service import crawler_service
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.post("", response_model=CompetitorOut, status_code=status.HTTP_201_CREATED)
async def create_competitor(
    comp_in: CompetitorCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == comp_in.website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    competitor = Competitor(
        website_id=comp_in.website_id,
        name=comp_in.name,
        domain_url=comp_in.domain_url.strip(),
        notes=comp_in.notes
    )
    db.add(competitor)
    await db.commit()

    reload_stmt = (
        select(Competitor)
        .where(Competitor.id == competitor.id)
        .options(selectinload(Competitor.observations))
    )
    return (await db.execute(reload_stmt)).scalars().first()

@router.get("/website/{website_id}", response_model=List[CompetitorOut])
async def list_website_competitors(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    comp_stmt = (
        select(Competitor)
        .where(Competitor.website_id == website_id)
        .options(selectinload(Competitor.observations))
        .order_by(Competitor.created_at.desc())
    )
    competitors = (await db.execute(comp_stmt)).scalars().all()
    return competitors

@router.post("/{competitor_id}/observe", response_model=CompetitorObservationOut)
async def observe_competitor_page(
    competitor_id: str,
    page_url: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    comp_stmt = select(Competitor).where(Competitor.id == competitor_id)
    competitor = (await db.execute(comp_stmt)).scalars().first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    w_stmt = select(Website).where(Website.id == competitor.website_id, Website.user_id == current_user.id)
    website = (await db.execute(w_stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=403, detail="Unauthorized")

    page_data = await crawler_service.fetch_page(page_url)
    
    obs = CompetitorObservation(
        competitor_id=competitor.id,
        page_url=page_url,
        title=page_data.get("title"),
        h1=page_data.get("primary_h1"),
        meta_description=page_data.get("meta_description"),
        heading_structure={
            "h1_count": page_data.get("h1_count", 0),
            "h2_count": page_data.get("h2_count", 0),
            "word_count": page_data.get("word_count", 0)
        },
        observed_changes=f"Observed competitor title: '{page_data.get('title')}' and H1: '{page_data.get('primary_h1')}'"
    )
    db.add(obs)
    await db.commit()
    await db.refresh(obs)

    # Retain competitor observation into Hindsight memory bank
    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    comp_content = f"Competitor observation for {competitor.name} ({page_url}): Title is '{page_data.get('title')}', H1 is '{page_data.get('primary_h1')}'."
    await hindsight_service.retain(
        bank_id=bank_id,
        content=comp_content,
        event_type="competitor_change",
        entity_name=competitor.name,
        metadata={"competitor_id": competitor.id, "page_url": page_url}
    )

    return obs
