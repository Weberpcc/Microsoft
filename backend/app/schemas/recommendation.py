from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RecommendationRequest(BaseModel):
    website_id: str
    user_query: Optional[str] = None
    target_page: Optional[str] = None
    use_hindsight_memory: bool = True

class FeedbackCreate(BaseModel):
    recommendation_id: str
    rating: int
    feedback_text: Optional[str] = None

class FeedbackOut(BaseModel):
    id: str
    recommendation_id: str
    rating: int
    feedback_text: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AIRecommendationOut(BaseModel):
    id: str
    website_id: str
    title: str
    description: str
    priority: str
    affected_page: Optional[str] = None
    related_keyword: Optional[str] = None
    reasoning: str
    implementation_steps: Optional[List[str]] = None
    memory_ids: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    feedback: List[FeedbackOut] = []

    model_config = ConfigDict(from_attributes=True)
