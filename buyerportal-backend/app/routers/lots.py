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
        "qty": lot.qty,
        "grade": lot.grade,
        "status": lot.status.value if hasattr(lot.status, "value") else lot.status,
        "priceExpectation": lot.price_expectation,
        "location": lot.location,
        "curcuminPercent": lot.curcumin_percent,
        "harvestDate": lot.harvest_date,
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
    location: Optional[str] = Form(None),
    curcuminPercent: Optional[float] = Form(None),
    harvestDate: Optional[str] = Form(None),
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
        qty=qty,
        grade=grade,
        price_expectation=priceExpectation,
        location=location or "Nashik, MH",
        curcumin_percent=curcuminPercent,
        harvest_date=harvestDate,
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
        
        top_m = top_matches[0]
        # Resolve buyer name
        buyer_name = "Buyer"
        if top_m.buyer:
            buyer_name = top_m.buyer.name
        else:
            # Fallback query if relation not loaded
            buyer_rec = db.query(Buyer).filter(Buyer.id == top_m.buyer_id).first()
            if buyer_rec:
                buyer_name = buyer_rec.name

        log_notification(
            db,
            NotificationChannel.system,
            "AI Matching Core",
            f"Matching Complete ({top_m.matching_path} path) for {description} ({lot_id}). "
            f"Top match: {buyer_name} with {top_m.match_score}% confidence score."
        )

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
