"""
Tests for keyword tracking endpoint — creation, listing, and position observation.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_keyword(auth_client: AsyncClient, test_website: dict):
    """Create a keyword and verify it is returned correctly."""
    payload = {
        "website_id": test_website["id"],
        "keyword": "best seo tools 2026",
        "target_page": "/products",
        "search_volume": 2400,
        "difficulty": 45,
        "current_position": 12,
    }
    response = await auth_client.post("/api/v1/keywords", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["keyword"] == "best seo tools 2026"
    assert data["search_volume"] == 2400
    assert data["difficulty"] == 45
    assert data["current_position"] == 12
    assert data["website_id"] == test_website["id"]


@pytest.mark.asyncio
async def test_list_keywords_for_website(auth_client: AsyncClient, test_website: dict):
    """List keywords returns only keywords belonging to the website."""
    kw_payload = {
        "website_id": test_website["id"],
        "keyword": "free seo audit tool",
        "search_volume": 1200,
        "difficulty": 30,
    }
    create_resp = await auth_client.post("/api/v1/keywords", json=kw_payload)
    assert create_resp.status_code == 201

    list_resp = await auth_client.get(f"/api/v1/keywords/website/{test_website['id']}")
    assert list_resp.status_code == 200
    keywords = list_resp.json()
    assert isinstance(keywords, list)
    assert len(keywords) >= 1
    assert any(k["keyword"] == "free seo audit tool" for k in keywords)


@pytest.mark.asyncio
async def test_record_keyword_observation(auth_client: AsyncClient, test_website: dict):
    """Record a position observation for a keyword."""
    kw_resp = await auth_client.post("/api/v1/keywords", json={
        "website_id": test_website["id"],
        "keyword": "seo ranking tracker",
        "search_volume": 800,
        "difficulty": 55,
        "current_position": 20,
    })
    assert kw_resp.status_code == 201
    kw_id = kw_resp.json()["id"]

    obs_resp = await auth_client.post("/api/v1/keywords/observation", json={
        "keyword_id": kw_id,
        "position": 15,
        "source": "manual",
    })
    assert obs_resp.status_code == 201
    obs_data = obs_resp.json()
    assert obs_data["position"] == 15
    assert obs_data["keyword_id"] == kw_id

    # After observation, current_position should update to 15
    updated_kw = await auth_client.get(f"/api/v1/keywords/website/{test_website['id']}")
    updated = next((k for k in updated_kw.json() if k["id"] == kw_id), None)
    assert updated is not None
    assert updated["current_position"] == 15
