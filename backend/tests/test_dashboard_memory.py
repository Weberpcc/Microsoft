"""
Tests for Memory, Health, and Dashboard endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "hindsight_memory_status" in data


@pytest.mark.asyncio
async def test_dashboard_metrics(auth_client: AsyncClient, test_website: dict):
    resp = await auth_client.get("/api/v1/dashboard/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_websites" in data
    assert data["total_websites"] >= 1
    assert "critical_issues" in data
    assert "tracked_keywords" in data
    assert "total_optimizations" in data


@pytest.mark.asyncio
async def test_memory_status(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/memory/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "hindsight_online" in data
    assert "bank_count" in data


@pytest.mark.asyncio
async def test_memory_explorer_fallback(auth_client: AsyncClient, test_website: dict):
    resp = await auth_client.get(f"/api/v1/memory/explorer/{test_website['id']}?q=audit")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "memory_available" in data
