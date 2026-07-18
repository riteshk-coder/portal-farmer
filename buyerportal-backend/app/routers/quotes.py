from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType, Buyer, Fpo
from app.models.quote import Quote, QuoteStatus, CounterBy
from app.models.lot import Lot, LotStatus
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.schemas.quotes import QuoteCreate, QuoteResponse, QuoteResponseAction, BuyerCounter
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

from datetime import datetime, timedelta

@router.get("", response_model=List[QuoteResponse])
def get_quotes(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Quote)
    if current_user.role_type == RoleType.fpo:
        query = query.join(Lot).filter(Lot.fpo_id == current_user.fpo_id)
    elif current_user.role_type == RoleType.buyer:
        query = query.filter(Quote.buyer_id == current_user.buyer_id)
    quotes = query.limit(limit).offset(offset).all()
    return [quote_to_dict(q) for q in quotes]

@router.post("", response_model=QuoteResponse)
def submit_quote(body: QuoteCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("buyer"))):
    lot = db.query(Lot).filter(Lot.id == body.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    
    # Enforce 48-hour quote window check
    now = datetime.utcnow()
    lot_created = lot.created_at.replace(tzinfo=None) if lot.created_at else now
    if now - lot_created > timedelta(hours=settings.QUOTE_WINDOW_HRS):
        raise HTTPException(status_code=409, detail="Quote submission window has expired for this lot")
        
    quote_id = f"QT-{random.randint(200, 300)}"
    new_quote = Quote(
        id=quote_id,
        lot_id=body.lot_id,
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

    # Notify FPO who owns the lot — Email/WhatsApp delivery + System panel
    fpo_name = lot.fpo.name if lot.fpo else "FPO"
    buyer_company_name = current_user.name
    if current_user.buyer_id:
        buyer_rec = db.query(Buyer).filter(Buyer.id == current_user.buyer_id).first()
        if buyer_rec:
            buyer_company_name = buyer_rec.name
    fpo_msg = f"New quote on {lot.id}: ₹{new_quote.price}/kg for {new_quote.qty} MT from {buyer_company_name}. Respond within 48h."
    log_notification(db, NotificationChannel.email, fpo_name, fpo_msg, recipient_role="fpo", event_type="new_quote_received")
    log_notification(db, NotificationChannel.whatsapp, fpo_name, fpo_msg, recipient_role="fpo", event_type="new_quote_received")
    log_notification(db, NotificationChannel.system, fpo_name, fpo_msg, recipient_role="fpo", event_type="new_quote_received")

    # Notify Buyer who submitted the quote
    buyer_name = current_user.name
    buyer_msg = f"Your quote {new_quote.id} of ₹{new_quote.price}/kg on {lot.id} has been submitted successfully."
    log_notification(db, NotificationChannel.system, buyer_name, buyer_msg, recipient_role="buyer", event_type="quote_submitted")

    return quote_to_dict(new_quote)


@router.post("/{quote_id}/respond")
def respond_quote(quote_id: str, body: QuoteResponseAction, db: Session = Depends(get_db), current_user: User = Depends(require_role("fpo", "buyer"))):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if body.action == "accept":
        # Wrap everything in a transaction block
        try:
            quote.status = QuoteStatus.accepted
            lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
            if lot:
                lot.status = LotStatus.matched

            # Auto-create contract
            contract_id = f"CNT-{random.randint(100, 200):04d}"
            
            # Fetch FPO ID dynamically
            fpo_id = lot.fpo_id if lot else None
            if not fpo_id:
                if current_user.role_type == RoleType.fpo:
                    fpo_id = current_user.fpo_id
                else:
                    fpo_id = 1
            
            contract = Contract(
                id=contract_id,
                lot_id=quote.lot_id,
                buyer_id=quote.buyer_id,
                fpo_id=fpo_id,
                qty=quote.qty,
                price=quote.price,
                amount=round((quote.qty * quote.price * 1000) / 100000.0, 2),  # in Lakhs
                status=ContractStatus.esign_pending,
                fpo_signed=True,  # FPO eSigned instantly upon acceptance
                buyer_signed=False,
                escrow_status=EscrowStatus.pending_deposit,
                updated_by=current_user.id
            )
            db.add(contract)
            db.commit()
        except Exception as e:
            db.rollback()
            # Admin Notification #13 (System): Server error contract auto-generation failed
            admin_err_msg = f"Server error: contract auto-generation failed for {quote.id} ({quote.lot_id}) — transaction rolled back. Manual review needed."
            log_notification(db, NotificationChannel.system, "MahaFPC", admin_err_msg, recipient_role="mahafpc", event_type="server_error")
            raise HTTPException(status_code=500, detail=f"Failed to generate contract: {str(e)}")

        # Log Contract Vault log
        log_notification(
            db,
            NotificationChannel.system,
            "Escrow Daemon",
            f"Auto-generated contract {contract_id} for {lot.description if lot else 'Lot'} uploaded to vault.",
            recipient_role="portal",
            event_type="contract_vault_upload"
        )

        # Notify FPO and Buyer
        fpo_name = "FPO"
        if lot and lot.fpo_id:
            fpo_rec = db.query(Fpo).filter(Fpo.id == lot.fpo_id).first()
            if fpo_rec:
                fpo_name = fpo_rec.name
        else:
            fpo_user = db.query(User).filter(User.role_type == RoleType.fpo, User.fpo_id == fpo_id).first()
            if fpo_user:
                fpo_name = fpo_user.name
                
        buyer_name = quote.buyer.name if quote.buyer else f"Buyer {quote.buyer_id}"
        
        # Log dynamically resolved notification contents
        if current_user.role_type == RoleType.fpo:
            fpo_msg = f"You accepted {quote.id} on {quote.lot_id} at ₹{quote.price}/kg. Contract {contract_id} auto-generated."
            buyer_msg = f"Your quote {quote.id} on {quote.lot_id} was accepted! Contract {contract_id} is ready for your eSignature."
        else:
            fpo_msg = f"Buyer {buyer_name} accepted your counter-offer for {quote.id} on {quote.lot_id} at ₹{quote.price}/kg. Contract {contract_id} auto-generated."
            buyer_msg = f"You accepted the counter-offer for quote {quote.id} on {quote.lot_id} at ₹{quote.price}/kg. Contract {contract_id} is ready for your eSignature."
        
        log_notification(db, NotificationChannel.system, fpo_name, fpo_msg, recipient_role="fpo", event_type="quote_accepted")
        log_notification(db, NotificationChannel.email, buyer_name, buyer_msg, recipient_role="buyer", event_type="quote_accepted")
        log_notification(db, NotificationChannel.system, buyer_name, buyer_msg, recipient_role="buyer", event_type="quote_accepted")
        
        # Buyer Notification #7 (System)
        log_notification(db, NotificationChannel.system, buyer_name, f"Contract {contract_id} for {quote.lot_id} is ready. FPO has already signed — your signature is pending.", recipient_role="buyer", event_type="contract_ready_signature")
        
        # FPO Notification #9 (System)
        log_notification(db, NotificationChannel.system, fpo_name, f"Contract {contract_id} generated for {quote.lot_id} — {contract.qty} MT @ ₹{contract.price}/kg, amount ₹{contract.amount}L. eSigned on your behalf.", recipient_role="fpo", event_type="contract_generated")
        
        # Admin Notification #7 (System)
        log_notification(db, NotificationChannel.system, "MahaFPC", f"Contract {contract_id} created — {quote.lot_id}, Buyer: {buyer_name}, FPO: {fpo_name}, Amount ₹{contract.amount}L.", recipient_role="mahafpc", event_type="contract_created")

        return {"status": "accepted", "contractId": contract_id}

    elif body.action == "reject":
        quote.status = QuoteStatus.rejected
        db.commit()

        # Notify FPO and Buyer
        fpo_name = "FPO"
        lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
        if lot and lot.fpo_id:
            fpo_rec = db.query(Fpo).filter(Fpo.id == lot.fpo_id).first()
            if fpo_rec:
                fpo_name = fpo_rec.name
        buyer_name = quote.buyer.name if quote.buyer else f"Buyer {quote.buyer_id}"
        
        if current_user.role_type == RoleType.fpo:
            fpo_msg = f"You rejected {quote.id} on {quote.lot_id}."
            buyer_msg = f"Your quote {quote.id} of ₹{quote.price}/kg on {quote.lot_id} was rejected by the FPO."
        else:
            fpo_msg = f"Buyer {buyer_name} rejected your counter-offer for {quote.id} on {quote.lot_id}."
            buyer_msg = f"You rejected the counter-offer for quote {quote.id} on {quote.lot_id}."

        log_notification(db, NotificationChannel.system, fpo_name, fpo_msg, recipient_role="fpo", event_type="quote_rejected")
        log_notification(db, NotificationChannel.email, buyer_name, buyer_msg, recipient_role="buyer", event_type="quote_rejected")
        log_notification(db, NotificationChannel.system, buyer_name, buyer_msg, recipient_role="buyer", event_type="quote_rejected")

        return {"status": "rejected"}

    elif body.action == "counter":
        if not body.counter_price:
            raise HTTPException(status_code=400, detail="counter_price required for counter action")
        if quote.counter_rounds >= settings.MAX_COUNTER_ROUNDS:
            raise HTTPException(status_code=409, detail=f"Maximum {settings.MAX_COUNTER_ROUNDS} counter rounds reached")
        
        quote.price = body.counter_price
        quote.status = QuoteStatus.counter_offer
        quote.counter_by = CounterBy.fpo
        quote.counter_rounds += 1
        
        lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
        if lot:
            lot.status = LotStatus.counter_offer
        db.commit()

        # Notify FPO and Buyer
        fpo_name = current_user.name
        buyer_name = quote.buyer.name if quote.buyer else f"Buyer {quote.buyer_id}"
        
        # FPO confirms counter sent
        log_notification(db, NotificationChannel.system, fpo_name, f"Counter-offer of ₹{body.counter_price}/kg sent to buyer on lot {quote.lot_id}.", recipient_role="fpo", event_type="counter_offer_sent")
        
        # Buyer Notification #6 (System)
        log_notification(db, NotificationChannel.system, buyer_name, f"FPO countered your offer on {quote.lot_id}: new price ₹{body.counter_price}/kg (Round {quote.counter_rounds} of {settings.MAX_COUNTER_ROUNDS}). {quote.id}.", recipient_role="buyer", event_type="counter_offer_received")

        return {"status": "counter-sent", "newPrice": body.counter_price}

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

    # Notify FPO and Buyer
    fpo_name = lot.fpo.name if lot and lot.fpo else "FPO"
    buyer_name = current_user.name
    
    # FPO Notification #7 (System)
    log_notification(db, NotificationChannel.system, fpo_name, f"Buyer countered on {quote.lot_id}: revised price ₹{body.price}/kg (Round {quote.counter_rounds} of {settings.MAX_COUNTER_ROUNDS}). {quote.id}.", recipient_role="fpo", event_type="counter_offer_received")
    
    # Buyer confirmation (System)
    log_notification(db, NotificationChannel.system, buyer_name, f"Counter-offer of ₹{body.price}/kg sent to FPO for lot {quote.lot_id}.", recipient_role="buyer", event_type="counter_offer_sent")


    return quote_to_dict(quote)
