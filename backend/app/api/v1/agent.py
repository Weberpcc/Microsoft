from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.models.audit import SEOAudit
from app.models.keyword import Keyword
from app.models.optimization import OptimizationEvent
from app.models.competitor import Competitor
from app.schemas.memory import MemoryLabComparisonResponse
from app.services.agent_service import agent_service

router = APIRouter()

@router.post("/memory-lab-comparison", response_model=MemoryLabComparisonResponse)
async def run_memory_lab_showcase(
    website_id: str,
    user_query: str = "Recommend an SEO optimization strategy for my landing page",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Hackathon Showcase API: Compares Scenario A (Without Memory) vs Scenario B (With Hindsight Memory).
    """
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    # Gather current site audit
    audit_stmt = select(SEOAudit).where(SEOAudit.website_id == website.id).order_by(SEOAudit.created_at.desc()).limit(1)
    audit_res = (await db.execute(audit_stmt)).scalars().first()
    audit_context = audit_res.audit_data if audit_res else {"health_score": 75, "issues": []}

    # Gather keywords
    kw_stmt = select(Keyword).where(Keyword.website_id == website.id).limit(10)
    keywords = (await db.execute(kw_stmt)).scalars().all()
    kw_context = [{"keyword": k.keyword, "position": k.current_position, "volume": k.search_volume} for k in keywords]

    # Gather optimizations
    opt_stmt = select(OptimizationEvent).where(OptimizationEvent.website_id == website.id).order_by(OptimizationEvent.created_at.desc()).limit(5)
    opts = (await db.execute(opt_stmt)).scalars().all()
    opt_context = [{"page_url": o.page_url, "action": o.action_taken} for o in opts]

    # Gather competitors
    comp_stmt = select(Competitor).where(Competitor.website_id == website.id).limit(5)
    comps = (await db.execute(comp_stmt)).scalars().all()
    comp_context = [{"name": c.name, "domain": c.domain_url} for c in comps]

    comparison_res = await agent_service.run_memory_lab_comparison(
        website_domain=website.domain,
        website_id=website.id,
        user_query=user_query,
        audit_context=audit_context,
        keywords_context=kw_context,
        optimizations_context=opt_context,
        competitors_context=comp_context
    )

    return comparison_res
