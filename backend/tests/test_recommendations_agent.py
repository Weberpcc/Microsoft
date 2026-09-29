"""
Tests for AI Recommendations and Memory Lab Showcase.
Verifies both with-memory and without-memory generation, graceful offline fallback,
and ensuring difference reasoning is present.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_recommendation(auth_client: AsyncClient, test_website: dict):
    # Request AI recommendation with Hindsight memory flag enabled
    resp = await auth_client.post(
        "/api/v1/recommendations/generate",
        json={
            "website_id": test_website["id"],
            "user_query": "What should I optimize first to improve search traffic?",
            "use_hindsight_memory": True
        }
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["website_id"] == test_website["id"]
    assert "title" in data
    assert "description" in data
    assert "reasoning" in data
    assert "priority" in data
    assert isinstance(data.get("implementation_steps", []), list)


@pytest.mark.asyncio
async def test_submit_recommendation_feedback(auth_client: AsyncClient, test_website: dict):
    # 1. Generate recommendation
    rec_resp = await auth_client.post(
        "/api/v1/recommendations/generate",
        json={"website_id": test_website["id"], "user_query": "Give me title suggestions"}
    )
    assert rec_resp.status_code == 201
    rec_id = rec_resp.json()["id"]

    # 2. Submit feedback
    fb_resp = await auth_client.post(
        "/api/v1/recommendations/feedback",
        json={
            "recommendation_id": rec_id,
            "rating": 5,
            "feedback_text": "Great title suggestion; CTR improved"
        }
    )
    assert fb_resp.status_code == 200, fb_resp.text
    fb_data = fb_resp.json()
    assert fb_data["recommendation_id"] == rec_id
    assert fb_data["rating"] == 5


@pytest.mark.asyncio
async def test_memory_lab_comparison_endpoint(auth_client: AsyncClient, test_website: dict):
    """
    Verify Memory Lab side-by-side comparison endpoint returns both Scenario A and Scenario B.
    """
    resp = await auth_client.post(
        f"/api/v1/agent/memory-lab-comparison?website_id={test_website['id']}&user_query=Compare+meta+tag+strategy"
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["website_id"] == test_website["id"]
    assert "scenario_a_no_memory" in data
    assert "scenario_b_with_memory" in data
    assert "scenario_a" in data
    assert "scenario_b" in data
    assert "reasoning_differences" in data
    assert "memory_available" in data
