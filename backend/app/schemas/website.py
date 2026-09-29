from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class WebsiteBase(BaseModel):
    domain: str
    name: str
    target_country: str = "US"
    description: Optional[str] = None

class WebsiteCreate(WebsiteBase):
    pass

class WebsiteUpdate(BaseModel):
    name: Optional[str] = None
    target_country: Optional[str] = None
    description: Optional[str] = None

class WebsitePageOut(BaseModel):
    id: str
    website_id: str
    url: str
    title: Optional[str] = None
    meta_description: Optional[str] = None
    h1: Optional[str] = None
    status_code: int
    crawled_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WebsiteOut(WebsiteBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    latest_health_score: Optional[int] = None
    total_audits: Optional[int] = 0
    total_keywords: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
