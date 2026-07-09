import random
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.trade import Quote, Lot, Contract, Buyer, Fpo
from app.models.ops import LedgerEntry, FarmerSplit, SystemLog

def create_contract_from_quote(db: Session, quote: Quote) -> Contract:
    """Auto-generate a Contract in Draft status linked to the quote's lot/buyer/fpo."""
    lot = db.query(Lot).filter(Lot.id == quote.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found for quote")

    # Generate a unique contract ID, e.g., CNT-0092
    attempts = 0
    contract_id = f"CNT-00{random.randint(90, 99)}"
    while db.query(Contract).filter(Contract.id == contract_id).first() and attempts < 100:
        contract_id = f"CNT-00{random.randint(90, 99)}"
        attempts += 1

    # amount = qty_kg * price
    # qty is in MT, so qty * 1000 is in kg
    qty_kg = quote.qty * Decimal("1000")
    total_amount = qty_kg * quote.price

    # Accept the quote
    quote.status = "Accepted"
    db.add(quote)

    contract = Contract(
        id=contract_id,
        lot_id=quote.lot_id,
        buyer_id=quote.buyer_id,
        fpo_id=lot.fpo_id,
        qty=quote.qty,
        price=quote.price,
        amount=total_amount,
        status="Draft",
        fpo_signed=False,
        buyer_signed=False,
        escrow_status="Pending Deposit"
    )
    
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract

def fund_escrow(db: Session, contract: Contract) -> Contract:
    """Deposit funds into escrow for a signed contract. Generates e-Way bill, GPS ID, and GST invoice."""
    if contract.status != "Signed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Contract must be fully Signed before funding escrow."
        )

    if contract.escrow_status != "Pending Deposit":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Escrow is already in state '{contract.escrow_status}'."
        )

    # Enforce 48-hour deposit window
    if contract.signed_at:
        elapsed = datetime.utcnow() - contract.signed_at
        if elapsed > timedelta(hours=48):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Escrow funding window (48 hours after signing) has expired."
            )

    # Update Escrow & Lot statuses
    contract.escrow_status = "Deposited"
    
    # Auto-generate dispatch details (Step 08)
    contract.eway_bill = f"EWAY-{random.randint(100000, 999999)}"
    contract.gps_tracking_id = f"GPS-{random.randint(100000, 999999)}"
    contract.gst_invoice = f"INV-{random.randint(100000, 999999)}"

    lot = db.query(Lot).filter(Lot.id == contract.lot_id).first()
    if lot:
        lot.status = "Dispatched"
        db.add(lot)

    # Create Ledger Entry for Credit
    ledger_id = f"TXN-{random.randint(9000, 9999)}"
    credit_entry = LedgerEntry(
        id=ledger_id,
        contract_id=contract.id,
        type="Credit",
        party=contract.buyer.name if contract.buyer else "Buyer",
        amount=contract.amount,
        timestamp=datetime.utcnow()
    )
    db.add(credit_entry)

    # Create System Log
    sys_log = SystemLog(
        id=f"LOG-{random.randint(10000, 99999)}",
        channel="System",
        recipient="Escrow Ledger",
        message=f"Funds of ₹{float(contract.amount)/100000:.2f}L deposited into escrow under {contract.id}. Shipment transit initialized with e-Way Bill {contract.eway_bill} and GPS tracking enabled."
    )
    db.add(sys_log)

    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract

def release_escrow_funds(db: Session, contract: Contract) -> Contract:
    """Release escrow funds: 70% immediately, 30% after 5 days. Generates GRN and updates reliability ratings."""
    if contract.escrow_status != "Deposited":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Escrow funds must be Deposited before they can be released."
        )

    # Update contract status
    contract.escrow_status = "Released"
    
    # Auto-generate GRN number (Step 09)
    contract.grn_number = f"GRN-{random.randint(100000, 999999)}"
    db.add(contract)

    # Update Lot status to GRN Issued / Delivered
    lot = db.query(Lot).filter(Lot.id == contract.lot_id).first()
    if lot:
        lot.status = "GRN Issued"
        db.add(lot)

    # Increment reliability scores (Step 11)
    if contract.fpo:
        contract.fpo.reliability_score = min(100, contract.fpo.reliability_score + 2)
        db.add(contract.fpo)
    if contract.buyer:
        contract.buyer.reliability_score = min(100, contract.buyer.reliability_score + 2)
        db.add(contract.buyer)

    # Calculate Farmer Splits
    farmers = [
        ("Ramesh Patil", Decimal("0.28")),
        ("Suresh Jadhav", Decimal("0.22")),
        ("Priya Kulkarni", Decimal("0.17")),
        ("Ganesh More", Decimal("0.33"))
    ]

    # Create Farmer Splits (representing full shares, set status to Paid)
    for name, percent in farmers:
        farmer_amount = contract.amount * percent
        split = FarmerSplit(
            lot_id=contract.lot_id,
            farmer_name=name,
            share_percent=percent * Decimal("100"),
            amount=farmer_amount,
            status="Paid"
        )
        db.add(split)

    # Create Ledger Entry for immediate 70% release (Debit)
    immediate_amount = contract.amount * Decimal("0.70")
    tx1_id = f"TXN-{random.randint(9000, 9999)}"
    debit_entry_70 = LedgerEntry(
        id=tx1_id,
        contract_id=contract.id,
        type="Debit",
        party=contract.fpo.name if contract.fpo else "FPO",
        amount=immediate_amount,
        timestamp=datetime.utcnow()
    )
    db.add(debit_entry_70)

    # Create Ledger Entry for 30% release (Debit - simulated after 5-day window)
    remaining_amount = contract.amount * Decimal("0.30")
    tx2_id = f"TXN-{random.randint(9000, 9999)}"
    debit_entry_30 = LedgerEntry(
        id=tx2_id,
        contract_id=contract.id,
        type="Debit",
        party=contract.fpo.name if contract.fpo else "FPO",
        amount=remaining_amount,
        timestamp=datetime.utcnow() + timedelta(days=5)
    )
    db.add(debit_entry_30)

    # Create System Logs
    log1 = SystemLog(
        id=f"LOG-{random.randint(10000, 99999)}",
        channel="System",
        recipient="Bank Gateway",
        message=f"Escrow funds of ₹{float(contract.amount)/100000:.2f}L disbursed (70% immediate on {contract.grn_number}, 30% scheduled after 5-day no-objection window). Splits released to farmers."
    )
    log2 = SystemLog(
        id=f"LOG-{random.randint(10000, 99999)}",
        channel="System",
        recipient="Escrow Ledger",
        message=f"Funds released to FPO {contract.fpo.name if contract.fpo else ''}. FPO and Buyer reliability ratings increased by +2."
    )
    db.add_all([log1, log2])

    db.commit()
    db.refresh(contract)
    return contract

