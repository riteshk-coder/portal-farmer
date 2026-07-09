from pydantic import BaseModel

class DisputeCreate(BaseModel):
    lotId: str
    type: str  # "Quality mismatch", "Payment delay"
    description: str

class DisputeResponse(BaseModel):
    id: str
    type: str
    lotId: str
    buyerName: str
    fpoName: str
    description: str
    status: str
    filedAt: str
