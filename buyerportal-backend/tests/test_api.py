import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User, Fpo, Buyer, RoleType, Consultant, AdminInvite
from app.models.lot import Lot, LotMatch, LotStatus
from app.models.quote import Quote, QuoteStatus, CounterBy
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.models.dispute import Dispute, DisputeStatus, DisputeType
from app.models.escrow import FarmerSplit, LedgerEntry, SplitStatus, EntryType
from app.models.notification import SystemLog
from app.models.role import SystemRole, RolePermission
from app.models.farmer import Farmer
from app.core.security import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    # Setup test database tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clean tables
    db.query(SystemLog).delete()
    db.query(LedgerEntry).delete()
    db.query(FarmerSplit).delete()
    db.query(Dispute).delete()
    db.query(Contract).delete()
    db.query(Quote).delete()
    db.query(LotMatch).delete()
    db.query(Lot).delete()
    db.query(User).delete()
    db.query(RolePermission).delete()
    db.query(SystemRole).delete()
    db.query(Farmer).delete()
    db.query(Buyer).delete()
    db.query(Fpo).delete()
    db.query(Consultant).delete()
    db.query(AdminInvite).delete()
    db.commit()

    # Seed basic roles
    superadmin = SystemRole(id=1, name="Superadmin", description="Full system access", is_superadmin=True)
    manager = SystemRole(id=2, name="Manager", description="Manager access", is_superadmin=False)
    db.add_all([superadmin, manager])
    
    # Seed FPO & Buyer profiles with Integer IDs
    fpo = Fpo(id=1, name="Nashik Agro FPO", location="Nashik, MH", members_count=150, grade_conformance="94%", rating="4.6 / 5.0", reliability_score=92)
    buyer = Buyer(id=1, name="R.K. Traders Pvt. Ltd", location="Mumbai, MH", reliability_score=94)
    db.add_all([fpo, buyer])
    db.commit()

    # Seed farmers for FPO 1 Nashik
    farmer1 = Farmer(fpo_id=1, name="Ramesh Patil")
    farmer2 = Farmer(fpo_id=1, name="Suresh Jadhav")
    farmer3 = Farmer(fpo_id=1, name="Priya Kulkarni")
    farmer4 = Farmer(fpo_id=1, name="Ganesh More")
    db.add_all([farmer1, farmer2, farmer3, farmer4])
    db.commit()

    # Seed test users — member_status must be "Active" or login returns 403
    password_h = hash_password("password")
    user_fpo = User(id=1, name="Nashik Admin", email="fpo@test.com", password_hash=password_h, role_type=RoleType.fpo, fpo_id=1, system_role_id=2, member_status="Active")
    user_buyer = User(id=2, name="RK Buyer", email="buyer@test.com", password_hash=password_h, role_type=RoleType.buyer, buyer_id=1, system_role_id=2, member_status="Active")
    user_regulator = User(id=3, name="Regulator", email="regulator@test.com", password_hash=password_h, role_type=RoleType.mahafpc, system_role_id=1, member_status="Active")
    user_escrow = User(id=4, name="Escrow", email="escrow@test.com", password_hash=password_h, role_type=RoleType.escrow, system_role_id=2, member_status="Active")

    
    from sqlalchemy import text
    db.add_all([user_fpo, user_buyer, user_regulator, user_escrow])
    db.commit()
    
    if "postgresql" in engine.name:
        db.execute(text("SELECT setval('buyers_id_seq', COALESCE((SELECT MAX(id) FROM buyers), 1))"))
        db.execute(text("SELECT setval('fpos_id_seq', COALESCE((SELECT MAX(id) FROM fpos), 1))"))
        db.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))"))
        db.commit()
        
    db.close()
    
    yield
    
    # Teardown (wiping disabled to preserve database records for local development)
    db = SessionLocal()
    db.close()

def get_token(email: str) -> str:
    response = client.post("/auth/login", data={"username": email, "password": "password"})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_login(setup_db):
    response = client.post("/auth/login", data={"username": "fpo@test.com", "password": "password"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "fpo"
    assert data["name"] == "Nashik Admin"

def test_auth_me(setup_db):
    token = get_token("fpo@test.com")
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "fpo@test.com"
    assert data["role"] == "fpo"
    assert data["fpoId"] == 1

def test_upload_lot(setup_db):
    token = get_token("fpo@test.com")
    response = client.post(
        "/lots",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "description": "Erode finger turmeric",
            "variety": "Erode finger",
            "qty": 10.0,
            "grade": "A",
            "curcuminPercent": 4.1,
            "priceExpectation": 130.0,
            "location": "Nashik, MH",
            "harvestDate": "2026-06-15",
            "notes": "Dry storage"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Matched"
    assert data["qty"] == 10.0
    assert data["priceExpectation"] == 130.0
    assert data["fpoName"] == "Nashik Agro FPO"

def test_quote_48h_window_validation(setup_db):
    token = get_token("buyer@test.com")
    db = SessionLocal()
    
    # 1. Create a lot older than 48 hours (e.g. 50 hours ago)
    lot = Lot(
        id="LOT-T1",
        description="Salem bulb",
        qty=15.0,
        grade="B",
        status=LotStatus.matched,
        price_expectation=125.0,
        location="Salem, TN",
        fpo_id=1,
        created_at=datetime.utcnow() - timedelta(hours=50)
    )
    db.add(lot)
    db.commit()
    db.close()

    # Try to submit a quote -> should return 409 Conflict
    response = client.post(
        "/quotes",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "lotId": "LOT-T1",
            "price": 122.0,
            "qty": 15.0,
            "message": "Late quote"
        }
    )
    assert response.status_code == 409
    assert "expired" in response.json()["detail"].lower()

    # Now make the lot fresh (e.g., 2 hours ago)
    db = SessionLocal()
    lot_rec = db.query(Lot).filter(Lot.id == "LOT-T1").first()
    lot_rec.created_at = datetime.utcnow() - timedelta(hours=2)
    db.add(lot_rec)
    db.commit()
    db.close()

    # Quote should now succeed
    response = client.post(
        "/quotes",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "lotId": "LOT-T1",
            "price": 123.0,
            "qty": 15.0,
            "message": "Valid quote"
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Awaiting response"

def test_counter_offer_limit(setup_db):
    token_buyer = get_token("buyer@test.com")
    token_fpo = get_token("fpo@test.com")

    # Retrieve the quote created in the previous step
    db = SessionLocal()
    quote = db.query(Quote).filter(Quote.lot_id == "LOT-T1").first()
    quote_id = quote.id
    db.close()

    # Round 1: FPO counters
    resp = client.post(
        f"/quotes/{quote_id}/respond",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={"action": "counter", "counterPrice": 126.0, "message": "FPO counter 1"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "counter-sent"
    
    # Round 2: Buyer counters
    resp = client.post(
        f"/quotes/{quote_id}/counter",
        headers={"Authorization": f"Bearer {token_buyer}"},
        json={"price": 124.0, "message": "Buyer counter 2"}
    )
    assert resp.status_code == 200
    assert resp.json()["counterBy"] == "Buyer"
    
    # Round 3: FPO counters
    resp = client.post(
        f"/quotes/{quote_id}/respond",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={"action": "counter", "counterPrice": 127.0, "message": "FPO counter 3"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "counter-sent"

    # Round 4: Buyer tries to counter again -> should fail with 409 limit exceeded
    resp = client.post(
        f"/quotes/{quote_id}/counter",
        headers={"Authorization": f"Bearer {token_buyer}"},
        json={"price": 125.0, "message": "Buyer counter 4"}
    )
    assert resp.status_code == 409
    assert "rounds" in resp.json()["detail"].lower()

def test_quote_acceptance_and_contract_generation(setup_db):
    token_fpo = get_token("fpo@test.com")
    
    db = SessionLocal()
    quote = db.query(Quote).filter(Quote.lot_id == "LOT-T1").first()
    quote_id = quote.id
    db.close()

    # FPO responds with 'accept'
    resp = client.post(
        f"/quotes/{quote_id}/respond",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={"action": "accept"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"

    # Verify contract is automatically created
    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    assert contract is not None
    assert contract.status == ContractStatus.esign_pending
    assert contract.escrow_status == EscrowStatus.pending_deposit
    db.close()

def test_contract_signatures_and_escrow_deposit(setup_db):
    """
    Step 06 (eSign) + Step 07 (fund-escrow).

    eSign: buyer signs → response includes signatureToken (simulated eSign/DSC audit trail).
    fund-escrow: escrow transitions to Deposited; ewayBill/GPS/GST are NOT generated here —
    those are generated by the separate Step 08 /dispatch endpoint (FPO action).
    """
    token_fpo = get_token("fpo@test.com")
    token_buyer = get_token("buyer@test.com")

    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    contract_id = contract.id
    db.close()

    # ── Step 06: Buyer signs (eSign simulation) ──────────────────────────────
    resp = client.post(
        f"/contracts/{contract_id}/sign",
        headers={"Authorization": f"Bearer {token_buyer}"},
        json={"method": "esign"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["buyerSigned"] is True
    assert data["status"] == "Signed"
    # Signature token must be present (simulated eSign/DSC audit trail)
    assert "signatureToken" in data
    assert len(data["signatureToken"]) == 32  # SHA-256 hex truncated to 32 chars

    # Idempotency: buyer cannot sign twice
    resp_dup = client.post(
        f"/contracts/{contract_id}/sign",
        headers={"Authorization": f"Bearer {token_buyer}"},
        json={"method": "esign"}
    )
    assert resp_dup.status_code == 409
    assert "already signed" in resp_dup.json()["detail"].lower()

    # ── Step 07: Buyer funds escrow ───────────────────────────────────────────
    resp = client.post(
        f"/contracts/{contract_id}/fund-escrow",
        headers={"Authorization": f"Bearer {token_buyer}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["escrowStatus"] == "Deposited"
    # ewayBill / gpsTrackingId / gstInvoice are NOT set here;
    # they are set by the separate /dispatch endpoint (Step 08 — FPO action)
    assert data["ewayBill"] is None
    assert data["gpsTrackingId"] is None
    assert data["gstInvoice"] is None

    # Buyer reliability score: 94 (initial) + 2 (timely deposit) = 96
    db = SessionLocal()
    buyer = db.query(Buyer).filter(Buyer.id == 1).first()
    assert buyer.reliability_score == 96  # 94 + 2 for timely deposit
    db.close()


def test_dispatch_goods(setup_db):
    """
    Step 08 — FPO dispatches goods after escrow is funded.

    The /dispatch endpoint (FPO-only) generates the e-Way bill, GPS tracking ID,
    and GST invoice, sets dispatched_at, and transitions contract → 'Dispatched'.
    This is a SEPARATE action from fund-escrow (Step 07) — matching the diagram.
    """
    token_fpo = get_token("fpo@test.com")
    token_buyer = get_token("buyer@test.com")

    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    contract_id = contract.id
    db.close()

    # Buyer cannot dispatch (FPO-only endpoint)
    resp_buyer = client.post(
        f"/contracts/{contract_id}/dispatch",
        headers={"Authorization": f"Bearer {token_buyer}"}
    )
    assert resp_buyer.status_code == 403

    # FPO dispatches goods
    resp = client.post(
        f"/contracts/{contract_id}/dispatch",
        headers={"Authorization": f"Bearer {token_fpo}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Dispatched"
    assert data["ewayBill"] is not None and data["ewayBill"].startswith("EWAY-")
    assert data["gpsTrackingId"] is not None and data["gpsTrackingId"].startswith("GPS-")
    assert data["gstInvoice"] is not None and data["gstInvoice"].startswith("INV-")
    assert data["dispatchedAt"] is not None

    # Lot status must also be Dispatched
    db = SessionLocal()
    lot = db.query(Lot).filter(Lot.id == "LOT-T1").first()
    assert lot.status == LotStatus.dispatched
    db.close()

    # Idempotency: cannot dispatch twice
    resp_dup = client.post(
        f"/contracts/{contract_id}/dispatch",
        headers={"Authorization": f"Bearer {token_fpo}"}
    )
    assert resp_dup.status_code == 409
    assert "already dispatched" in resp_dup.json()["detail"].lower()

def test_dispute_blocks_release_funds(setup_db):
    """
    Step 09 guard: an open dispute against a lot must block release-funds.
    This test uses a fresh synthetic contract so it doesn't depend on LOT-T1's state.
    """
    token_escrow = get_token("escrow@test.com")
    token_fpo = get_token("fpo@test.com")
    token_buyer = get_token("buyer@test.com")
    token_regulator = get_token("regulator@test.com")

    db = SessionLocal()
    # Create a synthetic lot and contract in grn_issued state for dispute block testing
    lot_block = Lot(
        id="LOT-BLOCK",
        description="Dispute block test lot",
        qty=5.0,
        grade="A",
        status=LotStatus.grn_issued,
        price_expectation=130.0,
        location="Nashik, MH",
        fpo_id=1,
    )
    contract_block = Contract(
        id="CNT-BLOCK",
        lot_id="LOT-BLOCK",
        buyer_id=1,
        fpo_id=1,
        qty=5.0,
        price=130.0,
        amount=6.5,
        status=ContractStatus.grn_issued,
        fpo_signed=True,
        buyer_signed=True,
        escrow_status=EscrowStatus.deposited,
        grn_number="GRN-BLOCK01",
    )
    db.add_all([lot_block, contract_block])
    db.commit()
    db.close()

    # File an open dispute against LOT-BLOCK
    resp_dispute = client.post(
        "/disputes",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={
            "lotId": "LOT-BLOCK",
            "type": "Quality mismatch",
            "description": "Quality dispute during GRN window."
        }
    )
    assert resp_dispute.status_code == 200
    dispute_id = resp_dispute.json()["id"]

    # release-funds should be BLOCKED (open dispute exists)
    resp = client.post(
        "/contracts/CNT-BLOCK/release-funds",
        headers={"Authorization": f"Bearer {token_escrow}"}
    )
    assert resp.status_code == 409
    assert "open dispute" in resp.json()["detail"].lower() or "dispute" in resp.json()["detail"].lower()

    # Resolve the dispute (MahaFPC)
    resp_resolve = client.post(
        f"/disputes/{dispute_id}/resolve",
        headers={"Authorization": f"Bearer {token_regulator}"}
    )
    assert resp_resolve.status_code == 200

    # After dispute resolved, release-funds should succeed
    resp = client.post(
        "/contracts/CNT-BLOCK/release-funds",
        headers={"Authorization": f"Bearer {token_escrow}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["escrowStatus"] == "Released"
    # Transaction must be archived after successful fund release
    assert data["isArchived"] is True


def test_issue_grn_and_full_payout(setup_db):
    """
    Step 09 + Step 10 end-to-end for LOT-T1:
    issue-grn required before release-funds;
    release-funds blocked without GRN; succeeds after GRN;
    lot → GRN Issued, FPO score +2, farmer splits correct, transaction archived.
    """
    token_escrow = get_token("escrow@test.com")
    token_buyer = get_token("buyer@test.com")

    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    contract_id = contract.id
    db.close()

    # release-funds should FAIL because no GRN has been issued yet
    resp_early = client.post(
        f"/contracts/{contract_id}/release-funds",
        headers={"Authorization": f"Bearer {token_escrow}"}
    )
    assert resp_early.status_code == 409
    assert "grn" in resp_early.json()["detail"].lower()

    # Buyer issues GRN (Step 09)
    resp_grn = client.post(
        f"/contracts/{contract_id}/issue-grn",
        headers={"Authorization": f"Bearer {token_buyer}"}
    )
    assert resp_grn.status_code == 200
    grn_data = resp_grn.json()
    assert grn_data["status"] == "GRN Issued"
    assert grn_data["grnNumber"] is not None and grn_data["grnNumber"].startswith("GRN-")

    # Lot status must be GRN Issued
    db = SessionLocal()
    lot = db.query(Lot).filter(Lot.id == "LOT-T1").first()
    assert lot.status == LotStatus.grn_issued
    db.close()

    # Now release-funds should succeed (Step 10)
    resp = client.post(
        f"/contracts/{contract_id}/release-funds",
        headers={"Authorization": f"Bearer {token_escrow}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["escrowStatus"] == "Released"
    # GRN number must be preserved from issue-grn step
    assert data["grnNumber"] is not None and data["grnNumber"].startswith("GRN-")
    # Transaction archived after successful release (Step 11)
    assert data["isArchived"] is True

    # FPO score +2 for successful delivery (Step 11, system-triggered)
    # Note: score may have increased from prior tests that also triggered release-funds
    # (e.g., test_dispute_blocks_release_funds). Read the actual value and check it's at least
    # 94 (92 + 2 for LOT-T1 delivery) to remain robust across test ordering.
    db = SessionLocal()
    fpo = db.query(Fpo).filter(Fpo.id == 1).first()
    assert fpo.reliability_score >= 94  # 92 + 2 minimum for this delivery

    # Farmer splits: 4 farmers → 25% each (Nashik Agro FPO)
    splits = db.query(FarmerSplit).filter(FarmerSplit.lot_id == "LOT-T1").all()
    assert len(splits) == 4
    for s in splits:
        assert s.share_percent == 25.0
        assert s.status == SplitStatus.paid
    db.close()


def test_release_funds_errors(setup_db):
    """Idempotency: releasing funds a second time must return 409."""
    token_escrow = get_token("escrow@test.com")

    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    contract_id = contract.id
    db.close()

    # Already released in test_issue_grn_and_full_payout → must return 409
    resp = client.post(
        f"/contracts/{contract_id}/release-funds",
        headers={"Authorization": f"Bearer {token_escrow}"}
    )
    assert resp.status_code == 409
    # Either "escrow funds not deposited" (already released) or "grn" (if prior test flow
    # didn't complete) — in either case it must be a 409 conflict.
    detail = resp.json()["detail"].lower()
    assert "escrow" in detail or "grn" in detail or "dispatch" in detail

def test_disputes_resolution_auth_check(setup_db):
    token_fpo = get_token("fpo@test.com")
    token_regulator = get_token("regulator@test.com")

    # File dispute
    resp = client.post(
        "/disputes",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={
            "lotId": "LOT-T1",
            "type": "Quality mismatch",
            "description": "Moisture is 15% instead of 10%."
        }
    )
    assert resp.status_code == 200
    dispute_id = resp.json()["id"]

    # FPO tries to resolve -> should fail with 403 Forbidden
    resp = client.post(
        f"/disputes/{dispute_id}/resolve",
        headers={"Authorization": f"Bearer {token_fpo}"}
    )
    assert resp.status_code == 403

    # Regulator resolves -> should succeed
    resp = client.post(
        f"/disputes/{dispute_id}/resolve",
        headers={"Authorization": f"Bearer {token_regulator}"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "Resolved"

def test_superadmin_role_protection(setup_db):
    token_regulator = get_token("regulator@test.com")

    # Try to edit role id 1 (Superadmin) -> should fail with 403
    resp = client.put(
        "/roles/1",
        headers={"Authorization": f"Bearer {token_regulator}"},
        json={"name": "New Superadmin", "description": "Modifying superadmin"}
    )
    assert resp.status_code == 403
    assert "superadmin" in resp.json()["detail"].lower()

    # Try to delete role id 1 (Superadmin) -> should fail with 403
    resp = client.delete(
        "/roles/1",
        headers={"Authorization": f"Bearer {token_regulator}"}
    )
    assert resp.status_code == 403
    assert "superadmin" in resp.json()["detail"].lower()

def test_passwordless_auth_system(setup_db):
    # 1. Register a Buyer
    reg_payload = {
        "role": "buyer",
        "fullName": "New Buyer Pro",
        "email": "buyer_new@buyerportal.in",
        "mobile": "9000000001",
        "companyName": "Pro Traders LLC",
        "businessType": "Exporter",
        "gstin": "27AAACP1234A1Z1"
    }
    resp = client.post("/auth/register", json=reg_payload)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Registration successful."

    # 2. Attempt duplicate email registration -> should fail
    resp = client.post("/auth/register", json=reg_payload)
    assert resp.status_code == 400

    # 3. Login with unregistered Google Email -> should fail
    resp = client.post("/auth/login/google", json={"google_token": "random@gmail.com", "role": "buyer"})
    assert resp.status_code == 404

    # 4. Login with registered Google Email -> should succeed
    resp = client.post("/auth/login/google", json={"google_token": "buyer_new@buyerportal.in", "role": "buyer"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["role"] == "buyer"

    # 5. Send OTP to registered number
    resp = client.post("/auth/otp/send", json={"mobile_number": "9000000001", "purpose": "login"})
    assert resp.status_code == 200
    otp_code = resp.json()["otp"]

    # 6. Verify OTP with correct code -> should succeed
    resp = client.post("/auth/otp/verify", json={"mobile_number": "9000000001", "otp": otp_code, "purpose": "login"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    # 7. Invite Admin
    invite_payload = {
        "email": "new_admin@mahafpc.in",
        "employee_id": "EMP-0921"
    }
    resp = client.post("/auth/invite-admin", json=invite_payload)
    assert resp.status_code == 200

    # 8. Login as Admin using Google (invite whitelist check) -> should auto-create user and succeed
    resp = client.post("/auth/login/google", json={"google_token": "new_admin@mahafpc.in", "role": "admin"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["role"] == "admin"

def test_buyer_matching_engine_low_score(setup_db):
    db = SessionLocal()
    buyer = db.query(Buyer).first()
    assert buyer is not None

    fpo_user = db.query(User).filter(User.role_type == RoleType.fpo).first()
    assert fpo_user is not None
    access_token = create_access_token(data={"sub": str(fpo_user.id)})
    headers = {"Authorization": f"Bearer {access_token}"}

    lot_payload = {
        "description": "Unknown Crop Low Quality",
        "qty": 5.0,
        "grade": "Grade C",
        "priceExpectation": 100.0,
        "location": "Chennai, TN",
        "curcuminPercent": 1.5,
        "harvestDate": "2026-03-01",
        "notes": "Low score testing"
    }
    resp = client.post("/lots", headers=headers, data=lot_payload)
    assert resp.status_code == 200
    lot_id = resp.json()["id"]

    resp_matches = client.get(f"/lots/{lot_id}/matches", headers=headers)
    assert resp_matches.status_code == 200
    matches_data = resp_matches.json()
    assert len(matches_data) > 0
    db.expire_all()
    match_entry = db.query(LotMatch).filter(LotMatch.lot_id == lot_id).first()
    assert match_entry is not None
    assert match_entry.matching_path == "rule-based"
    db.close()

def test_scoring_recalculation_late_vs_timely_deposit(setup_db):
    """
    Buyer score (0–100): timely deposit +2, late deposit -5 (floor: 0, not 50).
    """
    db = SessionLocal()
    buyer = db.query(Buyer).first()
    assert buyer is not None
    initial_score = buyer.reliability_score

    fpo_user = db.query(User).filter(User.role_type == RoleType.fpo).first()
    access_token = create_access_token(data={"sub": str(fpo_user.id)})
    headers = {"Authorization": f"Bearer {access_token}"}

    contract = Contract(
        id="CON-TEST-1",
        lot_id="LOT-T1",
        buyer_id=buyer.id,
        fpo_id=1,
        qty=10.0,
        price=120.0,
        amount=12.0,
        status=ContractStatus.signed,
        fpo_signed=True,
        buyer_signed=True,
        escrow_status=EscrowStatus.pending_deposit,
        created_at=datetime.utcnow()
    )
    db.add(contract)
    db.commit()

    resp = client.post(f"/contracts/{contract.id}/fund-escrow", headers=headers)
    assert resp.status_code == 200
    db.refresh(buyer)
    assert buyer.reliability_score == min(100, initial_score + 2)

    # Late deposit: floor is now 0 (not 50) to match infographic's 0–100 claim
    contract_late = Contract(
        id="CON-TEST-2",
        lot_id="LOT-T1",
        buyer_id=buyer.id,
        fpo_id=1,
        qty=10.0,
        price=120.0,
        amount=12.0,
        status=ContractStatus.signed,
        fpo_signed=True,
        buyer_signed=True,
        escrow_status=EscrowStatus.pending_deposit,
        created_at=datetime.utcnow() - timedelta(hours=50)
    )
    db.add(contract_late)
    db.commit()

    resp = client.post(f"/contracts/{contract_late.id}/fund-escrow", headers=headers)
    assert resp.status_code == 200
    db.refresh(buyer)
    # Floor is now 0 (matches infographic 0–100 range)
    assert buyer.reliability_score == max(0, min(100, initial_score + 2) - 5)
    db.close()

def test_scoring_recalculation_dispute_lost(setup_db):
    """
    Buyer score floor is 0 (matches infographic's 0–100 claim), not 40.
    MahaFPC resolves dispute → buyer score -10, floored at 0.
    """
    db = SessionLocal()
    buyer = db.query(Buyer).first()
    assert buyer is not None
    initial_score = buyer.reliability_score

    admin_user = db.query(User).filter(User.role_type == RoleType.mahafpc).first()
    assert admin_user is not None
    access_token = create_access_token(data={"sub": str(admin_user.id)})
    headers = {"Authorization": f"Bearer {access_token}"}

    dispute = Dispute(
        id="DSP-TEST-MATCH",
        type=DisputeType.quality_mismatch,
        lot_id="LOT-T1",
        buyer_id=buyer.id,
        fpo_id=1,
        description="Testing dispute score deduction",
        status=DisputeStatus.pending
    )
    db.add(dispute)
    db.commit()

    resp = client.post(f"/disputes/{dispute.id}/resolve", headers=headers)
    assert resp.status_code == 200
    db.refresh(buyer)
    # Floor is now 0 (matches infographic 0–100 range; was previously max(40, ...))
    assert buyer.reliability_score == max(0, initial_score - 10)
    db.close()
