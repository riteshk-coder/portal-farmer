from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class RoleType(str, enum.Enum):
    fpo = "fpo"
    buyer = "buyer"
    mahafpc = "mahafpc"
    escrow = "escrow"
    portal = "portal"
    admin = "admin"
    consultant = "consultant"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    role_type = Column(SAEnum(RoleType), nullable=False)
    system_role_id = Column(Integer, ForeignKey("system_roles.id"), nullable=True)
    fpo_id = Column(Integer, ForeignKey("fpos.id"), nullable=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True)
    consultant_id = Column(Integer, ForeignKey("consultants.id"), nullable=True)
    mobile = Column(String, unique=True, index=True, nullable=True)
    employee_id = Column(String, nullable=True)
    employee_role = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    member_status = Column(String, default="Pending", nullable=True)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    invite_token = Column(String, nullable=True)

class Fpo(Base):
    __tablename__ = "fpos"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String)
    members_count = Column(Integer, default=0)
    grade_conformance = Column(String, default="90%")
    rating = Column(String, default="4.0 / 5.0")
    reliability_score = Column(Integer, default=70)
    lots = relationship("Lot", back_populates="fpo")
    farmers = relationship("Farmer", back_populates="fpo")
    
    # Extended fields
    fpo_registration_number = Column(String, nullable=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    village = Column(String, nullable=True)
    bank_account_num = Column(String, nullable=True)
    bank_ifsc = Column(String, nullable=True)

class Buyer(Base):
    __tablename__ = "buyers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String)
    reliability_score = Column(Integer, default=70)
    payment_days_avg = Column(String, default="3.0 days")
    volume_traded = Column(String, default="0 MT")
    
    # Extended fields
    company_name = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    gstin = Column(String, nullable=True)

class Consultant(Base):
    __tablename__ = "consultants"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile = Column(String, nullable=True)
    associated_fpos = Column(String, nullable=True)
    id_proof_url = Column(String, nullable=True)

class AdminInvite(Base):
    __tablename__ = "admin_invites"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    employee_id = Column(String, nullable=False)
    invited_at = Column(String, nullable=False)

class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    company = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
