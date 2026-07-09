from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, index=True)  # e.g., "DSP-004"
    type = Column(String, nullable=False)  # Quality mismatch | Payment delay
    lot_id = Column(String, ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(String, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False)
    fpo_id = Column(String, ForeignKey("fpos.id", ondelete="CASCADE"), nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="Review")  # Review | Pending | Resolved
    filed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="disputes")
    buyer = relationship("Buyer")
    fpo = relationship("Fpo")

class FarmerSplit(Base):
    __tablename__ = "farmer_splits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lot_id = Column(String, ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)
    farmer_name = Column(String, nullable=False)
    share_percent = Column(Numeric(5, 2), nullable=False)  # e.g. 28.00
    amount = Column(Numeric(12, 2), nullable=False)  # split amount in ₹
    status = Column(String, default="Pending")  # Pending | Paid

    # Relationships
    lot = relationship("Lot", back_populates="splits")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(String, primary_key=True, index=True)  # e.g., "TXN-9021"
    contract_id = Column(String, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # Credit | Debit
    party = Column(String, nullable=False)  # Party involved
    amount = Column(Numeric(12, 2), nullable=False)  # value in ₹
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    contract = relationship("Contract", back_populates="ledger_entries")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(String, primary_key=True, index=True)  # e.g. "LOG-001" or random
    channel = Column(String, nullable=False)  # WhatsApp | Email | System
    recipient = Column(String, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
