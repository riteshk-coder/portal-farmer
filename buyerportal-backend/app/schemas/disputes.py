from datetime import datetime
from typing import Optional, List
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class DisputeMessageResponse(BaseSchema):
    id: int
    sender_name: str = Field(..., serialization_alias="senderName")
    sender_role: str = Field(..., serialization_alias="senderRole")
    message: str
    attachment_url: Optional[str] = Field(None, serialization_alias="attachmentUrl")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    @field_serializer("created_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

class DisputeCreateRequest(BaseSchema):
    type: str  # Quality mismatch | Payment delay
    lot_id: str
    description: str
    attachment_url: Optional[str] = Field(None, serialization_alias="attachmentUrl")
    creator_role: Optional[str] = Field(None, serialization_alias="creatorRole")

class DisputeResponse(BaseSchema):
    id: str
    type: str
    lot_id: str = Field(..., serialization_alias="lotId")
    buyer_name: str = Field(..., serialization_alias="buyerName")
    fpo_name: str = Field(..., serialization_alias="fpoName")
    description: str
    status: str
    filed_at: datetime = Field(..., serialization_alias="filedAt")
    creator_role: str = Field(..., serialization_alias="creatorRole")
    attachment_url: Optional[str] = Field(None, serialization_alias="attachmentUrl")
    messages: List[DisputeMessageResponse] = Field([], serialization_alias="messages")

    @field_serializer("filed_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

class DisputeMessageCreate(BaseSchema):
    message: str
    attachment_url: Optional[str] = Field(None, serialization_alias="attachmentUrl")

class DisputeStatusUpdate(BaseSchema):
    status: str

# Backward-compatible aliases
DisputeCreate = DisputeCreateRequest
