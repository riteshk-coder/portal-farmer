from datetime import datetime
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class SystemLogResponse(BaseSchema):
    id: str
    channel: str  # WhatsApp | Email | System
    recipient: str
    message: str
    timestamp: datetime

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        # Format date as ISO string
        return dt.isoformat()

class LedgerEntryResponse(BaseSchema):
    id: str
    contract_id: str = Field(..., serialization_alias="contractId")
    type: str  # Credit | Debit
    party: str
    amount: float
    timestamp: datetime

    @field_serializer("amount")
    def serialize_amount(self, val: float) -> float:
        return float(val)

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        return dt.isoformat()

class FarmerSplitResponse(BaseSchema):
    lot_id: str = Field(..., serialization_alias="lotId")
    farmer_name: str = Field(..., serialization_alias="farmerName")
    share_percent: float = Field(..., serialization_alias="sharePercent")
    amount: float
    status: str  # Pending | Paid

    @field_serializer("share_percent", "amount")
    def serialize_numeric(self, val: float) -> float:
        return float(val)
