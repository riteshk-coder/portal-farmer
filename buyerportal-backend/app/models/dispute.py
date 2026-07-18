import enum
from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SAEnum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DisputeType(str, enum.Enum):
    quality_mismatch = "Quality mismatch"
    payment_delay = "Payment delay"

class DisputeStatus(str, enum.Enum):
    open = "Open"
    in_review = "In Review"
    resolved = "Resolved"
    rejected = "Rejected"
    review = "Review"
    pending = "Pending"

class Dispute(Base):
    __tablename__ = "disputes"
    id = Column(String, primary_key=True)  # e.g. DSP-004
    type = Column(SAEnum(DisputeType))
    lot_id = Column(String, ForeignKey("lots.id"))
    buyer_id = Column(Integer, ForeignKey("buyers.id"))
    fpo_id = Column(Integer, ForeignKey("fpos.id"))
    description = Column(Text)
    status = Column(SAEnum(DisputeStatus), default=DisputeStatus.open)
    filed_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    creator_role = Column(String, default="buyer")
    attachment_url = Column(String, nullable=True)

    buyer = relationship("Buyer")
    fpo = relationship("Fpo")
    messages = relationship("DisputeMessage", back_populates="dispute", order_by="DisputeMessage.created_at", cascade="all, delete-orphan")

class DisputeMessage(Base):
    __tablename__ = "dispute_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    dispute_id = Column(String, ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_role = Column(String, nullable=False)  # "buyer", "fpo", "mahafpc", etc.
    message = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User")
    dispute = relationship("Dispute", back_populates="messages")
