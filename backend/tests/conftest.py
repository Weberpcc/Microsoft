import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

TEST_DB_FILE = "./test_seomind.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

# Override config settings BEFORE database engine is initialized
from app.core.config import settings
settings.SQLITE_DATABASE_URL = TEST_DATABASE_URL
settings.DATABASE_URL = TEST_DATABASE_URL
settings.USE_SQLITE_FALLBACK = True

import app.models # Register all models
from app.main import app as fastapi_app
from app.core.database import Base, get_db, engine
from app.core.security import create_access_token, get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def async_client(db_session):
    async def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    fastapi_app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def test_user(db_session):
    user = app.models.User(
        email="testuser@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test Architect"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest_asyncio.fixture
def auth_headers(test_user):
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def auth_client(db_session, test_user):
    """Authenticated HTTP client with a real test user token."""
    token = create_access_token(subject=test_user.id)

    async def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        yield client
    fastapi_app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def test_website(auth_client):
    """Create a test website owned by the test user and return its JSON response."""
    resp = await auth_client.post("/api/v1/websites", json={
        "domain": "test-example.com",
        "name": "Test Website",
        "target_country": "US",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()
