from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website, WebsitePage
from app.models.audit import SEOAudit, SEOIssue
from app.schemas.audit import SEOAuditOut, AuditRunRequest
from app.services.auditor_service import auditor_service
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.post("/run", response_model=SEOAuditOut, status_code=status.HTTP_200_OK)
async def run_website_audit(
    audit_req: AuditRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user owns the website
    stmt = select(Website).where(Website.id == audit_req.website_id, Website.user_id == current_user.id)
    res = await db.execute(stmt)
    website = res.scalars().first()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    target_url = audit_req.url or f"https://{website.domain}"

    # Run deterministic audit engine
    audit_result = await auditor_service.run_full_audit(target_url)

    # 1. Save SEOAudit record to database
    seo_audit = SEOAudit(
        website_id=website.id,
        health_score=audit_result["health_score"],
        total_issues=audit_result["total_issues"],
        critical_count=audit_result["critical_count"],
        warning_count=audit_result["warning_count"],
        info_count=audit_result["info_count"],
        audit_data=audit_result,
        summary=audit_result["summary"]
    )
    db.add(seo_audit)
    await db.commit()
    await db.refresh(seo_audit)

    # 2. Save individual SEOIssue records
    for issue_data in audit_result["issues"]:
        issue = SEOIssue(
            audit_id=seo_audit.id,
            issue_type=issue_data["issue_type"],
            severity=issue_data["severity"],
            title=issue_data["title"],
            description=issue_data["description"],
            recommendation=issue_data.get("recommendation"),
            affected_url=issue_data.get("affected_url", target_url)
        )
        db.add(issue)

    # 3. Store WebsitePage record
    page_details = audit_result.get("page_details", {})
    if page_details and "error" not in page_details:
        page = WebsitePage(
            website_id=website.id,
            url=target_url,
            title=page_details.get("title"),
            meta_description=page_details.get("meta_description"),
            h1=page_details.get("primary_h1"),
            status_code=page_details.get("status_code", 200)
        )
        db.add(page)

    await db.commit()

    # 4. Hindsight Learning Loop: Retain audit summary in Hindsight persistent memory
    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    memory_content = (
        f"SEO Audit conducted on {target_url}. Health Score: {audit_result['health_score']}/100. "
        f"Critical issues: {audit_result['critical_count']}. Summary: {audit_result['summary']}"
    )
    await hindsight_service.retain(
        bank_id=bank_id,
        content=memory_content,
        event_type="audit_summary",
        entity_name=website.domain,
        metadata={
            "audit_id": seo_audit.id,
            "health_score": audit_result["health_score"],
            "critical_count": audit_result["critical_count"]
        }
    )

    # Fetch with issues eager-loaded to avoid lazy-load MissingGreenlet errors
    res_stmt = (
        select(SEOAudit)
        .where(SEOAudit.id == seo_audit.id)
        .options(selectinload(SEOAudit.issues))
    )
    retrieved_audit = (await db.execute(res_stmt)).scalars().first()
    return retrieved_audit

@router.get("/website/{website_id}", response_model=List[SEOAuditOut])
async def list_website_audits(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    audit_stmt = (
        select(SEOAudit)
        .where(SEOAudit.website_id == website_id)
        .options(selectinload(SEOAudit.issues))
        .order_by(SEOAudit.created_at.desc())
    )
    audits = (await db.execute(audit_stmt)).scalars().all()
    return audits

@router.get("/{audit_id}", response_model=SEOAuditOut)
async def get_audit_details(
    audit_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    audit_stmt = (
        select(SEOAudit)
        .where(SEOAudit.id == audit_id)
        .options(selectinload(SEOAudit.issues))
    )
    audit = (await db.execute(audit_stmt)).scalars().first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit report not found")

    website_stmt = select(Website).where(Website.id == audit.website_id, Website.user_id == current_user.id)
    website = (await db.execute(website_stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=403, detail="Unauthorized access to audit report")

    return audit
