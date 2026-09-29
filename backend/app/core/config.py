import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_env_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))
if os.path.exists(_env_path):
    load_dotenv(_env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "SEO-Mind"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "seo-mind-super-secret-key-change-this-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    # Databases
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "seomind"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/seomind"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/seomind"
    
    USE_SQLITE_FALLBACK: bool = True
    SQLITE_DATABASE_URL: str = "sqlite+aiosqlite:///./seomind.db"
    SQLITE_SYNC_URL: str = "sqlite:///./seomind.db"

    # AI (Groq)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    # Persistent Memory Layer (Hindsight by Vectorize)
    HINDSIGHT_API_URL: str = "https://api.hindsight.vectorize.io"
    HINDSIGHT_API_KEY: Optional[str] = None
    HINDSIGHT_TIMEOUT_SECONDS: float = 10.0

    # Crawler Settings
    CRAWL_MAX_PAGES: int = 15
    _env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
    model_config = SettingsConfigDict(
        env_file=(_env_file, ".env"),
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()
