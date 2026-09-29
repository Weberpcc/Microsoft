import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.website import Website
from app.models.keyword import Keyword, KeywordObservation
from app.schemas.keyword import KeywordCreate, KeywordOut, KeywordObservationCreate, KeywordObservationOut

router = APIRouter()

async def _get_keyword_with_obs(db: AsyncSession, keyword_id: str) -> Keyword | None:
    """Helper: load a keyword with its observations eagerly."""
    stmt = (
        select(Keyword)
        .where(Keyword.id == keyword_id)
        .options(selectinload(Keyword.observations))
    )
    return (await db.execute(stmt)).scalars().first()

@router.post("", response_model=KeywordOut, status_code=status.HTTP_201_CREATED)
async def create_keyword(
    kw_in: KeywordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == kw_in.website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    kw = Keyword(
        website_id=kw_in.website_id,
        keyword=kw_in.keyword.strip(),
        target_page=kw_in.target_page,
        search_volume=kw_in.search_volume or 0,
        difficulty=kw_in.difficulty or 0,
        current_position=kw_in.current_position
    )
    db.add(kw)
    await db.commit()
    await db.refresh(kw)

    if kw_in.current_position:
        obs = KeywordObservation(
            keyword_id=kw.id,
            position=kw_in.current_position,
            source="manual"
        )
        db.add(obs)
        await db.commit()

    # Reload with observations eagerly loaded
    return await _get_keyword_with_obs(db, kw.id)

@router.get("/website/{website_id}", response_model=List[KeywordOut])
async def list_website_keywords(
    website_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    kw_stmt = (
        select(Keyword)
        .where(Keyword.website_id == website_id)
        .options(selectinload(Keyword.observations))
        .order_by(Keyword.created_at.desc())
    )
    keywords = (await db.execute(kw_stmt)).scalars().all()
    return keywords

@router.post("/observation", response_model=KeywordObservationOut, status_code=status.HTTP_201_CREATED)
async def record_keyword_observation(
    obs_in: KeywordObservationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    kw_stmt = select(Keyword).where(Keyword.id == obs_in.keyword_id)
    kw = (await db.execute(kw_stmt)).scalars().first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")

    w_stmt = select(Website).where(Website.id == kw.website_id, Website.user_id == current_user.id)
    website = (await db.execute(w_stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=403, detail="Unauthorized")

    kw.previous_position = kw.current_position
    kw.current_position = obs_in.position

    obs = KeywordObservation(
        keyword_id=kw.id,
        position=obs_in.position,
        source=obs_in.source or "manual"
    )
    db.add(obs)
    await db.commit()
    await db.refresh(obs)
    return obs

@router.post("/import-csv/{website_id}", response_model=List[KeywordOut])
async def import_keywords_csv(
    website_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Website).where(Website.id == website_id, Website.user_id == current_user.id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found or unauthorized")

    content = await file.read()
    text = content.decode("utf-8")
    csv_reader = csv.DictReader(io.StringIO(text))

    kw_ids: List[str] = []
    for row in csv_reader:
        kw_text = row.get("keyword") or row.get("Keyword")
        if not kw_text:
            continue

        pos = row.get("position") or row.get("Position") or row.get("rank")
        vol = row.get("volume") or row.get("search_volume") or 0
        diff = row.get("difficulty") or 0
        page = row.get("target_page") or row.get("url")

        kw = Keyword(
            website_id=website_id,
            keyword=kw_text.strip(),
            target_page=page,
            search_volume=int(vol) if str(vol).isdigit() else 0,
            difficulty=int(diff) if str(diff).isdigit() else 0,
            current_position=int(pos) if pos and str(pos).isdigit() else None
        )
        db.add(kw)
        await db.flush()
        kw_ids.append(kw.id)

    await db.commit()

    # Reload all with observations eagerly loaded
    reload_stmt = (
        select(Keyword)
        .where(Keyword.id.in_(kw_ids))
        .options(selectinload(Keyword.observations))
    )
    return (await db.execute(reload_stmt)).scalars().all()
