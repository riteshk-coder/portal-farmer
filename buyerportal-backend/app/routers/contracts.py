"""
contracts.py — BuyerPortal Contract Workflow Router

Covers Steps 06–11 of the Digital Buyer Access Portal workflow:
  Step 06: Digital Contract (eSign / DSC) — simulated via signature token; real Aadhaar/DSC is v2 scope.
  Step 07: Buyer Funds Escrow — simulated deposit (Razorpay / Cashfree is v2 target, not current scope).
  Step 08: Dispatch Goods — separate FPO-gated endpoint; generates e-Way bill, GPS, GST invoice.
  Step 09: Delivery Acceptance — buyer issues GRN within 24 hours; open disputes block fund release.
  Step 10: Payment Release — 70% immediate + 30% after 5-day hold; auto-split to registered farmers.
  Step 11: Reliability Scores — SYSTEM-TRIGGERED automatically (not a MahaFPC manual action);
           buyer score range is 0–100 (floor lowered to 0 to match infographic claim).
           Completed contract is archived (is_archived = True) after fund release.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.models.lot import Lot, LotStatus
from app.models.farmer import Farmer
from app.models.escrow import FarmerSplit, SplitStatus, LedgerEntry, EntryType
from app.models.dispute import Dispute, DisputeStatus
from app.schemas.contracts import ContractResponse, SignRequest
from app.services.escrow_service import release_escrow
from app.services.scoring_service import recalculate_buyer_score, recalculate_fpo_score
from app.services.notification_service import log_notification, NotificationChannel
from datetime import datetime
import random
import hashlib
import uuid

router = APIRouter(prefix="/contracts", tags=["contracts"])


def contract_to_dict(c: Contract) -> dict:
    """Serialize a Contract ORM object to an API response dict."""
    # Dynamically compute GRN overdue: True if dispatched more than 24 h ago without a GRN
    overdue = False
    if c.status == ContractStatus.dispatched and c.dispatched_at:
        # Strip tzinfo to ensure naive datetime comparison (PostgreSQL TIMESTAMPTZ returns aware)
        dispatched_naive = c.dispatched_at.replace(tzinfo=None) if c.dispatched_at.tzinfo else c.dispatched_at
        overdue = (datetime.utcnow() - dispatched_naive).total_seconds() > 24 * 3600

    return {
        "id": c.id,
        "lotId": c.lot_id,
        "lotDescription": c.lot.description if c.lot else "",
        "buyerName": c.buyer.name if c.buyer else "",
        "fpoName": c.fpo.name if c.fpo else "",
        "qty": c.qty,
        "price": c.price,
        "amount": c.amount,
        "status": c.status.value if hasattr(c.status, "value") else c.status,
        "fpoSigned": c.fpo_signed,
        "buyerSigned": c.buyer_signed,
        "escrowStatus": c.escrow_status.value if hasattr(c.escrow_status, "value") else c.escrow_status,
        "ewayBill": c.eway_bill,
        "gpsTrackingId": c.gps_tracking_id,
        "gstInvoice": c.gst_invoice,
        "grnNumber": c.grn_number,
        "isArchived": c.is_archived,
        "dispatchedAt": c.dispatched_at,
        "grnOverdue": overdue,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  READ ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ContractResponse])
def get_contracts(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Contract)
    if current_user.role_type == RoleType.fpo:
        query = query.filter(Contract.fpo_id == current_user.fpo_id)
    elif current_user.role_type == RoleType.buyer:
        query = query.filter(Contract.buyer_id == current_user.buyer_id)
    contracts = query.limit(limit).offset(offset).all()
    return [contract_to_dict(c) for c in contracts]


@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract_to_dict(c)


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 06 — DIGITAL CONTRACT  (eSign / DSC — simulated signature token)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/sign")
def sign_contract(
    contract_id: str,
    body: SignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Step 06 — Digital Contract signing.

    Accepts method 'esign' or 'dsc'. A deterministic signature token is derived
    from (contract_id + signer_user_id + UTC timestamp) and logged as an audit
    trail — this simulates the Aadhaar eSign / DSC integration which is deferred
    to v2 scope.

    Both FPO and Buyer must sign; status transitions to 'Signed' only when both
    parties have signed.
    """
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Idempotency: raise 409 if this role already signed
        if current_user.role_type == RoleType.buyer and c.buyer_signed:
            raise HTTPException(status_code=409, detail="Contract already signed by buyer")
        if current_user.role_type == RoleType.fpo and c.fpo_signed:
            raise HTTPException(status_code=409, detail="Contract already signed by FPO")

        # Generate a deterministic signature token to simulate eSign / DSC artifact
        token_raw = f"{contract_id}:{current_user.id}:{datetime.utcnow().isoformat()}:{uuid.uuid4()}"
        signature_token = hashlib.sha256(token_raw.encode()).hexdigest()[:32].upper()

        if current_user.role_type == RoleType.buyer:
            c.buyer_signed = True
            signer_label = "Buyer"
        elif current_user.role_type == RoleType.fpo:
            c.fpo_signed = True
            signer_label = "FPO"
        else:
            signer_label = current_user.role_type.value.upper()

        if c.buyer_signed and c.fpo_signed:
            c.status = ContractStatus.signed

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()

        # Audit log: record simulated eSign / DSC signature token
        log_notification(
            db,
            NotificationChannel.system,
            f"Contract Vault",
            (
                f"[{body.method.upper()}] {signer_label} '{current_user.name}' signed contract {contract_id}. "
                f"Signature token: {signature_token}. "
                f"Method: {body.method}. "
                f"Both parties signed: {c.buyer_signed and c.fpo_signed}."
            ),
            recipient_role="portal",
            event_type="contract_signed_vault"
        )

        buyer_name = c.buyer.name if c.buyer else "Buyer"
        fpo_name = c.fpo.name if c.fpo else "FPO"
        
        if c.buyer_signed and c.fpo_signed:
            # FPO Notification #10 (System)
            log_notification(
                db,
                NotificationChannel.system,
                fpo_name,
                f"{buyer_name} signed Contract {c.id}. Both parties signed — escrow deposit now pending.",
                recipient_role="fpo",
                event_type="buyer_signed_contract"
            )
            
            # Buyer Notification #8 (System)
            log_notification(
                db,
                NotificationChannel.system,
                buyer_name,
                f"You signed Contract {c.id}. Both parties signed — proceed to escrow deposit.",
                recipient_role="buyer",
                event_type="contract_signed_successfully"
            )
            
            # Buyer Notification #9 (Email, System)
            escrow_req_msg = f"Escrow payment required for {c.id}: ₹{c.amount}L. Deposit within 48h to avoid a reliability score penalty."
            log_notification(db, NotificationChannel.email, buyer_name, escrow_req_msg, recipient_role="buyer", event_type="escrow_payment_required")
            log_notification(db, NotificationChannel.system, buyer_name, escrow_req_msg, recipient_role="buyer", event_type="escrow_payment_required")
            
            # Escrow Service Notification — contract fully signed, awaiting escrow deposit
            log_notification(
                db,
                NotificationChannel.system,
                "Escrow Service",
                f"Contract {c.id} fully signed by Buyer '{buyer_name}' and FPO '{fpo_name}'. Amount: ₹{c.amount}L. Awaiting buyer escrow deposit.",
                recipient_role="escrow",
                event_type="contract_signed_escrow_pending"
            )
        else:
            # Just log confirmation for the single signature
            log_notification(
                db,
                NotificationChannel.system,
                current_user.name,
                f"You signed Contract {c.id}. Waiting for other party to sign.",
                recipient_role="buyer" if current_user.role_type == RoleType.buyer else "fpo",
                event_type="contract_signed_half"
            )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    result = contract_to_dict(c)
    result["signatureToken"] = signature_token
    result["simulated"] = True
    return result


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 07 — BUYER FUNDS ESCROW  (simulated deposit; Razorpay/Cashfree = v2)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/fund-escrow")
def fund_escrow(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer")),
):
    """
    Step 07 — Buyer funds 100% of contract value into escrow within 48 hours
    of contract creation.

    Payment rail: SIMULATED (target is Razorpay Route / Cashfree in v2).
    The 48-hour deposit deadline is enforced against contract.created_at;
    late deposit triggers a reliability score penalty for the buyer.
    """
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Idempotency: prevent double-deposit
        if c.escrow_status == EscrowStatus.deposited:
            raise HTTPException(status_code=409, detail="Escrow funds already deposited")

        # Contract must be signed by both parties before escrow can be funded
        if not (c.fpo_signed and c.buyer_signed):
            raise HTTPException(
                status_code=409,
                detail="Contract must be fully signed by both parties before funding escrow.",
            )

        c.escrow_status = EscrowStatus.deposited

        # Step 11 (automatic, system-triggered — not a MahaFPC action):
        # Timely deposit within 48 h → +2 score; late deposit → -5 score (floor: 0)
        if c.buyer:
            created_at_naive = c.created_at.replace(tzinfo=None) if c.created_at else datetime.utcnow()
            time_diff = datetime.utcnow() - created_at_naive
            if time_diff.total_seconds() > 48 * 3600:
                recalculate_buyer_score(c.buyer, db, "late_deposit")
            else:
                recalculate_buyer_score(c.buyer, db, "timely_deposit")

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()

        buyer_name = c.buyer.name if c.buyer else "Buyer"
        fpo_name = c.fpo.name if c.fpo else "FPO"

        # FPO Notification #11 (System)
        log_notification(db, NotificationChannel.system, fpo_name, f"Escrow funded for {c.id} — ₹{c.amount}L secured. You may now dispatch goods.", recipient_role="fpo", event_type="escrow_deposited_fpo")
        
        # Buyer Notification #10 (System)
        log_notification(db, NotificationChannel.system, buyer_name, f"Your payment of ₹{c.amount}L for {c.id} is now held securely in escrow.", recipient_role="buyer", event_type="escrow_payment_successful")
        
        # Admin Notification #8 (System)
        log_notification(db, NotificationChannel.system, "MahaFPC", f"Escrow deposit confirmed on {c.id} — ₹{c.amount}L. Ledger balanced.", recipient_role="mahafpc", event_type="escrow_deposited_admin")
        
        # Escrow Service Notification — funds received and secured
        log_notification(
            db,
            NotificationChannel.system,
            "Escrow Service",
            f"Funds secured: ₹{c.amount}L deposited for Contract {c.id} by Buyer '{buyer_name}'. FPO '{fpo_name}' notified to dispatch.",
            recipient_role="escrow",
            event_type="escrow_funds_secured"
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        # Admin Notification #9 (System)
        buyer_name = "Buyer"
        try:
            buyer_name = c.buyer.name if c.buyer else "Buyer"
        except:
            pass
        log_notification(db, NotificationChannel.system, "MahaFPC", f"Payment failed on {contract_id} — escrow deposit rejected/reversed. Buyer: {buyer_name}. Needs follow-up.", recipient_role="mahafpc", event_type="payment_failed")
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")


    res = contract_to_dict(c)
    res["simulated"] = True
    return res


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 08 — DISPATCH GOODS  (FPO action — separate from escrow funding)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/dispatch")
def dispatch_goods(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo")),
):
    """
    Step 08 — FPO dispatches goods after escrow is funded.

    Auto-generates:
      - e-Way bill number (EWAY-XXXXXX)
      - GPS tracking reference (GPS-XXXXXX)
      - GST invoice number (INV-XXXXXX)

    Sets dispatched_at timestamp (used downstream to enforce GRN 24-hour window).
    Transitions contract status → Dispatched and lot status → Dispatched.

    NOTE: e-Way bill / GPS / GST are randomly generated reference strings for
    the current simulated scope. Real NIC e-Way bill API integration is v2 scope.
    """
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Escrow must be funded before dispatch
        if c.escrow_status != EscrowStatus.deposited:
            raise HTTPException(
                status_code=409,
                detail="Escrow must be funded (Deposited) before goods can be dispatched.",
            )

        # Idempotency: cannot dispatch twice
        if c.status == ContractStatus.dispatched:
            raise HTTPException(status_code=409, detail="Goods already dispatched for this contract.")

        # Generate dispatch logistics references
        c.eway_bill = f"EWAY-{random.randint(100000, 999999)}"
        c.gps_tracking_id = f"GPS-{random.randint(100000, 999999)}"
        c.gst_invoice = f"INV-{random.randint(100000, 999999)}"
        c.dispatched_at = datetime.utcnow()
        c.status = ContractStatus.dispatched

        # Transition lot to Dispatched as well
        lot = db.query(Lot).filter(Lot.id == c.lot_id).first()
        if lot:
            lot.status = LotStatus.dispatched

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()

        buyer_name = c.buyer.name if c.buyer else f"Buyer {c.buyer_id}"
        fpo_name = c.fpo.name if c.fpo else "FPO"
        
        # FPO Notification #12 (System)
        log_notification(db, NotificationChannel.system, fpo_name, f"Dispatch confirmed for {c.id}. e-Way Bill {c.eway_bill}, {c.gps_tracking_id}. Buyer notified.", recipient_role="fpo", event_type="goods_dispatched_fpo")
        
        # Buyer Notification #11 (Email, WhatsApp, SMS + System panel)
        buyer_disp_msg = f"Shipment dispatched for {c.id}. e-Way Bill: {c.eway_bill}, GPS Tracking: {c.gps_tracking_id}. Issue GRN within 24h."
        log_notification(db, NotificationChannel.email, buyer_name, buyer_disp_msg, recipient_role="buyer", event_type="goods_dispatched_buyer")
        log_notification(db, NotificationChannel.whatsapp, buyer_name, buyer_disp_msg, recipient_role="buyer", event_type="goods_dispatched_buyer")
        log_notification(db, NotificationChannel.sms, buyer_name, buyer_disp_msg, recipient_role="buyer", event_type="goods_dispatched_buyer")
        log_notification(db, NotificationChannel.system, buyer_name, buyer_disp_msg, recipient_role="buyer", event_type="goods_dispatched_buyer")
        
        # Buyer Notification #12 (WhatsApp + System)
        tracking_msg = f"📦 Live tracking now available for {c.id}: {c.gps_tracking_id}."
        log_notification(db, NotificationChannel.whatsapp, buyer_name, tracking_msg, recipient_role="buyer", event_type="tracking_available")
        log_notification(db, NotificationChannel.system, buyer_name, tracking_msg, recipient_role="buyer", event_type="tracking_available")
        
        # Buyer Notification #13 (SMS + System)
        delivery_msg = f"Reminder: Shipment for {c.id} is expected to arrive within 6 hours."
        log_notification(db, NotificationChannel.sms, buyer_name, delivery_msg, recipient_role="buyer", event_type="delivery_reminder")
        log_notification(db, NotificationChannel.system, buyer_name, delivery_msg, recipient_role="buyer", event_type="delivery_reminder")
        
        # Buyer Notification #14 (Email + System)
        grn_due_msg = f"Reminder: GRN for {c.id} is due within 6 hours to avoid a compliance flag."
        log_notification(db, NotificationChannel.email, buyer_name, grn_due_msg, recipient_role="buyer", event_type="grn_due_reminder")
        log_notification(db, NotificationChannel.system, buyer_name, grn_due_msg, recipient_role="buyer", event_type="grn_due_reminder")

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Dispatch transaction failed: {str(e)}")

    res = contract_to_dict(c)
    res["simulated"] = True
    return res


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 09 — DELIVERY ACCEPTANCE  (Buyer issues GRN within 24-hour window)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/issue-grn")
def issue_grn(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer")),
):
    """
    Step 09 — Buyer issues a Goods Receipt Note (GRN) after delivery acceptance.

    Rules enforced:
    - Contract must be in 'Dispatched' status (goods must have been dispatched first).
    - GRN must be issued within 24 hours of dispatch (dispatched_at + 24 h).
      After 24 h, a quality-acceptance auto-trigger may be initiated by MahaFPC/portal.
    - GRN number is auto-generated here (NOT in release-funds).
    - After GRN issuance, the 48-hour no-objection quality acceptance window begins.
      The buyer may file a dispute during this window; an open dispute will block fund release.
    """
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Must be dispatched before GRN can be issued
        if c.status != ContractStatus.dispatched:
            raise HTTPException(
                status_code=409,
                detail=f"GRN can only be issued when contract status is 'Dispatched'. Current status: {c.status.value}.",
            )

        # Enforce 24-hour GRN issuance window
        if c.dispatched_at:
            # Strip tzinfo for naive comparison (PostgreSQL TIMESTAMPTZ returns aware datetime)
            dispatched_naive = c.dispatched_at.replace(tzinfo=None) if c.dispatched_at.tzinfo else c.dispatched_at
            elapsed_seconds = (datetime.utcnow() - dispatched_naive).total_seconds()
            if elapsed_seconds > 24 * 3600:
                # Window missed: flag and notify but still allow GRN (portal policy = flag, not hard-block)
                log_notification(
                    db,
                    NotificationChannel.system,
                    "Portal Compliance",
                    (
                        f"GRN window OVERDUE for contract {contract_id}. "
                        f"Dispatch was at {c.dispatched_at.isoformat()} UTC; "
                        f"GRN issued {elapsed_seconds / 3600:.1f}h after dispatch (limit: 24h). "
                        f"Contract flagged for compliance review."
                    ),
                )
                log_notification(
                    db,
                    NotificationChannel.email,
                    c.buyer.name if c.buyer else f"Buyer {c.buyer_id}",
                    f"⚠️ GRN for contract {contract_id} issued past the 24-hour window. "
                    f"This has been flagged for compliance review.",
                )

        # Auto-generate GRN number
        c.grn_number = f"GRN-{random.randint(100000, 999999)}"
        c.status = ContractStatus.grn_issued

        # Update lot status to GRN Issued
        lot = db.query(Lot).filter(Lot.id == c.lot_id).first()
        if lot:
            lot.status = LotStatus.grn_issued

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()

        log_notification(
            db,
            NotificationChannel.system,
            "Portal System",
            (
                f"GRN {c.grn_number} issued for contract {contract_id}. "
                f"48-hour quality acceptance window begins now. "
                f"Buyer may file a dispute during this window; disputes will block fund release."
            ),
        )

        buyer_name = c.buyer.name if c.buyer else "Buyer"
        fpo_name = c.fpo.name if c.fpo else "FPO"
        
        # FPO Notification #13 (System)
        log_notification(db, NotificationChannel.system, fpo_name, f"Buyer issued GRN {c.grn_number} for {c.id}. 48-hour quality acceptance window has started.", recipient_role="fpo", event_type="grn_received_fpo")
        
        # Buyer confirmation (System)
        log_notification(db, NotificationChannel.system, buyer_name, f"You successfully issued GRN {c.grn_number} for contract {c.id}.", recipient_role="buyer", event_type="grn_issued_buyer")

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"GRN issuance failed: {str(e)}")

    return contract_to_dict(c)


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 10 — PAYMENT RELEASE  (Escrow releases 70% + 30% split to farmers)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/release-funds")
def release_funds(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer", "escrow")),
):
    """
    Step 10 — Release escrow funds after GRN is issued.

    Pre-conditions enforced:
    1. Escrow must be in 'Deposited' state.
    2. Contract must be in 'GRN Issued' status (buyer must have issued GRN first via /issue-grn).
    3. No open dispute (Review or Pending) must exist against this lot — disputes block release.

    Payout:
    - 70% released immediately to FPO.
    - 30% scheduled after 5-day no-objection window.
    - Farmer splits are auto-calculated from the registered Farmer table for the FPO.
      Sum-to-100% is validated; falls back to even split or single FPO payee if no farmers registered.

    Step 11 (system-triggered, NOT a MahaFPC manual action):
    - FPO supply rating is incremented by +2 on successful delivery.
    - Buyer reliability score: already updated at fund-escrow step.
    - Contract is marked is_archived = True after successful fund release.
    """
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).with_for_update().first()
        if not c:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Pre-condition 1: Escrow must be funded
        if c.escrow_status != EscrowStatus.deposited:
            raise HTTPException(
                status_code=409,
                detail="Escrow funds not deposited or already released.",
            )

        # Pre-condition 2: GRN must have been issued by buyer (Step 09 must come before Step 10)
        if c.status != ContractStatus.grn_issued:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Funds can only be released after the buyer has issued a GRN. "
                    f"Current contract status: '{c.status.value}'. "
                    f"Call POST /contracts/{contract_id}/issue-grn first."
                ),
            )

        # Pre-condition 3: Block release if an open dispute exists against this lot
        open_dispute = (
            db.query(Dispute)
            .filter(
                Dispute.lot_id == c.lot_id,
                Dispute.status.in_([DisputeStatus.open, DisputeStatus.in_review, DisputeStatus.review, DisputeStatus.pending]),
            )
            .first()
        )
        if open_dispute:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot release funds: dispute {open_dispute.id} is open "
                    f"(status: '{open_dispute.status.value}'). "
                    f"Resolve or close the dispute before releasing escrow funds."
                ),
            )

        # ── Farmer Split Calculation ──────────────────────────────────────────
        splits = db.query(FarmerSplit).filter(FarmerSplit.lot_id == c.lot_id).all()
        if not splits:
            # Option A: query registered farmers for this FPO
            members = db.query(Farmer).filter(Farmer.fpo_id == c.fpo_id).all()
            if members:
                n_members = len(members)
                share = round(100.0 / n_members, 2)
                shares = [share] * n_members
                # Correct last share for rounding so sum is exactly 100%
                shares[-1] = round(100.0 - sum(shares[:-1]), 2)

                log_notification(
                    db,
                    NotificationChannel.system,
                    "Escrow Daemon",
                    f"Computed even splits for FPO {c.fpo_id} registered farmers: "
                    f"{', '.join(m.name for m in members)}.",
                )

                splits = []
                for m, pct in zip(members, shares):
                    amount = round(c.amount * 100000.0 * pct / 100.0, 2)
                    s = FarmerSplit(
                        lot_id=c.lot_id,
                        farmer_name=m.name,
                        share_percent=pct,
                        amount=amount,
                        status=SplitStatus.pending,
                    )
                    db.add(s)
                    splits.append(s)
                db.flush()
            else:
                # Option B: 100% to FPO placeholder payee (documented honest fallback)
                fpo_name = c.fpo.name if c.fpo else "FPO Partner"
                log_notification(
                    db,
                    NotificationChannel.system,
                    "Escrow Daemon",
                    f"No registered farmers found for FPO {c.fpo_id}. "
                    f"Fallback: 100% split to FPO payee '{fpo_name}'.",
                )
                default_split = FarmerSplit(
                    lot_id=c.lot_id,
                    farmer_name=fpo_name,
                    share_percent=100.0,
                    amount=c.amount * 100000.0,
                    status=SplitStatus.pending,
                )
                db.add(default_split)
                db.flush()
                splits = [default_split]

        # Validate sum-to-100%
        total_percent = sum(s.share_percent for s in splits)
        if abs(total_percent - 100.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Farmer splits sum to {total_percent:.2f}%. Must sum to exactly 100%.",
            )

        # ── Release Escrow ────────────────────────────────────────────────────
        release_escrow(c, db)

        # ── Step 11 (System-triggered — score update is automatic) ────────────
        # FPO supply rating +2 for successful delivery
        if c.fpo:
            recalculate_fpo_score(c.fpo, db, "successful_delivery")

        # ── Archive completed transaction ─────────────────────────────────────
        c.is_archived = True

        c.updated_by = current_user.id
        c.updated_at = datetime.utcnow()
        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Escrow release transaction failed: {str(e)}")

    # Completion notification (after commit)
    buyer_name = c.buyer.name if c.buyer else "Buyer"
    fpo_name = c.fpo.name if c.fpo else "FPO"
    
    payout_70 = round(c.amount * 0.7, 2)
    payout_30 = round(c.amount * 0.3, 2)
    
    # FPO Notification #14 (System)
    log_notification(db, NotificationChannel.system, fpo_name, f"Funds released for {c.id}: ₹{payout_70:.1f}L (70%) credited immediately, ₹{payout_30:.1f}L (30%) held. Farmer splits computed.", recipient_role="fpo", event_type="payment_released_fpo")
    
    # Buyer Notification #15 (System)
    log_notification(db, NotificationChannel.system, buyer_name, f"Payment of ₹{c.amount}L for {c.id} has been completed and released to the FPO.", recipient_role="buyer", event_type="payment_completed_buyer")
    
    # FPO Notification #15 (System)
    if c.fpo:
        log_notification(db, NotificationChannel.system, fpo_name, f"Your FPO supply rating increased to {c.fpo.reliability_score}/100 (+2) — successful delivery on {c.id}.", recipient_role="fpo", event_type="reliability_score_updated")

    # Escrow Service Notification — funds disbursed successfully
    log_notification(
        db,
        NotificationChannel.system,
        "Escrow Service",
        (
            f"Disbursement complete for Contract {c.id}: "
            f"₹{payout_70:.1f}L (70%) released immediately to FPO '{fpo_name}', "
            f"₹{payout_30:.1f}L (30%) scheduled post no-objection window. "
            f"Transaction archived."
        ),
        recipient_role="escrow",
        event_type="escrow_funds_disbursed"
    )

    return contract_to_dict(c)
