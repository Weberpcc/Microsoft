from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CompetitorCreate(BaseModel):
    website_id: str
    name: str
    domain_url: str
    notes: Optional[str] = None

class CompetitorObservationOut(BaseModel):
    id: str
    competitor_id: str
    page_url: str
    title: Optional[str] = None
    h1: Optional[str] = None
    meta_description: Optional[str] = None
    heading_structure: Optional[Dict[str, Any]] = None
    observed_changes: Optional[str] = None
    observed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CompetitorOut(BaseModel):
    id: str
    website_id: str
    name: str
    domain_url: str
    notes: Optional[str] = None
    created_at: datetime
    observations: List[CompetitorObservationOut] = []

    model_config = ConfigDict(from_attributes=True)
