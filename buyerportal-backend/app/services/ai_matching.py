import json
import logging
from sqlalchemy.orm import Session
from app.models.lot import Lot, LotMatch
from app.models.user import Buyer
from app.core.config import settings
from anthropic import Anthropic

logger = logging.getLogger(__name__)

def run_ai_matching(lot: Lot, db: Session):
    """
    Run Claude AI match score calculation for an uploaded turmeric lot.
    It matches the lot characteristics against registered buyer parameters.
    """
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Anthropic client: {e}")
        client = None

    # Fetch all buyers
    buyers = db.query(Buyer).all()
    if not buyers:
        return

    # Delete any existing matches for this lot
    db.query(LotMatch).filter(LotMatch.lot_id == lot.id).delete()

    for buyer in buyers:
        match_score = 75  # default/fallback score
        offered_price = lot.price_expectation * 0.96  # default/fallback offered price (e.g. 4% discount)

        if client:
            try:
                # Prompt Claude to evaluate the matching percentage and offered price
                prompt = f"""
                You are the AI Matchmaker for BuyerPortal (turmeric commodity platform).
                Analyze the compatibility between this Turmeric Lot and Buyer:

                Turmeric Lot:
                - Description: {lot.description}
                - Grade: {lot.grade}
                - Expected Price: ₹{lot.price_expectation}/kg
                - Curcumin Percent: {lot.curcumin_percent}%
                - Location: {lot.location}
                - Notes: {lot.notes}

                Buyer Profile:
                - Name: {buyer.name}
                - Reliability Score: {buyer.reliability_score}%
                - Average Payment Terms: {buyer.payment_days_avg}
                - Total Volume Traded: {buyer.volume_traded}

                Generate a JSON response containing:
                1. "matchScore": an integer from 50 to 98 reflecting how likely this buyer is to purchase this lot.
                2. "offeredPrice": a float offered price per kg (should be between 90% and 105% of the expected price, e.g. between {lot.price_expectation * 0.9} and {lot.price_expectation * 1.05}).

                Respond ONLY with a valid JSON block, e.g.:
                {{"matchScore": 88, "offeredPrice": 131.5}}
                """

                response = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=100,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.0
                )
                content = response.content[0].text.strip()
                # Parse JSON
                data = json.loads(content)
                match_score = int(data.get("matchScore", match_score))
                offered_price = float(data.get("offeredPrice", offered_price))
            except Exception as e:
                logger.error(f"Claude AI matching error for buyer {buyer.id}: {e}")

        # Add Match Entry
        match_entry = LotMatch(
            lot_id=lot.id,
            buyer_id=buyer.id,
            match_score=match_score,
            offered_price=round(offered_price, 2)
        )
        db.add(match_entry)

    db.commit()
