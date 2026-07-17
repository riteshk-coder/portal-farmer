from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum as SAEnum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class LotStatus(str, enum.Enum):
    pending_match = "Pending match"
    matched = "Matched"
    quoting = "Quoting"
    counter_offer = "Counter-offer"
    dispatched = "Dispatched"
    delivered = "Delivered"
    grn_issued = "GRN Issued"

class Lot(Base):
    __tablename__ = "lots"
    id = Column(String, primary_key=True)  # e.g. LOT-2841
    description = Column(String, nullable=False)
    qty = Column(Float, nullable=False)  # in MT
    grade = Column(String, nullable=False)
    status = Column(SAEnum(LotStatus), default=LotStatus.pending_match)
    price_expectation = Column(Float, nullable=False)
    location = Column(String)
    curcumin_percent = Column(Float, nullable=True)
    harvest_date = Column(String, nullable=True)
    available_date = Column(String, nullable=True)
    variety = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    fpo_id = Column(Integer, ForeignKey("fpos.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    fpo = relationship("Fpo", back_populates="lots")
    matches = relationship("LotMatch", back_populates="lot", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="lot")

class LotMatch(Base):
    __tablename__ = "lot_matches"
    id = Column(Integer, primary_key=True)
    lot_id = Column(String, ForeignKey("lots.id"))
    buyer_id = Column(Integer, ForeignKey("buyers.id"))
    match_score = Column(Integer)  # 0-100
    offered_price = Column(Float)
    matching_path = Column(String, nullable=True) # "ai" or "rule-based"
    lot = relationship("Lot", back_populates="matches")
    buyer = relationship("Buyer")
