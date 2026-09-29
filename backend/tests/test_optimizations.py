"""
Tests for optimization events — logging actions and recording outcomes.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_log_optimization(auth_client: AsyncClient, test_website: dict):
    """Log an SEO optimization action and verify it is persisted."""
    payload = {
        "website_id": test_website["id"],
        "page_url": "/products",
        "action_taken": "Updated H1 from 'Products' to 'Premium SEO Tools — Fast & Accurate'",
        "previous_state": "Products",
        "new_state": "Premium SEO Tools — Fast & Accurate",
        "notes": "Targeting primary keyword cluster",
    }
    response = await auth_client.post("/api/v1/optimizations", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["action_taken"] == payload["action_taken"]
    assert data["page_url"] == "/products"
    assert data["website_id"] == test_website["id"]


@pytest.mark.asyncio
async def test_list_optimizations_for_website(auth_client: AsyncClient, test_website: dict):
    """Optimizations list includes the logged action."""
    await auth_client.post("/api/v1/optimizations", json={
        "website_id": test_website["id"],
        "page_url": "/blog",
        "action_taken": "Added meta description with target keyword",
    })

    resp = await auth_client.get(f"/api/v1/optimizations/website/{test_website['id']}")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 1


@pytest.mark.asyncio
async def test_record_optimization_outcome(auth_client: AsyncClient, test_website: dict):
    """Record an outcome for a logged optimization."""
    opt_resp = await auth_client.post("/api/v1/optimizations", json={
        "website_id": test_website["id"],
        "page_url": "/contact",
        "action_taken": "Improved page title for local SEO",
    })
    assert opt_resp.status_code == 201
    opt_id = opt_resp.json()["id"]

    outcome_resp = await auth_client.post("/api/v1/optimizations/outcome", json={
        "optimization_id": opt_id,
        "outcome_description": "Position improved from 18 to 11 within 4 weeks",
        "impact_score": 7,
    })
    assert outcome_resp.status_code == 201
    outcome = outcome_resp.json()
    assert outcome["impact_score"] == 7
    assert outcome["optimization_id"] == opt_id
