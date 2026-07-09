from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ops import SystemLog, LedgerEntry, FarmerSplit
from app.schemas.ops import SystemLogResponse, LedgerEntryResponse, FarmerSplitResponse

router = APIRouter(tags=["operations"])

@router.get("/logs", response_model=List[SystemLogResponse])
def list_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieve system, email, and WhatsApp logs feed, sorted newest first."""
    logs = db.query(SystemLog).order_by(SystemLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs

@router.get("/ledger", response_model=List[LedgerEntryResponse])
def list_ledger(
    contract_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieve ledger transactions. Filterable by contract ID."""
    query = db.query(LedgerEntry)
    if contract_id:
        query = query.filter(LedgerEntry.contract_id == contract_id)

    ledger_entries = query.order_by(LedgerEntry.timestamp.desc()).offset(offset).limit(limit).all()
    
    results = []
    for entry in ledger_entries:
        results.append(LedgerEntryResponse(
            id=entry.id,
            contractId=entry.contract_id,
            type=entry.type,
            party=entry.party,
            amount=entry.amount,
            timestamp=entry.timestamp
        ))
    return results

@router.get("/farmer-splits", response_model=List[FarmerSplitResponse])
def list_farmer_splits(
    lot_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieve farmer splits. Filterable by lot ID and split status."""
    query = db.query(FarmerSplit)
    
    if lot_id:
        query = query.filter(FarmerSplit.lot_id == lot_id)
    if status_filter:
        query = query.filter(FarmerSplit.status == status_filter)

    splits = query.offset(offset).limit(limit).all()

    results = []
    for s in splits:
        results.append(FarmerSplitResponse(
            lotId=s.lot_id,
            farmerName=s.farmer_name,
            sharePercent=s.share_percent,
            amount=s.amount,
            status=s.status
        ))
    return results
