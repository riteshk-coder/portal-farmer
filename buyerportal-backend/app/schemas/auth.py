from pydantic import BaseModel
from typing import Optional

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    userId: int
    name: str

class UserRegisterRequest(BaseModel):
    role: str
    fullName: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    companyName: Optional[str] = None
    businessType: Optional[str] = None
    gstin: Optional[str] = None
    fpoRegNumber: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    associatedFpo: Optional[str] = None
    idProof: Optional[str] = None
    employeeId: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    google_token: str
    role: str

class OtpSendRequest(BaseModel):
    mobile_number: str
    purpose: str

class OtpVerifyRequest(BaseModel):
    mobile_number: str
    otp: str
    purpose: str

class AdminInviteRequest(BaseModel):
    email: str
    employee_id: str

class AddMemberRequest(BaseModel):
    name: str
    email: str
    role: str

class CompanyMemberResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
