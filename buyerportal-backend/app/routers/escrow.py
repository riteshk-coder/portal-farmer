from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.escrow import LedgerEntry, FarmerSplit
from app.schemas.escrow import LedgerResponse, FarmerSplitResponse

router = APIRouter(prefix="/escrow", tags=["escrow"])

@router.get("/ledger", response_model=List[LedgerResponse])
def get_ledger(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ledger = db.query(LedgerEntry).all()
    return [
        {
            "id": l.id,
            "contractId": l.contract_id,
            "type": l.type.value if hasattr(l.type, "value") else l.type,
            "party": l.party,
            "amount": l.amount,
            "timestamp": l.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if l.timestamp else ""
        }
        for l in ledger
    ]

@router.get("/farmer-splits", response_model=List[FarmerSplitResponse])
def get_farmer_splits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    splits = db.query(FarmerSplit).all()
    return [
        {
            "lotId": s.lot_id,
            "farmerName": s.farmer_name,
            "sharePercent": s.share_percent,
            "amount": s.amount,
            "status": s.status.value if hasattr(s.status, "value") else s.status
        }
        for s in splits
    ]
