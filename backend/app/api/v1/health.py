from fastapi import APIRouter
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.get("")
async def health_check():
    h_status = await hindsight_service.check_health()
    return {
        "status": "healthy",
        "service": "SEO-Mind API",
        "hindsight_memory_status": "online" if h_status else "offline_fallback"
    }
