from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.models.audit import SEOAudit
from app.models.keyword import Keyword
from app.models.optimization import OptimizationEvent
from app.models.recommendation import AIRecommendation
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Managed websites count
    w_count = (await db.execute(select(func.count(Website.id)).where(Website.user_id == current_user.id))).scalar() or 0

    # User's website IDs
    w_ids_res = await db.execute(select(Website.id).where(Website.user_id == current_user.id))
    user_w_ids = w_ids_res.scalars().all()

    if not user_w_ids:
        return {
            "total_websites": 0,
            "latest_health_score": 0,
            "total_issues": 0,
            "critical_issues": 0,
            "tracked_keywords": 0,
            "total_optimizations": 0,
            "total_recommendations": 0,
            "hindsight_online": await hindsight_service.check_health()
        }

    # Latest audit across websites
    audit_stmt = select(SEOAudit).where(SEOAudit.website_id.in_(user_w_ids)).order_by(SEOAudit.created_at.desc()).limit(1)
    latest_audit = (await db.execute(audit_stmt)).scalars().first()

    # Total keywords
    kw_count = (await db.execute(select(func.count(Keyword.id)).where(Keyword.website_id.in_(user_w_ids)))).scalar() or 0

    # Total optimizations
    opt_count = (await db.execute(select(func.count(OptimizationEvent.id)).where(OptimizationEvent.website_id.in_(user_w_ids)))).scalar() or 0

    # Total recommendations
    rec_count = (await db.execute(select(func.count(AIRecommendation.id)).where(AIRecommendation.website_id.in_(user_w_ids)))).scalar() or 0

    h_online = await hindsight_service.check_health()

    return {
        "total_websites": w_count,
        "latest_health_score": latest_audit.health_score if latest_audit else 0,
        "total_issues": latest_audit.total_issues if latest_audit else 0,
        "critical_issues": latest_audit.critical_count if latest_audit else 0,
        "tracked_keywords": kw_count,
        "total_optimizations": opt_count,
        "total_recommendations": rec_count,
        "hindsight_online": h_online
    }
