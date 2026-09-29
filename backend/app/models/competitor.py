import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id = Column(String, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    domain_url = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    website = relationship("Website", back_populates="competitors")
    observations = relationship("CompetitorObservation", back_populates="competitor", cascade="all, delete-orphan")

class CompetitorObservation(Base):
    __tablename__ = "competitor_observations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    competitor_id = Column(String, ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False)
    page_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    h1 = Column(Text, nullable=True)
    meta_description = Column(Text, nullable=True)
    heading_structure = Column(JSON, nullable=True)
    observed_changes = Column(Text, nullable=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    competitor = relationship("Competitor", back_populates="observations")
