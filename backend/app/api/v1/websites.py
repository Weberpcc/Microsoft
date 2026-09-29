from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website, WebsitePage
from app.models.audit import SEOAudit
from app.models.keyword import Keyword
from app.schemas.website import WebsiteCreate, WebsiteOut, WebsiteUpdate, WebsitePageOut
from app.services.hindsight_service import hindsight_service

router = APIRouter()

@router.get("", response_model=List[WebsiteOut])
async def list_user_websites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.user_id == current_user.id).order_by(Website.created_at.desc())
    result = await db.execute(stmt)
    websites = result.scalars().all()

    website_outs = []
    for w in websites:
        # Get latest health score
        audit_stmt = select(SEOAudit.health_score).where(SEOAudit.website_id == w.id).order_by(SEOAudit.created_at.desc()).limit(1)
        audit_res = await db.execute(audit_stmt)
        latest_score = audit_res.scalar_one_or_none()

        kw_stmt = select(func.count(Keyword.id)).where(Keyword.website_id == w.id)
        kw_res = await db.execute(kw_stmt)
        total_kws = kw_res.scalar() or 0

        audit_cnt_stmt = select(func.count(SEOAudit.id)).where(SEOAudit.website_id == w.id)
        audit_cnt_res = await db.execute(audit_cnt_stmt)
        total_audits = audit_cnt_res.scalar() or 0

        w_out = WebsiteOut.model_validate(w)
        w_out.latest_health_score = latest_score
        w_out.total_keywords = total_kws
        w_out.total_audits = total_audits
        website_outs.append(w_out)

    return website_outs

@router.post("", response_model=WebsiteOut, status_code=status.HTTP_201_CREATED)
async def create_website(
    website_in: WebsiteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Normalize domain
    domain = website_in.domain.strip().lower()
    if domain.startswith("http://"):
        domain = domain[7:]
    if domain.startswith("https://"):
        domain = domain[8:]
    domain = domain.rstrip("/")

    website = Website(
        user_id=current_user.id,
        domain=domain,
        name=website_in.name,
        target_country=website_in.target_country,
        description=website_in.description
    )
    db.add(website)
    await db.commit()
    await db.refresh(website)

    # Initialize isolated Hindsight memory bank
    bank_id = hindsight_service.get_bank_id_for_website(website.id)
    await hindsight_service.ensure_memory_bank(bank_id, website.domain)

    w_out = WebsiteOut.model_validate(website)
    w_out.total_keywords = 0
    w_out.total_audits = 0
    return w_out

@router.get("/{website_id}", response_model=WebsiteOut)
async def get_website_details(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    res = await db.execute(stmt)
    website = res.scalars().first()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    audit_stmt = select(SEOAudit.health_score).where(SEOAudit.website_id == website.id).order_by(SEOAudit.created_at.desc()).limit(1)
    audit_res = await db.execute(audit_stmt)
    latest_score = audit_res.scalar_one_or_none()

    kw_stmt = select(func.count(Keyword.id)).where(Keyword.website_id == website.id)
    total_kws = (await db.execute(kw_stmt)).scalar() or 0

    w_out = WebsiteOut.model_validate(website)
    w_out.latest_health_score = latest_score
    w_out.total_keywords = total_kws
    return w_out

@router.put("/{website_id}", response_model=WebsiteOut)
async def update_website(
    website_id: str,
    website_in: WebsiteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    res = await db.execute(stmt)
    website = res.scalars().first()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    if website_in.name:
        website.name = website_in.name
    if website_in.target_country:
        website.target_country = website_in.target_country
    if website_in.description is not None:
        website.description = website_in.description

    await db.commit()
    await db.refresh(website)
    return WebsiteOut.model_validate(website)

@router.delete("/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_website(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    res = await db.execute(stmt)
    website = res.scalars().first()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    await db.delete(website)
    await db.commit()
    return None
