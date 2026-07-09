from typing import Optional
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class QuoteCreateRequest(BaseSchema):
    lot_id: str
    price: float = Field(..., description="Bidding price in ₹/kg")
    qty: float = Field(..., description="Bidding quantity in MT")
    message: Optional[str] = None

class QuoteCounterRequest(BaseSchema):
    price: float = Field(..., description="Counter price in ₹/kg")
    message: Optional[str] = None

class QuoteRespondRequest(BaseSchema):
    action: str = Field(..., description="Action to perform: accept, reject, counter")
    counter_price: Optional[float] = Field(None, description="Counter price in ₹/kg, required if action is 'counter'")

class QuoteResponse(BaseSchema):
    id: str
    lot_id: str = Field(..., serialization_alias="lotId")
    lot_description: str = Field(..., serialization_alias="lotDescription")
    buyer_name: str = Field(..., serialization_alias="buyerName")
    price: float
    qty: float
    status: str
    counter_by: Optional[str] = Field(None, serialization_alias="counterBy")
    message: Optional[str] = None

    @field_serializer("price", "qty")
    def serialize_numeric(self, val: float) -> float:
        return float(val)
