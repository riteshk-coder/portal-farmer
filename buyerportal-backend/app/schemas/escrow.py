from pydantic import BaseModel

class LedgerResponse(BaseModel):
    id: str
    contractId: str
    type: str
    party: str
    amount: float
    timestamp: str

class FarmerSplitResponse(BaseModel):
    lotId: str
    farmerName: str
    sharePercent: float
    amount: float
    status: str
