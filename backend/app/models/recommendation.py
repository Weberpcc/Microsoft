import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id = Column(String, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String, nullable=False) # high, medium, low
    affected_page = Column(String, nullable=True)
    related_keyword = Column(String, nullable=True)
    reasoning = Column(Text, nullable=False)
    implementation_steps = Column(JSON, nullable=True)
    memory_ids = Column(JSON, nullable=True) # References to retrieved Hindsight memory items
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    website = relationship("Website", back_populates="recommendations")
    feedback = relationship("RecommendationFeedback", back_populates="recommendation", cascade="all, delete-orphan")

class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recommendation_id = Column(String, ForeignKey("ai_recommendations.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False) # 1 to 5 stars or -1/1
    feedback_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    recommendation = relationship("AIRecommendation", back_populates="feedback")
