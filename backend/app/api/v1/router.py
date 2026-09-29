from fastapi import APIRouter
from app.api.v1 import (
    auth,
    websites,
    audits,
    keywords,
    optimizations,
    competitors,
    recommendations,
    memory,
    agent,
    dashboard,
    health
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(websites.router, prefix="/websites", tags=["Websites"])
api_router.include_router(audits.router, prefix="/audits", tags=["SEO Audits"])
api_router.include_router(keywords.router, prefix="/keywords", tags=["Keywords"])
api_router.include_router(optimizations.router, prefix="/optimizations", tags=["Optimizations"])
api_router.include_router(competitors.router, prefix="/competitors", tags=["Competitors"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["AI Recommendations"])
api_router.include_router(memory.router, prefix="/memory", tags=["Hindsight Memory"])
api_router.include_router(agent.router, prefix="/agent", tags=["AI Agent & Memory Lab"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
