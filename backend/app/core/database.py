import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("seomind.database")

# Select database URL based on configuration and availability
if settings.USE_SQLITE_FALLBACK:
    DATABASE_URL = settings.SQLITE_DATABASE_URL
else:
    DATABASE_URL = settings.DATABASE_URL

from sqlalchemy.pool import NullPool

# SQLite and PostgreSQL Poolers (like Neon) require customized connect_args
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args=connect_args
    )
else:
    # Neon pooler (pgbouncer) requires disabling prepared statement cache & using NullPool
    connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0
    }
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        poolclass=NullPool,
        connect_args=connect_args
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
