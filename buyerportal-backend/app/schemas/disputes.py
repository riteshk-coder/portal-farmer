from datetime import datetime
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class DisputeCreateRequest(BaseSchema):
    type: str  # Quality mismatch | Payment delay
    lot_id: str
    description: str

class DisputeResponse(BaseSchema):
    id: str
    type: str
    lot_id: str = Field(..., serialization_alias="lotId")
    buyer_name: str = Field(..., serialization_alias="buyerName")
    fpo_name: str = Field(..., serialization_alias="fpoName")
    description: str
    status: str
    filed_at: datetime = Field(..., serialization_alias="filedAt")

    @field_serializer("filed_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

# Backward-compatible aliases
DisputeCreate = DisputeCreateRequest
