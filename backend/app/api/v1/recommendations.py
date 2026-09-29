from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.models.audit import SEOAudit
from app.models.keyword import Keyword
from app.models.optimization import OptimizationEvent
from app.models.competitor import Competitor
from app.models.recommendation import AIRecommendation, RecommendationFeedback
from app.schemas.recommendation import RecommendationRequest, AIRecommendationOut, FeedbackCreate, FeedbackOut
from app.services.agent_service import agent_service
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.post("/generate", response_model=AIRecommendationOut, status_code=status.HTTP_201_CREATED)
async def generate_seo_recommendation(
    rec_req: RecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == rec_req.website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    # Fetch latest audit context
    audit_stmt = select(SEOAudit).where(SEOAudit.website_id == website.id).order_by(SEOAudit.created_at.desc()).limit(1)
    audit_res = (await db.execute(audit_stmt)).scalars().first()
    audit_context = audit_res.audit_data if audit_res else {}

    # Fetch keywords context
    kw_stmt = select(Keyword).where(Keyword.website_id == website.id).limit(10)
    keywords = (await db.execute(kw_stmt)).scalars().all()
    kw_context = [{"keyword": k.keyword, "position": k.current_position, "volume": k.search_volume} for k in keywords]

    # Fetch optimizations context
    opt_stmt = select(OptimizationEvent).where(OptimizationEvent.website_id == website.id).order_by(OptimizationEvent.created_at.desc()).limit(5)
    opts = (await db.execute(opt_stmt)).scalars().all()
    opt_context = [{"page_url": o.page_url, "action": o.action_taken} for o in opts]

    # Run agent service
    agent_res = await agent_service.generate_recommendation(
        website_domain=website.domain,
        website_id=website.id,
        user_query=rec_req.user_query,
        audit_context=audit_context,
        keywords_context=kw_context,
        optimizations_context=opt_context,
        use_hindsight_memory=rec_req.use_hindsight_memory
    )

    rec = AIRecommendation(
        website_id=website.id,
        title=agent_res.get("title", "SEO Optimization Action"),
        description=agent_res.get("description", ""),
        priority=agent_res.get("priority", "medium"),
        affected_page=agent_res.get("affected_page"),
        related_keyword=agent_res.get("related_keyword"),
        reasoning=agent_res.get("reasoning", ""),
        implementation_steps=agent_res.get("implementation_steps", []),
        memory_ids=agent_res.get("retrieved_memories", [])
    )
    db.add(rec)
    await db.commit()

    reload_stmt = (
        select(AIRecommendation)
        .where(AIRecommendation.id == rec.id)
        .options(selectinload(AIRecommendation.feedback))
    )
    return (await db.execute(reload_stmt)).scalars().first()

@router.get("/website/{website_id}", response_model=List[AIRecommendationOut])
async def list_website_recommendations(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    rec_stmt = (
        select(AIRecommendation)
        .where(AIRecommendation.website_id == website_id)
        .options(selectinload(AIRecommendation.feedback))
        .order_by(AIRecommendation.created_at.desc())
    )
    recs = (await db.execute(rec_stmt)).scalars().all()
    return recs

@router.post("/feedback", response_model=FeedbackOut)
async def submit_recommendation_feedback(
    fb_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rec_stmt = select(AIRecommendation).where(AIRecommendation.id == fb_in.recommendation_id)
    rec = (await db.execute(rec_stmt)).scalars().first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    w_stmt = select(Website).where(Website.id == rec.website_id, Website.user_id == current_user.id)
    website = (await db.execute(w_stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=403, detail="Unauthorized")

    fb = RecommendationFeedback(
        recommendation_id=rec.id,
        rating=fb_in.rating,
        feedback_text=fb_in.feedback_text
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    # Retain user rating/feedback into Hindsight persistent memory to close learning loop
    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    fb_content = f"User feedback for recommendation '{rec.title}': Rating {fb_in.rating}/5. User comments: '{fb_in.feedback_text or 'None'}'."
    await hindsight_service.retain(
        bank_id=bank_id,
        content=fb_content,
        event_type="user_feedback",
        entity_name=rec.title,
        metadata={"recommendation_id": rec.id, "rating": fb_in.rating}
    )

    return fb
