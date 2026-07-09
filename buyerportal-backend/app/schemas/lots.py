from datetime import datetime
from typing import List, Optional
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class LotMatchResponse(BaseSchema):
    buyer_name: str
    match_score: int
    offered_price: float

    @field_serializer("offered_price")
    def serialize_price(self, price: float) -> float:
        return float(price)

class LotCreateRequest(BaseSchema):
    description: str
    variety: Optional[str] = Field(None, description="Turmeric variety e.g. Erode finger, Salem bulb")
    qty: float = Field(..., description="Quantity in metric tonnes")
    grade: str
    curcumin: Optional[float] = Field(None, description="Curcumin percentage")
    price_expectation: float = Field(..., description="Expected price in ₹ per kg")
    location: str
    harvest_date: Optional[datetime] = Field(None, description="Harvest date")
    notes: Optional[str] = Field(None, description="Additional notes")
    lab_report_url: Optional[str] = Field(None, description="Lab test report URL")

class LotResponse(BaseSchema):
    id: str
    description: str
    variety: Optional[str] = None
    qty: float
    grade: str
    curcumin: Optional[float] = None
    status: str
    price_expectation: float = Field(..., serialization_alias="priceExpectation")
    location: str
    harvest_date: Optional[datetime] = Field(None, serialization_alias="harvestDate")
    notes: Optional[str] = None
    lab_report_url: Optional[str] = Field(None, serialization_alias="labReportUrl")
    fpo_name: str = Field(..., serialization_alias="fpoName")
    created_at: datetime = Field(..., serialization_alias="createdAt")
    matches: Optional[List[LotMatchResponse]] = None

    @field_serializer("qty")
    def serialize_qty(self, qty: float) -> float:
        return float(qty)

    @field_serializer("price_expectation")
    def serialize_price(self, price: float) -> float:
        return float(price)

    @field_serializer("curcumin")
    def serialize_curcumin(self, val: Optional[float]) -> Optional[float]:
        return float(val) if val is not None else None

    @field_serializer("harvest_date")
    def serialize_harvest_date(self, dt: Optional[datetime]) -> Optional[str]:
        return dt.date().isoformat() if dt is not None else None

    @field_serializer("created_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

