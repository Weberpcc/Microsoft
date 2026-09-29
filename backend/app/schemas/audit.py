from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SEOIssueOut(BaseModel):
    id: str
    audit_id: str
    issue_type: str
    severity: str
    title: str
    description: str
    recommendation: Optional[str] = None
    affected_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditRunRequest(BaseModel):
    website_id: str
    url: Optional[str] = None
    max_pages: Optional[int] = 10

class SEOAuditOut(BaseModel):
    id: str
    website_id: str
    health_score: int
    total_issues: int
    critical_count: int
    warning_count: int
    info_count: int
    summary: Optional[str] = None
    audit_data: Optional[Dict[str, Any]] = None
    issues: List[SEOIssueOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
