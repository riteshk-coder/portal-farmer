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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_type = Column(SAEnum(RoleType), nullable=False)
    system_role_id = Column(Integer, ForeignKey("system_roles.id"), nullable=True)
    fpo_id = Column(Integer, ForeignKey("fpos.id"), nullable=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True)
    is_active = Column(Boolean, default=True)

class Fpo(Base):
    __tablename__ = "fpos"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String)
    members_count = Column(Integer, default=0)
    grade_conformance = Column(String, default="90%")
    rating = Column(String, default="4.0 / 5.0")
    lots = relationship("Lot", back_populates="fpo")

class Buyer(Base):
    __tablename__ = "buyers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String)
    reliability_score = Column(Integer, default=70)
    payment_days_avg = Column(String, default="3.0 days")
    volume_traded = Column(String, default="0 MT")
