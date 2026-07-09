from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.trade import Quote, Lot
from app.models.user import User

def validate_and_increment_counter(db: Session, quote: Quote, user: User) -> Quote:
    """Validate counter offer business rules (max 3 rounds) and update quote state."""
    # Ensure current quote status allows countering
    if quote.status not in ["Awaiting response", "Counter-offer", "Negotiating"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot counter quote with status '{quote.status}'. It must be in negotiation state."
        )

    # 3-Round counter-offer limit check
    if quote.counter_round >= 3:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Counter-offer limit reached. You can counter up to 3 rounds. Please accept or reject the current offer."
        )

    # Determine counter party
    counter_by = "FPO" if user.role_type == "fpo" else "Buyer"
    
    # Increment counter round
    quote.counter_round += 1
    quote.counter_by = counter_by
    quote.status = "Counter-offer"
    
    # Update lot status to match
    lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
    if lot:
        lot.status = "Counter-offer"
        db.add(lot)
        
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote
