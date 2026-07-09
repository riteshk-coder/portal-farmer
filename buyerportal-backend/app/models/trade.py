from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class Fpo(Base):
    __tablename__ = "fpos"

    id = Column(String, primary_key=True, index=True)  # e.g., "FPO-NASHIK"
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    reliability_score = Column(Integer, default=80)

    # Relationships
    lots = relationship("Lot", back_populates="fpo")
    contracts = relationship("Contract", back_populates="fpo")

class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(String, primary_key=True, index=True)  # e.g., "BUYER-RK"
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    reliability_score = Column(Integer, default=80)

    # Relationships
    matches = relationship("LotMatch", back_populates="buyer")
    quotes = relationship("Quote", back_populates="buyer")
    contracts = relationship("Contract", back_populates="buyer")

class Lot(Base):
    __tablename__ = "lots"

    id = Column(String, primary_key=True, index=True)  # e.g., "LOT-2841"
    description = Column(String, nullable=False)
    variety = Column(String, nullable=True)  # e.g., "Erode finger", "Salem bulb"
    qty = Column(Numeric(10, 2), nullable=False)  # in MT
    grade = Column(String, nullable=False)
    curcumin = Column(Numeric(4, 2), nullable=True)  # curcumin percentage
    status = Column(String, default="Pending match")  # Matched | Quoting | Pending match | Counter-offer | Dispatched | Delivered | GRN Issued
    price_expectation = Column(Numeric(10, 2), nullable=False)  # in ₹/kg
    location = Column(String, nullable=False)
    harvest_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    lab_report_url = Column(String, nullable=True)
    fpo_id = Column(String, ForeignKey("fpos.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    fpo = relationship("Fpo", back_populates="lots")
    matches = relationship("LotMatch", back_populates="lot", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="lot", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="lot", cascade="all, delete-orphan")
    splits = relationship("FarmerSplit", back_populates="lot", cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="lot", cascade="all, delete-orphan")

class LotMatch(Base):
    __tablename__ = "lot_matches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lot_id = Column(String, ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(String, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Integer, nullable=False)  # 0-100
    offered_price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="matches")
    buyer = relationship("Buyer", back_populates="matches")

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, index=True)  # e.g., "QT-201"
    lot_id = Column(String, ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(String, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)  # in ₹/kg
    qty = Column(Numeric(10, 2), nullable=False)  # in MT
    status = Column(String, default="Awaiting response")  # Awaiting response | Counter-offer | Accepted | Rejected | Negotiating
    counter_by = Column(String, nullable=True)  # FPO | Buyer | None
    counter_round = Column(Integer, default=0)
    message = Column(String, nullable=True)

    # Relationships
    lot = relationship("Lot", back_populates="quotes")
    buyer = relationship("Buyer", back_populates="quotes")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, index=True)  # e.g., "CNT-0091"
    lot_id = Column(String, ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(String, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False)
    fpo_id = Column(String, ForeignKey("fpos.id", ondelete="CASCADE"), nullable=False)
    qty = Column(Numeric(10, 2), nullable=False)  # in MT
    price = Column(Numeric(10, 2), nullable=False)  # in ₹/kg
    amount = Column(Numeric(12, 2), nullable=False)  # total contract value in ₹
    status = Column(String, default="Draft")  # Draft | eSign pending | Signed
    fpo_signed = Column(Boolean, default=False)
    buyer_signed = Column(Boolean, default=False)
    escrow_status = Column(String, default="Pending Deposit")  # Pending Deposit | Deposited | Released
    signed_at = Column(DateTime, nullable=True)
    eway_bill = Column(String, nullable=True)
    gps_tracking_id = Column(String, nullable=True)
    gst_invoice = Column(String, nullable=True)
    grn_number = Column(String, nullable=True)

    # Relationships
    lot = relationship("Lot", back_populates="contracts")
    buyer = relationship("Buyer", back_populates="contracts")
    fpo = relationship("Fpo", back_populates="contracts")
    ledger_entries = relationship("LedgerEntry", back_populates="contract", cascade="all, delete-orphan")
