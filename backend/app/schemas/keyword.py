from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class KeywordBase(BaseModel):
    keyword: str
    target_page: Optional[str] = None
    search_volume: Optional[int] = 0
    difficulty: Optional[int] = 0

class KeywordCreate(KeywordBase):
    website_id: str
    current_position: Optional[int] = None

class KeywordObservationCreate(BaseModel):
    keyword_id: str
    position: int
    source: Optional[str] = "manual"

class KeywordObservationOut(BaseModel):
    id: str
    keyword_id: str
    position: int
    source: str
    observed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class KeywordOut(KeywordBase):
    id: str
    website_id: str
    current_position: Optional[int] = None
    previous_position: Optional[int] = None
    created_at: datetime
    observations: List[KeywordObservationOut] = []

    model_config = ConfigDict(from_attributes=True)
