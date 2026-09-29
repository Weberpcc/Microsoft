from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.models.optimization import OptimizationEvent, OptimizationOutcome
from app.schemas.optimization import OptimizationCreate, OptimizationEventOut, OutcomeCreate, OptimizationOutcomeOut
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.post("", response_model=OptimizationEventOut, status_code=status.HTTP_201_CREATED)
async def record_optimization(
    opt_in: OptimizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == opt_in.website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    # Retain event in Hindsight persistent memory
    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    mem_content = (
        f"SEO Optimization performed on page {opt_in.page_url}. "
        f"Action: {opt_in.action_taken}. "
        f"Previous State: {opt_in.previous_state or 'N/A'}. "
        f"New State: {opt_in.new_state or 'N/A'}. "
        f"Notes: {opt_in.notes or ''}"
    )

    mem_id = await hindsight_service.retain(
        bank_id=bank_id,
        content=mem_content,
        event_type="optimization_action",
        entity_name=opt_in.page_url,
        metadata={
            "page_url": opt_in.page_url,
            "action_taken": opt_in.action_taken
        }
    )

    opt_event = OptimizationEvent(
        website_id=opt_in.website_id,
        page_url=opt_in.page_url,
        keyword_id=opt_in.keyword_id,
        action_taken=opt_in.action_taken,
        previous_state=opt_in.previous_state,
        new_state=opt_in.new_state,
        notes=opt_in.notes,
        hindsight_memory_id=mem_id
    )
    db.add(opt_event)
    await db.commit()

    # Reload with outcomes eagerly loaded
    reload_stmt = (
        select(OptimizationEvent)
        .where(OptimizationEvent.id == opt_event.id)
        .options(selectinload(OptimizationEvent.outcomes))
    )
    opt_event = (await db.execute(reload_stmt)).scalars().first()
    return opt_event

@router.get("/website/{website_id}", response_model=List[OptimizationEventOut])
async def list_website_optimizations(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    opt_stmt = (
        select(OptimizationEvent)
        .where(OptimizationEvent.website_id == website_id)
        .options(selectinload(OptimizationEvent.outcomes))
        .order_by(OptimizationEvent.created_at.desc())
    )
    opts = (await db.execute(opt_stmt)).scalars().all()
    return opts

@router.post("/outcome", response_model=OptimizationOutcomeOut, status_code=status.HTTP_201_CREATED)
async def record_optimization_outcome(
    outcome_in: OutcomeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(OptimizationEvent).where(OptimizationEvent.id == outcome_in.optimization_id)
    opt_event = (await db.execute(stmt)).scalars().first()
    if not opt_event:
        raise HTTPException(status_code=404, detail="Optimization event not found")

    w_stmt = select(Website).where(Website.id == opt_event.website_id, Website.user_id == current_user.id)
    website = (await db.execute(w_stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=403, detail="Unauthorized")

    outcome = OptimizationOutcome(
        optimization_id=opt_event.id,
        outcome_description=outcome_in.outcome_description,
        impact_score=outcome_in.impact_score
    )
    db.add(outcome)
    await db.commit()
    await db.refresh(outcome)

    # Update Hindsight memory with outcome — learning loop feedback
    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    outcome_content = (
        f"Recorded outcome for optimization '{opt_event.action_taken}' on page {opt_event.page_url}: "
        f"{outcome_in.outcome_description} (Impact score: {outcome_in.impact_score}/10)"
    )
    await hindsight_service.retain(
        bank_id=bank_id,
        content=outcome_content,
        event_type="ranking_outcome",
        entity_name=opt_event.page_url,
        metadata={
            "optimization_id": opt_event.id,
            "impact_score": outcome_in.impact_score
        }
    )

    return outcome
