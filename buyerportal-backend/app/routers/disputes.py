from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, RoleType
from app.models.dispute import Dispute, DisputeType, DisputeStatus
from app.models.lot import Lot
from app.schemas.dispute import DisputeCreate, DisputeResponse
import random

router = APIRouter(prefix="/disputes", tags=["disputes"])

def dispute_to_dict(d: Dispute) -> dict:
    return {
        "id": d.id,
        "type": d.type.value if hasattr(d.type, "value") else d.type,
        "lotId": d.lot_id,
        "buyerName": d.buyer.name if d.buyer else "",
        "fpoName": d.fpo.name if d.fpo else "",
        "description": d.description,
        "status": d.status.value if hasattr(d.status, "value") else d.status,
        "filedAt": d.filed_at.strftime("%Y-%m-%dT%H:%M:%SZ") if d.filed_at else ""
    }

@router.get("", response_model=List[DisputeResponse])
def get_disputes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role_type == RoleType.fpo:
        disputes = db.query(Dispute).filter(Dispute.fpo_id == current_user.fpo_id).all()
    elif current_user.role_type == RoleType.buyer:
        disputes = db.query(Dispute).filter(Dispute.buyer_id == current_user.buyer_id).all()
    else:
        disputes = db.query(Dispute).all()
    return [dispute_to_dict(d) for d in disputes]

@router.post("", response_model=DisputeResponse)
def file_dispute(body: DisputeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == body.lotId).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
        
    dispute_id = f"DSP-{random.randint(100, 200):03d}"
    new_dispute = Dispute(
        id=dispute_id,
        type=DisputeType.quality_mismatch if "Quality" in body.type else DisputeType.payment_delay,
        lot_id=body.lotId,
        buyer_id=current_user.buyer_id if current_user.role_type == RoleType.buyer else 1,
        fpo_id=lot.fpo_id,
        description=body.description,
        status=DisputeStatus.review
    )
    db.add(new_dispute)
    db.commit()
    db.refresh(new_dispute)
    return dispute_to_dict(new_dispute)

@router.post("/{dispute_id}/resolve")
def resolve_dispute(dispute_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    d.status = DisputeStatus.resolved
    db.commit()
    return dispute_to_dict(d)
