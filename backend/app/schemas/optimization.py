from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OptimizationCreate(BaseModel):
    website_id: str
    page_url: str
    keyword_id: Optional[str] = None
    action_taken: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    notes: Optional[str] = None

class OutcomeCreate(BaseModel):
    optimization_id: str
    outcome_description: str
    impact_score: int = 0

class OptimizationOutcomeOut(BaseModel):
    id: str
    optimization_id: str
    outcome_description: str
    impact_score: int
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OptimizationEventOut(BaseModel):
    id: str
    website_id: str
    page_url: str
    keyword_id: Optional[str] = None
    action_taken: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    notes: Optional[str] = None
    hindsight_memory_id: Optional[str] = None
    created_at: datetime
    outcomes: List[OptimizationOutcomeOut] = []

    model_config = ConfigDict(from_attributes=True)
