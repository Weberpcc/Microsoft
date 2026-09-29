import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class SEOAudit(Base):
    __tablename__ = "seo_audits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id = Column(String, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)
    health_score = Column(Integer, default=0)
    total_issues = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    info_count = Column(Integer, default=0)
    audit_data = Column(JSON, nullable=True) # Full audit details structure
    summary = Column(Text, nullable=True) # LLM generated summary
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    website = relationship("Website", back_populates="audits")
    issues = relationship("SEOIssue", back_populates="audit", cascade="all, delete-orphan")

class SEOIssue(Base):
    __tablename__ = "seo_issues"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_id = Column(String, ForeignKey("seo_audits.id", ondelete="CASCADE"), nullable=False)
    issue_type = Column(String, nullable=False) # title_missing, broken_link, etc.
    severity = Column(String, nullable=False) # critical, warning, info
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=True)
    affected_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    audit = relationship("SEOAudit", back_populates="issues")
