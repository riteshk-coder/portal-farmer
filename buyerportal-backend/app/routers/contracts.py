from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.models.lot import Lot, LotStatus
from app.models.farmer import Farmer
from app.models.escrow import FarmerSplit, SplitStatus, LedgerEntry, EntryType
from app.schemas.contracts import ContractResponse, SignRequest
from app.services.escrow_service import release_escrow
from app.services.scoring_service import recalculate_buyer_score, recalculate_fpo_score
from app.services.notification_service import log_notification, NotificationChannel
from datetime import datetime
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
def get_contracts(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Contract)
    if current_user.role_type == RoleType.fpo:
        query = query.filter(Contract.fpo_id == current_user.fpo_id)
    elif current_user.role_type == RoleType.buyer:
        query = query.filter(Contract.buyer_id == current_user.buyer_id)
    contracts = query.limit(limit).offset(offset).all()
    return [contract_to_dict(c) for c in contracts]

@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract_to_dict(c)

@router.post("/{contract_id}/sign")
def sign_contract(
    contract_id: str,
    body: SignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Idempotency check: raise 409 if already signed by this role
        if current_user.role_type == RoleType.buyer and c.buyer_signed:
            raise HTTPException(status_code=409, detail="Contract already signed by buyer")
        if current_user.role_type == RoleType.fpo and c.fpo_signed:
            raise HTTPException(status_code=409, detail="Contract already signed by FPO")

        if current_user.role_type == RoleType.buyer:
            c.buyer_signed = True
        elif current_user.role_type == RoleType.fpo:
            c.fpo_signed = True
            
        if c.buyer_signed and c.fpo_signed:
            c.status = ContractStatus.signed

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return contract_to_dict(c)

@router.post("/{contract_id}/fund-escrow")
def fund_escrow(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Idempotency check
        if c.escrow_status == EscrowStatus.deposited:
            raise HTTPException(status_code=409, detail="Escrow funds already deposited")

        c.escrow_status = EscrowStatus.deposited
        c.eway_bill = f"EWAY-{random.randint(100000, 999999)}"
        c.gps_tracking_id = f"GPS-{random.randint(100000, 999999)}"
        c.gst_invoice = f"INV-{random.randint(100000, 999999)}"
        
        lot = db.query(Lot).filter(Lot.id == c.lot_id).first()
        if lot:
            lot.status = LotStatus.dispatched

        # G12/Scoring: Timely deposit +2 score for buyer
        if c.buyer:
            recalculate_buyer_score(c.buyer, db, "timely_deposit")

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return contract_to_dict(c)

@router.post("/{contract_id}/release-funds")
def release_funds(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer", "escrow"))
):
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        if c.escrow_status != EscrowStatus.deposited:
            raise HTTPException(status_code=409, detail="Escrow funds not deposited or already released")

        # Fetch existing farmer splits (seeded or uploaded)
        splits = db.query(FarmerSplit).filter(FarmerSplit.lot_id == c.lot_id).all()
        if not splits:
            # Fallback Option B: query member farmers table by FPO ID
            members = db.query(Farmer).filter(Farmer.fpo_id == c.fpo_id).all()
            if members:
                # Calculate even split percentages
                n_members = len(members)
                share = round(100.0 / n_members, 2)
                shares = [share] * n_members
                shares[-1] = round(100.0 - sum(shares[:-1]), 2)
                
                log_notification(
                    db,
                    NotificationChannel.system,
                    "Escrow Daemon",
                    f"Computed even splits for FPO {c.fpo_id} registered farmers: {', '.join(m.name for m in members)}."
                )
                
                splits = []
                for m, pct in zip(members, shares):
                    amount = round(c.amount * 100000.0 * pct / 100.0, 2)
                    s = FarmerSplit(
                        lot_id=c.lot_id,
                        farmer_name=m.name,
                        share_percent=pct,
                        amount=amount,
                        status=SplitStatus.pending
                    )
                    db.add(s)
                    splits.append(s)
                db.flush()
            else:
                # Documented honest fallback: 100% split to FPO placeholder payee
                fpo_name = c.fpo.name if c.fpo else "FPO Partner"
                log_notification(
                    db,
                    NotificationChannel.system,
                    "Escrow Daemon",
                    f"No registered farmers found for FPO {c.fpo_id}. Fallback to 100% split to placeholder FPO payee."
                )
                default_split = FarmerSplit(
                    lot_id=c.lot_id,
                    farmer_name=fpo_name,
                    share_percent=100.0,
                    amount=c.amount * 100000.0,
                    status=SplitStatus.pending
                )
                db.add(default_split)
                db.flush()
                splits = [default_split]

        # G14 Validation: Ensure sum is exactly 100%
        total_percent = sum(s.share_percent for s in splits)
        if abs(total_percent - 100.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Farmer splits sum to {total_percent}%. Splits must sum to exactly 100%."
            )

        # Generate GRN number
        c.grn_number = f"GRN-{random.randint(100000, 999999)}"

        # Release escrow ledger entries and splits
        release_escrow(c, db)

        # Update lot status to GRN Issued
        lot = db.query(Lot).filter(Lot.id == c.lot_id).first()
        if lot:
            lot.status = LotStatus.grn_issued

        # Update FPO reliability score (+2 rating increase on successful delivery)
        if c.fpo:
            recalculate_fpo_score(c.fpo, db, "successful_delivery")

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Escrow release transaction failed: {str(e)}")

    # Log completion notification
    log_notification(
        db,
        NotificationChannel.system,
        "Escrow Daemon",
        f"Funds released for contract {contract_id}. 70% immediate split paid, 30% hold logged."
    )

    return contract_to_dict(c)
