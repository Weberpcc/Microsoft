"""
Tests for SEO audit endpoint — running an audit and retrieving the report.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_run_audit_with_offline_site(auth_client: AsyncClient, test_website: dict):
    """Running an audit on an unreachable site returns a 200 with a low health score."""
    payload = {
        "website_id": test_website["id"],
        "url": "https://this-domain-definitely-does-not-exist-xyz.com",
    }
    response = await auth_client.post("/api/v1/audits/run", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "health_score" in data
    assert data["health_score"] >= 0
    assert "issues" in data


@pytest.mark.asyncio
async def test_list_audits_for_website(auth_client: AsyncClient, test_website: dict):
    """After running an audit, it appears in the website's audit list."""
    # Run an audit first
    audit_resp = await auth_client.post("/api/v1/audits/run", json={
        "website_id": test_website["id"],
    })
    assert audit_resp.status_code == 200

    list_resp = await auth_client.get(f"/api/v1/audits/website/{test_website['id']}")
    assert list_resp.status_code == 200
    audits = list_resp.json()
    assert isinstance(audits, list)
    assert len(audits) >= 1


@pytest.mark.asyncio
async def test_get_audit_by_id(auth_client: AsyncClient, test_website: dict):
    """Fetching an audit by ID returns the full report with issues."""
    audit_resp = await auth_client.post("/api/v1/audits/run", json={
        "website_id": test_website["id"],
    })
    assert audit_resp.status_code == 200
    audit_id = audit_resp.json()["id"]

    get_resp = await auth_client.get(f"/api/v1/audits/{audit_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == audit_id
    assert "issues" in data
    assert "health_score" in data
    assert "audit_data" in data
