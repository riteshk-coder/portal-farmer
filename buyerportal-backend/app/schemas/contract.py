from pydantic import BaseModel
from typing import Optional

class ContractResponse(BaseModel):
    id: str
    lotId: str
    lotDescription: str
    buyerName: str
    fpoName: str
    qty: float
    price: float
    amount: float
    status: str
    fpoSigned: bool
    buyerSigned: bool
    escrowStatus: str
    ewayBill: Optional[str] = None
    gpsTrackingId: Optional[str] = None
    gstInvoice: Optional[str] = None
    grnNumber: Optional[str] = None

class SignRequest(BaseModel):
    method: str  # "esign", "dsc"
