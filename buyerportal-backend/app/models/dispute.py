from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SAEnum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class DisputeType(str, enum.Enum):
    quality_mismatch = "Quality mismatch"
    payment_delay = "Payment delay"

class DisputeStatus(str, enum.Enum):
    review = "Review"
    pending = "Pending"
    resolved = "Resolved"

class Dispute(Base):
    __tablename__ = "disputes"
    id = Column(String, primary_key=True)  # e.g. DSP-004
    type = Column(SAEnum(DisputeType))
    lot_id = Column(String, ForeignKey("lots.id"))
    buyer_id = Column(Integer, ForeignKey("buyers.id"))
    fpo_id = Column(Integer, ForeignKey("fpos.id"))
    description = Column(Text)
    status = Column(SAEnum(DisputeStatus), default=DisputeStatus.review)
    filed_at = Column(DateTime(timezone=True), server_default=func.now())
    buyer = relationship("Buyer")
    fpo = relationship("Fpo")
