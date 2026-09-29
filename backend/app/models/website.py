import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Website(Base):
    __tablename__ = "websites"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    domain = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    target_country = Column(String, default="US")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="websites")
    pages = relationship("WebsitePage", back_populates="website", cascade="all, delete-orphan")
    audits = relationship("SEOAudit", back_populates="website", cascade="all, delete-orphan")
    keywords = relationship("Keyword", back_populates="website", cascade="all, delete-orphan")
    optimizations = relationship("OptimizationEvent", back_populates="website", cascade="all, delete-orphan")
    competitors = relationship("Competitor", back_populates="website", cascade="all, delete-orphan")
    recommendations = relationship("AIRecommendation", back_populates="website", cascade="all, delete-orphan")

class WebsitePage(Base):
    __tablename__ = "website_pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id = Column(String, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, index=True, nullable=False)
    title = Column(String, nullable=True)
    meta_description = Column(Text, nullable=True)
    h1 = Column(Text, nullable=True)
    status_code = Column(Integer, default=200)
    crawled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    website = relationship("Website", back_populates="pages")
