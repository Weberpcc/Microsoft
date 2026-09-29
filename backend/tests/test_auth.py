import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(async_client: AsyncClient):
    resp = await async_client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "Password123!",
        "full_name": "New User"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"

@pytest.mark.asyncio
async def test_login_user(async_client: AsyncClient, test_user):
    resp = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "testuser@example.com", "password": "testpassword123"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data

@pytest.mark.asyncio
async def test_get_current_user_profile(async_client: AsyncClient, auth_headers):
    resp = await async_client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "testuser@example.com"
