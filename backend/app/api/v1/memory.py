from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.schemas.memory import MemoryQueryResult, MemoryItem
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.get("/status")
async def get_hindsight_status():
    """Check health and connectivity of Hindsight memory engine."""
    healthy = await hindsight_service.check_health()
    return {
        "hindsight_available": healthy,
        "hindsight_online": healthy,
        "hindsight_url": hindsight_service.base_url,
        "endpoint": hindsight_service.base_url,
        "bank_count": 0,
        "status": "online" if healthy else "offline_fallback"
    }

@router.get("/explorer/{website_id}")
async def query_memory_explorer(
    website_id: str,
    q: str = Query("SEO optimization history audit keywords", description="Memory search query"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Memory Explorer endpoint to inspect stored Hindsight memories for a website."""
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    memory_result = await hindsight_service.recall(bank_id, query=q, limit=limit)
    
    synthesized_reflection = None
    if memory_result.memory_available and memory_result.retrieved_memories:
        synthesized_reflection = await hindsight_service.reflect(bank_id, query=q)

    # Return structure compatible with both backend schemas and frontend expectations
    memories_list = [m.model_dump() if hasattr(m, "model_dump") else m for m in memory_result.retrieved_memories]

    return {
        "query": q,
        "bank_id": bank_id,
        "items": memories_list,
        "retrieved_memories": memories_list,
        "synthesized_reflection": synthesized_reflection,
        "memory_available": memory_result.memory_available
    }
