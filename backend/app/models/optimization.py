import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class OptimizationEvent(Base):
    __tablename__ = "optimization_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id = Column(String, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)
    page_url = Column(String, nullable=False)
    keyword_id = Column(String, ForeignKey("keywords.id", ondelete="SET NULL"), nullable=True)
    action_taken = Column(Text, nullable=False)
    previous_state = Column(Text, nullable=True)
    new_state = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    hindsight_memory_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    website = relationship("Website", back_populates="optimizations")
    outcomes = relationship("OptimizationOutcome", back_populates="optimization", cascade="all, delete-orphan")

class OptimizationOutcome(Base):
    __tablename__ = "optimization_outcomes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    optimization_id = Column(String, ForeignKey("optimization_events.id", ondelete="CASCADE"), nullable=False)
    outcome_description = Column(Text, nullable=False)
    impact_score = Column(Integer, default=0) # -10 to +10 ranking/traffic impact
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    optimization = relationship("OptimizationEvent", back_populates="outcomes")
