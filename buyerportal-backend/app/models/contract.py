from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class ContractStatus(str, enum.Enum):
    draft = "Draft"
    esign_pending = "eSign pending"
    signed = "Signed"

class EscrowStatus(str, enum.Enum):
    pending_deposit = "Pending Deposit"
    deposited = "Deposited"
    released = "Released"

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(String, primary_key=True)  # e.g. CNT-0091
    lot_id = Column(String, ForeignKey("lots.id"))
    buyer_id = Column(Integer, ForeignKey("buyers.id"))
    fpo_id = Column(Integer, ForeignKey("fpos.id"))
    qty = Column(Float)
    price = Column(Float)
    amount = Column(Float)  # total in Lakhs (₹)
    status = Column(SAEnum(ContractStatus), default=ContractStatus.esign_pending)
    fpo_signed = Column(Boolean, default=False)
    buyer_signed = Column(Boolean, default=False)
    escrow_status = Column(SAEnum(EscrowStatus), default=EscrowStatus.pending_deposit)
    eway_bill = Column(String, nullable=True)
    gps_tracking_id = Column(String, nullable=True)
    gst_invoice = Column(String, nullable=True)
    grn_number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lot = relationship("Lot")
    buyer = relationship("Buyer")
    fpo = relationship("Fpo")
    ledger_entries = relationship("LedgerEntry", back_populates="contract")
