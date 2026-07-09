from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class EntryType(str, enum.Enum):
    credit = "Credit"
    debit = "Debit"

class SplitStatus(str, enum.Enum):
    pending = "Pending"
    paid = "Paid"

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id = Column(String, primary_key=True)  # e.g. TXN-9021
    contract_id = Column(String, ForeignKey("contracts.id"))
    type = Column(SAEnum(EntryType))
    party = Column(String)
    amount = Column(Float)  # in ₹
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    contract = relationship("Contract", back_populates="ledger_entries")

class FarmerSplit(Base):
    __tablename__ = "farmer_splits"
    id = Column(Integer, primary_key=True)
    lot_id = Column(String, ForeignKey("lots.id"))
    farmer_name = Column(String)
    share_percent = Column(Float)
    amount = Column(Float)  # in ₹
    status = Column(SAEnum(SplitStatus), default=SplitStatus.pending)
