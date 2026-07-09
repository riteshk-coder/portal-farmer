from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType
from app.models.quote import Quote, QuoteStatus, CounterBy
from app.models.lot import Lot, LotStatus
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteResponseAction, BuyerCounter
from app.services.notification_service import log_notification, NotificationChannel
from app.core.config import settings
import random

router = APIRouter(prefix="/quotes", tags=["quotes"])

def quote_to_dict(q: Quote) -> dict:
    return {
        "id": q.id,
        "lotId": q.lot_id,
        "lotDescription": q.lot.description if q.lot else "",
        "buyerName": q.buyer.name if q.buyer else "",
        "price": q.price,
        "qty": q.qty,
        "status": q.status.value if hasattr(q.status, "value") else q.status,
        "counterBy": q.counter_by.value if (q.counter_by and hasattr(q.counter_by, "value")) else q.counter_by,
        "message": q.message,
        "counterRounds": q.counter_rounds
    }

@router.get("", response_model=List[QuoteResponse])
def get_quotes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role_type == RoleType.fpo:
        quotes = db.query(Quote).join(Lot).filter(Lot.fpo_id == current_user.fpo_id).all()
    elif current_user.role_type == RoleType.buyer:
        quotes = db.query(Quote).filter(Quote.buyer_id == current_user.buyer_id).all()
    else:
        quotes = db.query(Quote).all()
    return [quote_to_dict(q) for q in quotes]

@router.post("", response_model=QuoteResponse)
def submit_quote(body: QuoteCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("buyer"))):
    lot = db.query(Lot).filter(Lot.id == body.lotId).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    
    quote_id = f"QT-{random.randint(200, 300)}"
    new_quote = Quote(
        id=quote_id,
        lot_id=body.lotId,
        buyer_id=current_user.buyer_id,
        price=body.price,
        qty=body.qty,
        status=QuoteStatus.awaiting_response,
        message=body.message or "Initial buyer bid"
    )
    lot.status = LotStatus.quoting
    db.add(new_quote)
    db.commit()
    db.refresh(new_quote)
    return quote_to_dict(new_quote)

@router.post("/{quote_id}/respond")
def respond_quote(quote_id: str, body: QuoteResponseAction, db: Session = Depends(get_db), current_user: User = Depends(require_role("fpo"))):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if body.action == "accept":
        quote.status = QuoteStatus.accepted
        lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
        if lot:
            lot.status = LotStatus.matched

        # Auto-create contract
        contract_id = f"CNT-{random.randint(100, 200):04d}"
        contract = Contract(
            id=contract_id,
            lot_id=quote.lot_id,
            buyer_id=quote.buyer_id,
            fpo_id=lot.fpo_id if lot else current_user.fpo_id,
            qty=quote.qty,
            price=quote.price,
            amount=round((quote.qty * quote.price * 1000) / 100000.0, 2),  # in Lakhs
            status=ContractStatus.esign_pending,
            fpo_signed=True,  # FPO eSigned instantly upon acceptance
            buyer_signed=False,
            escrow_status=EscrowStatus.pending_deposit
        )
        db.add(contract)
        db.commit()

        # Log Contract Upload log
        log_notification(
            db,
            NotificationChannel.system,
            "Escrow Daemon",
            f"Auto-generated contract {contract_id} for {lot.description if lot else 'Lot'} uploaded to vault."
        )

        return {"status": "accepted", "contractId": contract_id}

    elif body.action == "reject":
        quote.status = QuoteStatus.rejected
        db.commit()
        return {"status": "rejected"}

    elif body.action == "counter":
        if not body.counterPrice:
            raise HTTPException(status_code=400, detail="counterPrice required for counter action")
        if quote.counter_rounds >= settings.MAX_COUNTER_ROUNDS:
            raise HTTPException(status_code=409, detail=f"Maximum {settings.MAX_COUNTER_ROUNDS} counter rounds reached")
        
        quote.price = body.counterPrice
        quote.status = QuoteStatus.counter_offer
        quote.counter_by = CounterBy.fpo
        quote.counter_rounds += 1
        
        lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
        if lot:
            lot.status = LotStatus.counter_offer
        db.commit()
        return {"status": "counter-sent", "newPrice": body.counterPrice}

    raise HTTPException(status_code=400, detail="Invalid action")

@router.post("/{quote_id}/counter", response_model=QuoteResponse)
def buyer_counter_quote(quote_id: str, body: BuyerCounter, db: Session = Depends(get_db), current_user: User = Depends(require_role("buyer"))):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.counter_rounds >= settings.MAX_COUNTER_ROUNDS:
        raise HTTPException(status_code=409, detail="Max counter rounds reached")
    
    quote.price = body.price
    quote.status = QuoteStatus.counter_offer
    quote.counter_by = CounterBy.buyer
    quote.message = body.message or "Buyer revised counter offer"
    quote.counter_rounds += 1
    
    lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
    if lot:
        lot.status = LotStatus.counter_offer
    db.commit()
    db.refresh(quote)
    return quote_to_dict(quote)
