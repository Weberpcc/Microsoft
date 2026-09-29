import pytest
from httpx import AsyncClient
from app.core.security import create_access_token, get_password_hash
import app.models

@pytest.mark.asyncio
async def test_create_and_list_websites(async_client: AsyncClient, auth_headers):
    # 1. Create website
    create_resp = await async_client.post(
        "/api/v1/websites",
        json={
            "domain": "https://example.com",
            "name": "Example Corp",
            "target_country": "US",
            "description": "Tech enterprise"
        },
        headers=auth_headers
    )
    assert create_resp.status_code == 201
    w_data = create_resp.json()
    assert w_data["domain"] == "example.com"

    # 2. List websites
    list_resp = await async_client.get("/api/v1/websites", headers=auth_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["name"] == "Example Corp"


@pytest.mark.asyncio
async def test_website_ownership_isolation(async_client: AsyncClient, db_session, auth_headers):
    """
    Test user-to-website isolation:
    User A creates Website A. User B cannot view, modify, or delete Website A.
    """
    # 1. User A creates Website A
    create_a = await async_client.post(
        "/api/v1/websites",
        json={"domain": "user-a-site.org", "name": "User A Site", "target_country": "US"},
        headers=auth_headers
    )
    assert create_a.status_code == 201
    site_a_id = create_a.json()["id"]

    # 2. Create User B
    user_b = app.models.User(
        email="user_b@isolation.test",
        hashed_password=get_password_hash("password12345"),
        full_name="User B"
    )
    db_session.add(user_b)
    await db_session.commit()
    await db_session.refresh(user_b)

    token_b = create_access_token(subject=user_b.id)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User B lists websites — must NOT see User A's website
    list_b = await async_client.get("/api/v1/websites", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # 4. User B attempts to access User A's website directly by ID — must be 404/403
    get_b = await async_client.get(f"/api/v1/websites/{site_a_id}", headers=headers_b)
    assert get_b.status_code in (403, 404)

    # 5. User B attempts to delete User A's website — must be rejected
    del_b = await async_client.delete(f"/api/v1/websites/{site_a_id}", headers=headers_b)
    assert del_b.status_code in (403, 404)
