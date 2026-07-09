import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.user import User, Role
from app.models.trade import Lot, LotMatch, Quote, Contract, Fpo, Buyer
from app.models.ops import Dispute, FarmerSplit, LedgerEntry, SystemLog
from app.core.security import hash_password

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
    db.query(Role).delete()
    db.commit()

    # Seed basic roles
    superadmin = Role(id=1, name="Superadmin", description="Full system access", is_superadmin=True)
    manager = Role(id=2, name="Manager", description="Manager access", is_superadmin=False)
    db.add_all([superadmin, manager])
    
    # Seed FPO & Buyer profiles
    from app.models.trade import Fpo, Buyer
    db.query(Buyer).delete()
    db.query(Fpo).delete()
    fpo = Fpo(id="FPO-NASHIK", name="Nashik Agro FPO", location="Nashik, MH", reliability_score=92)
    buyer = Buyer(id="BUYER-RK", name="R.K. Traders Pvt. Ltd", location="Mumbai, MH", reliability_score=94)
    db.add_all([fpo, buyer])
    db.commit()

    # Seed test users
    password_h = hash_password("password")
    user_fpo = User(id=1, name="Nashik Admin", email="fpo@test.com", password_hash=password_h, role_type="fpo", fpo_id="FPO-NASHIK", role_id=2)
    user_buyer = User(id=2, name="RK Buyer", email="buyer@test.com", password_hash=password_h, role_type="buyer", buyer_id="BUYER-RK", role_id=2)
    user_regulator = User(id=3, name="Regulator", email="regulator@test.com", password_hash=password_h, role_type="mahafpc", role_id=1)
    user_escrow = User(id=4, name="Escrow", email="escrow@test.com", password_hash=password_h, role_type="escrow", role_id=2)
    
    db.add_all([user_fpo, user_buyer, user_regulator, user_escrow])
    db.commit()
    db.close()
    
    yield
    
    # Teardown
    Base.metadata.drop_all(bind=engine)

def get_token(email: str) -> str:
    response = client.post("/auth/login", json={"email": email, "password": "password"})
    assert response.status_code == 200
    return response.json()["accessToken"]

def test_login(setup_db):
    response = client.post("/auth/login", json={"email": "fpo@test.com", "password": "password"})
    assert response.status_code == 200
    data = response.json()
    assert "accessToken" in data
    assert data["roleType"] == "fpo"
    assert data["name"] == "Nashik Admin"

def test_auth_me(setup_db):
    token = get_token("fpo@test.com")
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "fpo@test.com"
    assert data["roleType"] == "fpo"
    assert data["fpoId"] == "FPO-NASHIK"

def test_upload_lot(setup_db):
    token = get_token("fpo@test.com")
    response = client.post(
        "/lots",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "description": "Erode finger turmeric",
            "variety": "Erode finger",
            "qty": 10.0,
            "grade": "A",
            "curcumin": 4.1,
            "priceExpectation": 130.0,
            "location": "Nashik, MH",
            "harvestDate": "2026-06-15",
            "notes": "Dry storage",
            "labReportUrl": "http://example.com/report.pdf"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "Pending match"
    assert data["qty"] == 10.0
    assert data["priceExpectation"] == 130.0
    assert data["fpoName"] == "Nashik Agro FPO"
    assert data["variety"] == "Erode finger"
    assert data["curcumin"] == 4.1
    assert data["harvestDate"] == "2026-06-15"
    assert data["notes"] == "Dry storage"
    assert data["labReportUrl"] == "http://example.com/report.pdf"

def test_quote_48h_window_validation(setup_db):
    token = get_token("buyer@test.com")
    db = SessionLocal()
    
    # 1. Create a lot
    lot = Lot(id="LOT-T1", description="Salem bulb", qty=Decimal("15"), grade="B", status="Pending match", price_expectation=Decimal("125"), location="Salem, TN", fpo_id="FPO-NASHIK")
    db.add(lot)
    
    # 2. Create a match that is older than 48 hours (e.g. 50 hours ago)
    old_match = LotMatch(
        lot_id="LOT-T1",
        buyer_id="BUYER-RK",
        match_score=85,
        offered_price=Decimal("122"),
        created_at=datetime.utcnow() - timedelta(hours=50)
    )
    db.add(old_match)
    db.commit()
    db.close()

    # Try to submit a quote on the expired match -> should return 409 Conflict
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

    # Now make the match fresh (e.g., 2 hours ago)
    db = SessionLocal()
    match_rec = db.query(LotMatch).filter(LotMatch.lot_id == "LOT-T1").first()
    match_rec.created_at = datetime.utcnow() - timedelta(hours=2)
    db.add(match_rec)
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
    assert response.status_code == 201
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
        f"/quotes/{quote_id}/counter",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={"price": 126.0, "message": "FPO counter 1"}
    )
    assert resp.status_code == 200
    assert resp.json()["counterBy"] == "FPO"
    
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
        f"/quotes/{quote_id}/counter",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={"price": 127.0, "message": "FPO counter 3"}
    )
    assert resp.status_code == 200
    assert resp.json()["counterBy"] == "FPO"

    # Round 4: Buyer tries to counter again -> should fail with 409 limit exceeded
    resp = client.post(
        f"/quotes/{quote_id}/counter",
        headers={"Authorization": f"Bearer {token_buyer}"},
        json={"price": 125.0, "message": "Buyer counter 4"}
    )
    assert resp.status_code == 409
    assert "limit reached" in resp.json()["detail"].lower()

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
    assert resp.json()["status"] == "Accepted"

    # Verify contract is automatically created
    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    assert contract is not None
    assert contract.status == "Draft"
    assert contract.escrow_status == "Pending Deposit"
    
    # amount = qty (15) * 1000 * price (127) = 1,905,000 ₹
    assert contract.amount == Decimal("1905000")
    db.close()

def test_contract_signatures_and_escrow_deposit(setup_db):
    token_fpo = get_token("fpo@test.com")
    token_buyer = get_token("buyer@test.com")

    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    contract_id = contract.id
    db.close()

    # FPO signs
    resp = client.post(
        f"/contracts/{contract_id}/sign",
        headers={"Authorization": f"Bearer {token_fpo}"},
        json={"method": "esign"}
    )
    assert resp.status_code == 200
    assert resp.json()["fpoSigned"] is True
    assert resp.json()["buyerSigned"] is False
    assert resp.json()["status"] == "eSign pending"

    # Buyer signs
    resp = client.post(
        f"/contracts/{contract_id}/sign",
        headers={"Authorization": f"Bearer {token_buyer}"},
        json={"method": "esign"}
    )
    assert resp.status_code == 200
    assert resp.json()["buyerSigned"] is True
    assert resp.json()["status"] == "Signed"

    # Buyer deposits funds to escrow
    resp = client.post(
        f"/contracts/{contract_id}/fund-escrow",
        headers={"Authorization": f"Bearer {token_buyer}"}
    )
    assert resp.status_code == 200
    assert resp.json()["escrowStatus"] == "Deposited"
    assert resp.json()["ewayBill"].startswith("EWAY-")
    assert resp.json()["gpsTrackingId"].startswith("GPS-")
    assert resp.json()["gstInvoice"].startswith("INV-")

    # Verify Lot status is updated to Dispatched
    db = SessionLocal()
    lot = db.query(Lot).filter(Lot.id == "LOT-T1").first()
    assert lot.status == "Dispatched"
    
    # Verify Ledger Credit entry exists
    ledger = db.query(LedgerEntry).filter(LedgerEntry.contract_id == contract_id, LedgerEntry.type == "Credit").first()
    assert ledger is not None
    assert ledger.amount == Decimal("1905000")
    db.close()

def test_payout_releases_and_farmer_splits(setup_db):
    token_escrow = get_token("escrow@test.com")

    db = SessionLocal()
    contract = db.query(Contract).filter(Contract.lot_id == "LOT-T1").first()
    contract_id = contract.id
    db.close()

    # Release funds
    resp = client.post(
        f"/contracts/{contract_id}/release-funds",
        headers={"Authorization": f"Bearer {token_escrow}"}
    )
    assert resp.status_code == 200
    assert resp.json()["escrowStatus"] == "Released"
    assert resp.json()["grnNumber"].startswith("GRN-")

    # Verify Lot status is updated to GRN Issued
    db = SessionLocal()
    lot = db.query(Lot).filter(Lot.id == "LOT-T1").first()
    assert lot.status == "GRN Issued"

    # Verify reliability scores are updated (+2 on successful releases)
    fpo = db.query(Fpo).filter(Fpo.id == "FPO-NASHIK").first()
    buyer = db.query(Buyer).filter(Buyer.id == "BUYER-RK").first()
    assert fpo.reliability_score == 94  # 92 + 2
    assert buyer.reliability_score == 96  # 94 + 2

    # Verify Farmer Splits (Ramesh Patil 28%, Suresh 22%, Priya 17%, Ganesh 33% of 1,905,000)
    splits = db.query(FarmerSplit).filter(FarmerSplit.lot_id == "LOT-T1").all()
    assert len(splits) == 4
    
    splits_dict = {s.farmer_name: s.amount for s in splits}
    assert splits_dict["Ramesh Patil"] == Decimal("1905000") * Decimal("0.28")
    assert splits_dict["Suresh Jadhav"] == Decimal("1905000") * Decimal("0.22")
    assert splits_dict["Priya Kulkarni"] == Decimal("1905000") * Decimal("0.17")
    assert splits_dict["Ganesh More"] == Decimal("1905000") * Decimal("0.33")
    
    for s in splits:
        assert s.status == "Paid"

    # Verify Ledger Debit entries exist (both 70% and 30% releases)
    debits = db.query(LedgerEntry).filter(LedgerEntry.contract_id == contract_id, LedgerEntry.type == "Debit").all()
    assert len(debits) == 2
    
    debit_amounts = [d.amount for d in debits]
    assert Decimal("1905000") * Decimal("0.70") in debit_amounts
    assert Decimal("1905000") * Decimal("0.30") in debit_amounts
    db.close()

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
    assert resp.status_code == 201
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
