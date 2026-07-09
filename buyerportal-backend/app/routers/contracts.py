from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, RoleType
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.models.lot import Lot, LotStatus
from app.schemas.contract import ContractResponse, SignRequest
import random

router = APIRouter(prefix="/contracts", tags=["contracts"])

def contract_to_dict(c: Contract) -> dict:
    return {
        "id": c.id,
        "lotId": c.lot_id,
        "lotDescription": c.lot.description if c.lot else "",
        "buyerName": c.buyer.name if c.buyer else "",
        "fpoName": c.fpo.name if c.fpo else "",
        "qty": c.qty,
        "price": c.price,
        "amount": c.amount,
        "status": c.status.value if hasattr(c.status, "value") else c.status,
        "fpoSigned": c.fpo_signed,
        "buyerSigned": c.buyer_signed,
        "escrowStatus": c.escrow_status.value if hasattr(c.escrow_status, "value") else c.escrow_status,
        "ewayBill": c.eway_bill,
        "gpsTrackingId": c.gps_tracking_id,
        "gstInvoice": c.gst_invoice,
        "grnNumber": c.grn_number
    }

@router.get("", response_model=List[ContractResponse])
def get_contracts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role_type == RoleType.fpo:
        contracts = db.query(Contract).filter(Contract.fpo_id == current_user.fpo_id).all()
    elif current_user.role_type == RoleType.buyer:
        contracts = db.query(Contract).filter(Contract.buyer_id == current_user.buyer_id).all()
    else:
        contracts = db.query(Contract).all()
    return [contract_to_dict(c) for c in contracts]

@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract_to_dict(c)

@router.post("/{contract_id}/sign")
def sign_contract(contract_id: str, body: SignRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if current_user.role_type == RoleType.buyer:
        c.buyer_signed = True
    elif current_user.role_type == RoleType.fpo:
        c.fpo_signed = True
        
    if c.buyer_signed and c.fpo_signed:
        c.status = ContractStatus.signed
        
    db.commit()
    return contract_to_dict(c)

@router.post("/{contract_id}/fund-escrow")
def fund_escrow(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    c.escrow_status = EscrowStatus.deposited
    
    # Auto dispatch (Dispatched) and generate e-Way bill, GPS ID, and GST invoice
    c.eway_bill = f"EWAY-{random.randint(100000, 999999)}"
    c.gps_tracking_id = f"GPS-{random.randint(100000, 999999)}"
    c.gst_invoice = f"INV-{random.randint(100000, 999999)}"
    
    lot = db.query(Lot).filter(Lot.id == c.lot_id).first()
    if lot:
        lot.status = LotStatus.dispatched
        
    db.commit()
    return contract_to_dict(c)
