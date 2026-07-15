import json
import logging
from sqlalchemy.orm import Session
from app.models.lot import Lot, LotMatch
from app.models.user import Buyer
from app.core.config import settings
from app.services.matching import run_rule_based_matching
from anthropic import Anthropic

logger = logging.getLogger(__name__)

def run_ai_matching(lot: Lot, db: Session) -> list[LotMatch]:
    """
    Run Claude AI match score calculation for an uploaded turmeric lot.
    Utilizes Anthropic client with strict 2.5s timeout and JSON contract verification.
    Gracefully falls back to rule-based matching on failures, timeouts, or format errors.
    """
    buyers = db.query(Buyer).all()
    if not buyers:
        logger.info("No registered buyers found for matching.")
        return []

    client = None
    if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "mock_key":
        try:
            client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {e}")

    if not client:
        logger.warning("Anthropic client not configured. Falling back to rule-based matching.")
        return run_rule_based_matching(lot, buyers)

    # Construct the candidate buyer list description for the prompt
    buyer_info_list = []
    for b in buyers:
        buyer_location = getattr(b, "location", "Maharashtra") or "Maharashtra"
        buyer_info_list.append(
            f"- Buyer ID: {b.id}, Name: {b.name}, Location: {buyer_location}, "
            f"Reliability Score: {b.reliability_score or 80}%"
        )
    buyers_pool_str = "\n".join(buyer_info_list)

    prompt = f"""
    You are the AI Matchmaker for BuyerPortal (turmeric commodity platform).
    Analyze the compatibility between the following newly uploaded Turmeric Lot and the candidate buyers.
    
    Turmeric Lot:
    - Variety/Commodity: Turmeric
    - Grade: {lot.grade}
    - Curcumin Percent: {lot.curcumin_percent}%
    - Quantity: {lot.qty} MT
    - Location: {lot.location}
    - Price Expectation: ₹{lot.price_expectation}/kg
    - Notes: {lot.notes}

    Candidate Buyers:
    {buyers_pool_str}

    Evaluate each candidate buyer against this lot. Respond ONLY with a valid JSON array of objects.
    Each object MUST have exactly these fields:
    - "buyerId": integer, the buyer's ID
    - "matchScore": integer between 0 and 100 reflecting how likely this buyer is to purchase this lot
    - "suggestedPrice": float (suggested price per kg, should be close to the expected price of {lot.price_expectation})

    Do not include any chat prefix/suffix or markdown formatting. Output raw JSON array ONLY.
    Example:
    [
      {{"buyerId": 1, "matchScore": 88, "suggestedPrice": 135.0}}
    ]
    """

    try:
        # Call Anthropic Claude API with strict 2.5 second timeout
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            timeout=2.5
        )

        content = response.content[0].text.strip()
        
        # Clean markdown codeblocks if AI wraps it
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # Parse JSON
        results = json.loads(content)
        if not isinstance(results, list):
            raise ValueError("AI response is not a JSON array list")

        matches = []
        for item in results:
            # Enforce validation contract
            buyer_id = int(item["buyerId"])
            match_score = int(item["matchScore"])
            suggested_price = float(item["suggestedPrice"])

            if not (0 <= match_score <= 100):
                raise ValueError(f"Invalid matchScore range: {match_score}")

            # Verify buyer exists in current candidates pool
            valid_buyer = next((b for b in buyers if b.id == buyer_id), None)
            if not valid_buyer:
                continue

            match = LotMatch(
                lot_id=lot.id,
                buyer_id=buyer_id,
                match_score=match_score,
                offered_price=round(suggested_price, 2),
                matching_path="ai"
            )
            matches.append(match)

        if not matches:
            raise ValueError("No valid buyer matches could be parsed from AI response.")

        logger.info(f"AI matching completed successfully with {len(matches)} matches.")
        return matches

    except Exception as e:
        logger.warning(f"AI matching failed or timed out ({e}). Falling back to rule-based matching.")
        return run_rule_based_matching(lot, buyers)
