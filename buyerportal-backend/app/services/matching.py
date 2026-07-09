import random
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.trade import Lot, LotMatch, Buyer
from app.models.ops import SystemLog

def calculate_match_score(lot: Lot, buyer: Buyer) -> int:
    """Calculate a matching score (0-100) based on location and simulated parameters."""
    # Commodity match: assume high compatibility for the demo (80-95)
    commodity_score = random.randint(85, 95)
    
    # Distance match: if locations are in the same state, higher score
    lot_state = lot.location.split(",")[-1].strip() if "," in lot.location else lot.location
    buyer_state = buyer.location.split(",")[-1].strip() if "," in buyer.location else buyer.location
    
    if lot_state == buyer_state:
        distance_score = random.randint(90, 100)
    else:
        distance_score = random.randint(65, 80)
        
    # Buyer reliability score (simulated based on name)
    reliability_scores = {
        "R.K. Traders Pvt. Ltd": 92,
        "Spice Exports Ltd": 88,
        "Agmark Foods": 82,
        "NutriTrade Co.": 80
    }
    reliability_score = reliability_scores.get(buyer.name, random.randint(70, 85))
    
    # Weighted score: 40% commodity, 30% distance, 30% reliability
    score = int(0.4 * commodity_score + 0.3 * distance_score + 0.3 * reliability_score)
    return min(100, max(0, score))

def run_matching_simulation(db: Session, lot_id: str):
    """Run matching for a new Lot and create LotMatch records and system logs."""
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        return
        
    # Get all buyers
    buyers = db.query(Buyer).all()
    if not buyers:
        return
        
    # Generate matches
    matches_created = []
    for buyer in buyers:
        score = calculate_match_score(lot, buyer)
        # Only create a match if score is reasonably high (e.g. > 70)
        if score >= 70:
            # Offered price is slightly lower than FPO price expectation (1-5% lower)
            discount = Decimal(str(round(random.uniform(0.01, 0.05), 3)))
            offered_price = lot.price_expectation * (Decimal("1.00") - discount)
            
            match = LotMatch(
                lot_id=lot.id,
                buyer_id=buyer.id,
                match_score=score,
                offered_price=round(offered_price, 2)
            )
            db.add(match)
            matches_created.append(match)
            
    db.commit()
    
    # Update Lot status if matches are found
    if matches_created:
        lot.status = "Matched"
        db.add(lot)
        db.commit()
        
        # Sort matches by score for the log
        matches_created.sort(key=lambda x: x.match_score, reverse=True)
        top_match = matches_created[0]
        top_buyer = db.query(Buyer).filter(Buyer.id == top_match.buyer_id).first()
        
        # Write system logs (System + WhatsApp + Email) to match the demo trail
        log1 = SystemLog(
            id=f"LOG-{random.randint(10000, 99999)}",
            channel="System",
            recipient="AI Matching Core",
            message=f"Scanning buyers for {lot.id} ({lot.qty} MT, {lot.grade}) with price expectation ₹{lot.price_expectation}/kg."
        )
        log2 = SystemLog(
            id=f"LOG-{random.randint(10000, 99999)}",
            channel="WhatsApp",
            recipient=f"+91 99000 12345 ({lot.fpo.name if lot.fpo else 'FPO'})",
            message=f"AI Matching Complete for {lot.id}: {len(matches_created)} buyers matching > 70% found. Top match: {top_buyer.name if top_buyer else 'Buyer'} with {top_match.match_score}% score."
        )
        log3 = SystemLog(
            id=f"LOG-{random.randint(10000, 99999)}",
            channel="Email",
            recipient=f"purchase@{top_buyer.id.lower() if top_buyer else 'buyer'}.in",
            message=f"Alert: New lot {lot.id} meets your procurement requirements. Expected price: ₹{lot.price_expectation}/kg."
        )
        db.add_all([log1, log2, log3])
        db.commit()
