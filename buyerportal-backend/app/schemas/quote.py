from pydantic import BaseModel
from typing import Optional

class QuoteCreate(BaseModel):
    lotId: str
    price: float
    qty: float
    message: Optional[str] = None

class QuoteResponse(BaseModel):
    id: str
    lotId: str
    lotDescription: str
    buyerName: str
    price: float
    qty: float
    status: str
    counterBy: Optional[str] = None
    message: Optional[str] = None
    counterRounds: int

class QuoteResponseAction(BaseModel):
    action: str  # "accept", "reject", "counter"
    counterPrice: Optional[float] = None

class BuyerCounter(BaseModel):
    price: float
    message: Optional[str] = None
