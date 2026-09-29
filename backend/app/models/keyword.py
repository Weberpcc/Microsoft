import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id = Column(String, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)
    keyword = Column(String, index=True, nullable=False)
    target_page = Column(String, nullable=True)
    search_volume = Column(Integer, default=0)
    difficulty = Column(Integer, default=0) # 0-100
    current_position = Column(Integer, nullable=True)
    previous_position = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    website = relationship("Website", back_populates="keywords")
    observations = relationship("KeywordObservation", back_populates="keyword", cascade="all, delete-orphan")

class KeywordObservation(Base):
    __tablename__ = "keyword_observations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    keyword_id = Column(String, ForeignKey("keywords.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)
    source = Column(String, default="manual") # manual, csv_import, search_console
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    keyword = relationship("Keyword", back_populates="observations")
