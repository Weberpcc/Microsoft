"""
Tests for Competitors endpoints — create, list, and observe.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_competitor(auth_client: AsyncClient, test_website: dict):
    # 1. Create competitor
    payload = {
        "website_id": test_website["id"],
        "name": "Rival SEO Corp",
        "domain_url": "rival-example.com",
        "notes": "Main organic competitor in US"
    }
    resp = await auth_client.post("/api/v1/competitors", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "Rival SEO Corp"
    assert data["domain_url"] == "rival-example.com"
    assert data["website_id"] == test_website["id"]
    assert "observations" in data
    assert isinstance(data["observations"], list)

    # 2. List competitors for website
    list_resp = await auth_client.get(f"/api/v1/competitors/website/{test_website['id']}")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1
    assert any(c["name"] == "Rival SEO Corp" for c in items)


@pytest.mark.asyncio
async def test_observe_competitor_page(auth_client: AsyncClient, test_website: dict):
    # 1. Create competitor first
    create_resp = await auth_client.post("/api/v1/competitors", json={
        "website_id": test_website["id"],
        "name": "Competitor Tracker Inc",
        "domain_url": "tracker-example.com"
    })
    assert create_resp.status_code == 201
    comp_id = create_resp.json()["id"]

    # 2. Trigger observation with unreachable mock URL
    obs_resp = await auth_client.post(
        f"/api/v1/competitors/{comp_id}/observe?page_url=https://this-competitor-mock-does-not-exist.org"
    )
    assert obs_resp.status_code == 200, obs_resp.text
    obs_data = obs_resp.json()
    assert obs_data["competitor_id"] == comp_id
    assert "observed_at" in obs_data
