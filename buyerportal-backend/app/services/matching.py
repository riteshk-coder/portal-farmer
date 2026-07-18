import logging
from sqlalchemy.orm import Session
from app.models.lot import Lot, LotMatch
from app.models.user import Buyer

logger = logging.getLogger(__name__)

def filter_buyers_by_preferences(lot: Lot, db: Session) -> list[Buyer]:
    from app.models.user import BuyerProductPreference
    buyers = db.query(Buyer).all()
    filtered_buyers = []
    
    for buyer in buyers:
        prefs = db.query(BuyerProductPreference).filter(BuyerProductPreference.buyer_id == buyer.id).all()
        if not prefs:
            filtered_buyers.append(buyer)
            continue
            
        has_match = False
        if lot.product_type_id is not None:
            for p in prefs:
                if p.product_type_id == lot.product_type_id:
                    has_match = True
                    break
                if p.category_id is not None and p.category_id == lot.category_id:
                    has_match = True
                    break
        elif lot.custom_product_name:
            for p in prefs:
                if p.category_id is not None and p.category_id == lot.category_id:
                    has_match = True
                    break
                if p.product_type_id is not None:
                    from app.models.product_type import ProductType
                    pt = db.query(ProductType).filter(ProductType.id == p.product_type_id).first()
                    if pt and pt.category_id == lot.category_id:
                        has_match = True
                        break
                        
        if has_match:
            filtered_buyers.append(buyer)
            
    return filtered_buyers

# Centralized configurable weights for the rule-based matcher formula
CONFIG_WEIGHTS = {
    "commodity_weight": 0.4,
    "proximity_weight": 0.3,
    "reliability_weight": 0.3
}

def calculate_match_score(lot: Lot, buyer: Buyer) -> int:
    """
    Calculate a match score (0-100) using a weighted rule-based formula.
    """
    # 1. Commodity match (default to high base score 90 since all platform buyers buy turmeric)
    commodity_score = 90
    lot_desc = (lot.description or "").lower()
    
    # Simple keyword heuristic check
    if "premium" in lot_desc and buyer.reliability_score >= 85:
        commodity_score = 95
    elif "low" in lot_desc or "grade b" in lot_desc.lower():
        commodity_score = 80

    # 2. Geographic Proximity: Same state gets 100, different states get 60
    lot_state = lot.location.split(",")[-1].strip().lower() if lot.location and "," in lot.location else (lot.location or "").lower()
    buyer_state = "maharashtra"  # Assume default state for local buyers if location missing
    
    # Extract state from buyer if we can
    # (Since Buyer model has location we can parse it similarly)
    buyer_location = getattr(buyer, "location", "Maharashtra") or "Maharashtra"
    buyer_state = buyer_location.split(",")[-1].strip().lower() if "," in buyer_location else buyer_location.lower()
    
    if lot_state and buyer_state and (lot_state in buyer_state or buyer_state in lot_state):
        proximity_score = 100
    else:
        proximity_score = 60

    # 3. Buyer Reliability: Use the actual reliability score from the database (default to 80 if null)
    reliability_score = buyer.reliability_score if buyer.reliability_score is not None else 80

    # Apply weighted formula
    w_comm = CONFIG_WEIGHTS["commodity_weight"]
    w_prox = CONFIG_WEIGHTS["proximity_weight"]
    w_rel = CONFIG_WEIGHTS["reliability_weight"]

    final_score = int((commodity_score * w_comm) + (proximity_score * w_prox) + (reliability_score * w_rel))
    return min(100, max(0, final_score))

def run_rule_based_matching(lot: Lot, buyers: list[Buyer]) -> list[LotMatch]:
    """
    Execute rule-based matching score generation for all candidate buyers.
    Does not write to database; returns list of scored LotMatch objects.
    """
    matches = []
    for buyer in buyers:
        score = calculate_match_score(lot, buyer)
        
        # Offered price is slightly lower than FPO price expectation (e.g. 4% discount)
        offered_price = round(lot.price_expectation * 0.96, 2)
        
        match = LotMatch(
            lot_id=lot.id,
            buyer_id=buyer.id,
            match_score=score,
            offered_price=offered_price,
            matching_path="rule-based"
        )
        matches.append(match)
        
    return matches
