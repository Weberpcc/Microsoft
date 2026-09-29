import pytest
from app.services.crawler_service import crawler_service
from app.services.auditor_service import auditor_service

def test_ssrf_protection():
    assert crawler_service.is_safe_url("https://example.com") is True
    assert crawler_service.is_safe_url("http://127.0.0.1") is False
    assert crawler_service.is_safe_url("http://localhost:8000") is False
    assert crawler_service.is_safe_url("http://192.168.1.1") is False
    assert crawler_service.is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert crawler_service.is_safe_url("file:///etc/passwd") is False
    assert crawler_service.is_safe_url("ftp://example.com") is False
    assert crawler_service.is_safe_url("http://metadata.google.internal") is False

@pytest.mark.asyncio
async def test_audit_unreachable_site():
    result = await auditor_service.run_full_audit("http://127.0.0.1")
    assert result["health_score"] == 10
    assert result["critical_count"] == 1
    assert result["issues"][0]["issue_type"] == "page_unreachable"
