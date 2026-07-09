from pydantic import BaseModel
from typing import Optional, List

class MatchResponse(BaseModel):
    buyerName: str
    matchScore: int
    offeredPrice: float

class LotResponse(BaseModel):
    id: str
    description: str
    qty: float
    grade: str
    status: str
    priceExpectation: float
    location: str
    curcuminPercent: Optional[float] = None
    harvestDate: Optional[str] = None
    notes: Optional[str] = None
    fpoName: str
    createdAt: str
    matches: List[MatchResponse] = []
