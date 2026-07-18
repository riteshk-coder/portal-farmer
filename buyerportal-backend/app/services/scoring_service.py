"""
scoring_service.py — BuyerPortal Reliability Score Recalculation

Step 11 of the workflow: scores are SYSTEM-TRIGGERED automatically as side effects
of the buyer's actions (fund-escrow, dispute resolution) and the escrow's action
(release-funds). MahaFPC never manually triggers these updates.

Buyer reliability score range: 0–100 (matches infographic claim; floor is 0, not 40 or 50).
FPO supply rating: integer 0–100.
"""

from sqlalchemy.orm import Session
from app.models.user import Buyer, Fpo


def recalculate_buyer_score(buyer: Buyer, db: Session, action: str) -> None:
    """
    Adjust buyer reliability score based on a performance action.

    Actions and their effects:
      timely_deposit  → +2  (deposit within 48 h of contract creation)
      late_deposit    → -5  (deposit after 48 h deadline; floor: 0)
      dispute_lost    → -10 (dispute resolved against buyer by MahaFPC; floor: 0)

    Score range: 0–100 (infographic claim: 'Buyer score (0–100)').
    """
    if action == "timely_deposit":
        buyer.reliability_score = min(100, buyer.reliability_score + 2)
    elif action == "late_deposit":
        # Floor is 0 to match infographic's stated 0–100 range
        buyer.reliability_score = max(0, buyer.reliability_score - 5)
    elif action == "dispute_lost":
        # Floor is 0 to match infographic's stated 0–100 range
        buyer.reliability_score = max(0, buyer.reliability_score - 10)


def recalculate_fpo_score(fpo: Fpo, db: Session, action: str) -> None:
    """
    Adjust FPO supply rating based on a delivery outcome.

    Actions:
      successful_delivery → +2  (GRN issued and funds released cleanly)
      dispute_lost        → -10 (dispute resolved against FPO; floor: 0)
    """
    if action == "successful_delivery":
        fpo.reliability_score = min(100, fpo.reliability_score + 2)
    elif action == "dispute_lost":
        fpo.reliability_score = max(0, fpo.reliability_score - 10)

