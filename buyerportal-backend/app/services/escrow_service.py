import random
from sqlalchemy.orm import Session
from app.models.contract import Contract, EscrowStatus
from app.models.escrow import LedgerEntry, FarmerSplit, EntryType, SplitStatus
from app.core.config import settings

def generate_txn_id() -> str:
    return f"TXN-{random.randint(10000, 99999)}"

def release_escrow(contract: Contract, db: Session) -> LedgerEntry:
    """
    Called when buyer issues GRN.
    70% released immediately, 30% after 5-day no-objection window.
    For this implementation, releases full amount as 2 separate entries.
    """
    total_amount = contract.amount * 100000
    immediate_amount = total_amount * settings.ESCROW_IMMEDIATE_PERCENT / 100
    final_amount = total_amount * settings.ESCROW_FINAL_PERCENT / 100

    fpo_name = contract.fpo.name if contract.fpo else "FPO"

    # 70% immediate release
    entry1 = LedgerEntry(
        id=generate_txn_id(),
        contract_id=contract.id,
        type=EntryType.debit,
        party=fpo_name,
        amount=immediate_amount
    )
    db.add(entry1)

    # 30% release
    entry2 = LedgerEntry(
        id=generate_txn_id(),
        contract_id=contract.id,
        type=EntryType.debit,
        party=fpo_name,
        amount=final_amount
    )
    db.add(entry2)

    # Update farmer splits to Paid
    splits = db.query(FarmerSplit).filter(FarmerSplit.lot_id == contract.lot_id).all()
    for s in splits:
        s.status = SplitStatus.paid

    # Update contract escrow status
    contract.escrow_status = EscrowStatus.released
    db.commit()
    return entry1
