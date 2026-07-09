from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum as SAEnum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class QuoteStatus(str, enum.Enum):
    awaiting_response = "Awaiting response"
    counter_offer = "Counter-offer"
    accepted = "Accepted"
    rejected = "Rejected"
    negotiating = "Negotiating"

class CounterBy(str, enum.Enum):
    fpo = "FPO"
    buyer = "Buyer"

class Quote(Base):
    __tablename__ = "quotes"
    id = Column(String, primary_key=True)  # e.g. QT-201
    lot_id = Column(String, ForeignKey("lots.id"))
    buyer_id = Column(Integer, ForeignKey("buyers.id"))
    price = Column(Float)
    qty = Column(Float)
    status = Column(SAEnum(QuoteStatus), default=QuoteStatus.awaiting_response)
    counter_by = Column(SAEnum(CounterBy), nullable=True)
    message = Column(Text, nullable=True)
    counter_rounds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lot = relationship("Lot", back_populates="quotes")
    buyer = relationship("Buyer")
