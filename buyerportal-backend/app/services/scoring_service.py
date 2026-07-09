from sqlalchemy.orm import Session
from app.models.user import Buyer

def recalculate_buyer_score(buyer: Buyer, db: Session, action: str):
    """
    Recalculate reliability score based on performance actions:
    e.g. timely deposit (+2), grace period deposit (+0), late deposit (-5), unresolved dispute (-10).
    """
    if action == "timely_deposit":
        buyer.reliability_score = min(100, buyer.reliability_score + 2)
    elif action == "late_deposit":
        buyer.reliability_score = max(50, buyer.reliability_score - 5)
    elif action == "dispute_lost":
        buyer.reliability_score = max(40, buyer.reliability_score - 10)
    db.commit()
