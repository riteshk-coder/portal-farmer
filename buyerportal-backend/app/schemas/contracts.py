from typing import Optional
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class ContractSignRequest(BaseSchema):
    method: str  # esign | dsc

class ContractResponse(BaseSchema):
    id: str
    lot_id: str = Field(..., serialization_alias="lotId")
    lot_description: str = Field(..., serialization_alias="lotDescription")
    buyer_name: str = Field(..., serialization_alias="buyerName")
    fpo_name: str = Field(..., serialization_alias="fpoName")
    qty: float
    price: float
    amount: float  # In lakhs
    status: str
    fpo_signed: bool = Field(..., serialization_alias="fpoSigned")
    buyer_signed: bool = Field(..., serialization_alias="buyerSigned")
    escrow_status: str = Field(..., serialization_alias="escrowStatus")
    eway_bill: Optional[str] = Field(None, serialization_alias="ewayBill")
    gps_tracking_id: Optional[str] = Field(None, serialization_alias="gpsTrackingId")
    gst_invoice: Optional[str] = Field(None, serialization_alias="gstInvoice")
    grn_number: Optional[str] = Field(None, serialization_alias="grnNumber")

    @field_serializer("price", "qty")
    def serialize_numeric(self, val: float) -> float:
        return float(val)

    @field_serializer("amount")
    def serialize_amount_lakhs(self, amount: float) -> float:
        # Convert total ₹ value from DB to Lakhs (₹ / 100,000) for the frontend response
        return float(amount) / 100000.0

# Backward-compatible aliases
SignRequest = ContractSignRequest

