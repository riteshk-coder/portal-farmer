from fastapi import APIRouter, Depends, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType, Buyer
from app.models.lot import Lot, LotStatus, LotMatch
from app.schemas.lots import LotResponse
from app.services.ai_matching import run_ai_matching
from app.services.notification_service import log_notification, NotificationChannel
from app.core.config import settings
import random

router = APIRouter(prefix="/lots", tags=["lots"])

def lot_to_dict(lot: Lot) -> dict:
    return {
        "id": lot.id,
        "description": lot.description,
        "variety": lot.variety,
        "qty": lot.qty,
        "grade": lot.grade,
        "status": lot.status.value if hasattr(lot.status, "value") else lot.status,
        "priceExpectation": lot.price_expectation,
        "location": lot.location,
        "curcuminPercent": lot.curcumin_percent,
        "harvestDate": lot.harvest_date,
        "availableDate": lot.available_date,
        "notes": lot.notes,
        "fpoName": lot.fpo.name if lot.fpo else "FPO",
        "createdAt": lot.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if lot.created_at else "",
        "matches": [
            {
                "buyerName": m.buyer.name if m.buyer else "",
                "matchScore": m.match_score,
                "offeredPrice": m.offered_price
            }
            for m in lot.matches
        ]
    }

from fastapi import UploadFile, File

@router.get("", response_model=List[LotResponse])
def get_lots(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # FPOs see their own lots, others see all
    query = db.query(Lot)
    if current_user.role_type == RoleType.fpo:
        query = query.filter(Lot.fpo_id == current_user.fpo_id)
    lots = query.limit(limit).offset(offset).all()
    return [lot_to_dict(l) for l in lots]

@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return lot_to_dict(lot)

@router.post("", response_model=LotResponse)
def upload_lot(
    background_tasks: BackgroundTasks,
    description: str = Form(...),
    qty: float = Form(...),
    grade: str = Form(...),
    priceExpectation: float = Form(...),
    variety: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    curcuminPercent: Optional[float] = Form(None),
    harvestDate: Optional[str] = Form(None),
    availableDate: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    labReport: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    if labReport:
        # Validate size (max 5MB)
        try:
            labReport.file.seek(0, 2)
            size = labReport.file.tell()
            labReport.file.seek(0)
        except Exception:
            size = 0
        if size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
        
        # Validate type
        allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
        if labReport.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, PNG, and JPEG are allowed.")

    lot_id = f"LOT-{random.randint(2800, 2900)}"
    new_lot = Lot(
        id=lot_id,
        description=description,
        variety=variety,
        qty=qty,
        grade=grade,
        price_expectation=priceExpectation,
        location=location or "Nashik, MH",
        curcumin_percent=curcuminPercent,
        harvest_date=harvestDate,
        available_date=availableDate,
        notes=notes,
        status=LotStatus.matched, # Transition immediately to Matched to show compatibility
        fpo_id=current_user.fpo_id
    )
    db.add(new_lot)
    db.commit()

    # Trigger matches immediately
    db.query(LotMatch).filter(LotMatch.lot_id == new_lot.id).delete()
    matches = run_ai_matching(new_lot, db)
    
    # Rank matches and select top N
    matches.sort(key=lambda m: m.match_score, reverse=True)
    top_matches = matches[:settings.TOP_MATCHES]
    
    db.add_all(top_matches)
    db.commit()
    db.refresh(new_lot)

    # Log matching notification
    if top_matches:
        new_lot.status = LotStatus.matched
        db.commit()
        
        for m in top_matches:
            buyer_rec = m.buyer or db.query(Buyer).filter(Buyer.id == m.buyer_id).first()
            buyer_name = buyer_rec.name if buyer_rec else f"Buyer {m.buyer_id}"
            # Buyer model stores email on the linked User record, not on Buyer directly.
            # log_notification uses the name as recipient label; use buyer_name for all channels.
            
            msg = (
                f"New turmeric lot matched! Lot ID: {lot_id} ({description}). "
                f"Match confidence score: {m.match_score}%. "
                f"You have 48 hours to submit your initial quote."
            )
            
            # Log three channels per infographic: WhatsApp, SMS, and Email
            log_notification(db, NotificationChannel.whatsapp, buyer_name, msg)
            log_notification(db, NotificationChannel.sms, buyer_name, msg)
            log_notification(db, NotificationChannel.email, buyer_name, msg)

    return lot_to_dict(new_lot)

@router.get("/{lot_id}/matches")
def get_matches(lot_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return [
        {"buyerName": m.buyer.name if m.buyer else "", "matchScore": m.match_score, "offeredPrice": m.offered_price}
        for m in lot.matches
    ]
