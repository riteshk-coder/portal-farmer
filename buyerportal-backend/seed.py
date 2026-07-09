import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, Fpo, Buyer, RoleType
from app.models.lot import Lot, LotMatch, LotStatus
from app.models.quote import Quote, QuoteStatus, CounterBy
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.models.dispute import Dispute, DisputeType, DisputeStatus
from app.models.escrow import LedgerEntry, FarmerSplit, EntryType, SplitStatus
from app.models.notification import SystemLog, NotificationChannel
from app.models.role import SystemRole, RolePermission

def seed_db():
    # Create all tables on PostgreSQL automatically
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    print("Seeding System Roles...")
    superadmin = SystemRole(id=1, name="Superadmin", description="Full system access", is_superadmin=True, users_assigned=1)
    manager = SystemRole(id=2, name="Manager", description="Manager access", is_superadmin=False, users_assigned=3)
    viewer = SystemRole(id=3, name="Viewer", description="Viewer access", is_superadmin=False, users_assigned=1)
    db.add_all([superadmin, manager, viewer])
    db.commit()

    print("Seeding Role Permissions...")
    modules = ["Dashboard", "Users", "Roles", "Reports", "Settings", "Billing", "Audit Logs"]
    for role_id, is_admin in [(1, True), (2, True), (3, False)]:
        for mod in modules:
            db.add(RolePermission(
                role_id=role_id,
                module=mod,
                can_view=True,
                can_add=is_admin,
                can_edit=is_admin,
                can_delete=is_admin if role_id == 1 else False
            ))
    db.commit()

    print("Seeding FPO profiles...")
    fpo1 = Fpo(id=1, name="Nashik Agro FPO", location="Nashik, MH", members_count=150, grade_conformance="94%", rating="4.6 / 5.0")
    fpo2 = Fpo(id=2, name="Pune Agro FPO", location="Pune, MH", members_count=120, grade_conformance="90%", rating="4.2 / 5.0")
    fpo3 = Fpo(id=3, name="Salem Farmers FPO", location="Salem, TN", members_count=98, grade_conformance="92%", rating="4.4 / 5.0")
    fpo4 = Fpo(id=4, name="Erode Agro FPO", location="Erode, TN", members_count=110, grade_conformance="91%", rating="4.1 / 5.0")
    db.add_all([fpo1, fpo2, fpo3, fpo4])
    db.commit()

    print("Seeding Buyer profiles...")
    buyer1 = Buyer(id=1, name="R.K. Traders Pvt. Ltd", location="Mumbai, MH", reliability_score=98, payment_days_avg="2.5 days", volume_traded="420 MT")
    buyer2 = Buyer(id=2, name="Nurture Foods Ltd", location="Pune, MH", reliability_score=95, payment_days_avg="3.0 days", volume_traded="280 MT")
    buyer3 = Buyer(id=3, name="Spice Exports Ltd", location="Chennai, TN", reliability_score=92, payment_days_avg="4.0 days", volume_traded="210 MT")
    buyer4 = Buyer(id=4, name="Agmark Foods", location="Delhi, DL", reliability_score=86, payment_days_avg="5.2 days", volume_traded="150 MT")
    buyer5 = Buyer(id=5, name="NutriTrade Co.", location="Bengaluru, KA", reliability_score=79, payment_days_avg="3.5 days", volume_traded="180 MT")
    db.add_all([buyer1, buyer2, buyer3, buyer4, buyer5])
    db.commit()

    print("Seeding users...")
    users = [
        User(id=1, name="Regulator Admin", email="admin@mahafpc.in", password_hash=hash_password("admin@123"), role_type=RoleType.mahafpc, system_role_id=1),
        User(id=2, name="Nashik Admin", email="fpo@buyerportal.in", password_hash=hash_password("fpo@123"), role_type=RoleType.fpo, fpo_id=1, system_role_id=2),
        User(id=3, name="RK Purchase Manager", email="buyer@buyerportal.in", password_hash=hash_password("buyer@123"), role_type=RoleType.buyer, buyer_id=1, system_role_id=2),
        User(id=4, name="Escrow Manager", email="escrow@buyerportal.in", password_hash=hash_password("escrow@123"), role_type=RoleType.escrow, system_role_id=2),
        User(id=5, name="AI Matching Daemon", email="portal@buyerportal.in", password_hash=hash_password("portal@123"), role_type=RoleType.portal, system_role_id=3),
    ]
    db.add_all(users)
    db.commit()

    print("Seeding lots...")
    now = datetime.utcnow()
    lot_2841 = Lot(id="LOT-2841", description="Erode finger turmeric", qty=12.0, grade="A", status=LotStatus.matched, price_expectation=134.0, location="Nashik, MH", curcumin_percent=4.2, harvest_date="2026-06-15", notes="Moisture 9%", fpo_id=1, created_at=now - timedelta(minutes=10))
    lot_2842 = Lot(id="LOT-2842", description="Salem bulb turmeric", qty=8.5, grade="B", status=LotStatus.quoting, price_expectation=130.0, location="Salem, TN", curcumin_percent=3.8, harvest_date="2026-06-10", notes="Well dried", fpo_id=1, created_at=now - timedelta(days=1))
    lot_2843 = Lot(id="LOT-2843", description="Nizamabad premium", qty=20.0, grade="Premium", status=LotStatus.pending_match, price_expectation=132.0, location="Nizamabad, TS", curcumin_percent=4.5, harvest_date="2026-06-20", notes="Clean quality", fpo_id=1, created_at=now - timedelta(minutes=8))
    lot_2844 = Lot(id="LOT-2844", description="Erode finger turmeric", qty=5.0, grade="B", status=LotStatus.counter_offer, price_expectation=128.0, location="Nashik, MH", curcumin_percent=3.6, harvest_date="2026-06-08", notes="Slight moisture", fpo_id=1, created_at=now - timedelta(hours=1))
    lot_2839 = Lot(id="LOT-2839", description="Erode finger turmeric", qty=12.0, grade="A", status=LotStatus.dispatched, price_expectation=134.0, location="Nashik, MH", curcumin_percent=4.1, harvest_date="2026-05-25", notes="Premium quality", fpo_id=1, created_at=now - timedelta(days=4))
    lot_2837 = Lot(id="LOT-2837", description="Salem finger turmeric", qty=8.8, grade="B", status=LotStatus.dispatched, price_expectation=131.0, location="Salem, TN", curcumin_percent=3.7, harvest_date="2026-05-20", notes="Well polished", fpo_id=1, created_at=now - timedelta(days=5))
    lot_2835 = Lot(id="LOT-2835", description="Nizamabad premium", qty=7.0, grade="Premium", status=LotStatus.dispatched, price_expectation=128.0, location="Nizamabad, TS", curcumin_percent=4.6, harvest_date="2026-05-15", notes="Lab report verified", fpo_id=1, created_at=now - timedelta(days=6))
    db.add_all([lot_2841, lot_2842, lot_2843, lot_2844, lot_2839, lot_2837, lot_2835])
    db.commit()

    print("Seeding matches...")
    m1 = LotMatch(id=1, lot_id="LOT-2841", buyer_id=1, match_score=91, offered_price=131.0)
    m2 = LotMatch(id=2, lot_id="LOT-2841", buyer_id=2, match_score=85, offered_price=131.0)
    m3 = LotMatch(id=3, lot_id="LOT-2841", buyer_id=3, match_score=72, offered_price=128.0)
    db.add_all([m1, m2, m3])
    db.commit()

    print("Seeding quotes...")
    q1 = Quote(id="QT-201", lot_id="LOT-2842", buyer_id=1, price=129.0, qty=8.5, status=QuoteStatus.awaiting_response, message="Immediate pickup available.")
    q2 = Quote(id="QT-202", lot_id="LOT-2844", buyer_id=3, price=125.0, qty=5.0, status=QuoteStatus.counter_offer, counter_by=CounterBy.buyer, message="Our best offer for Grade B finger lot.", counter_rounds=1)
    q3 = Quote(id="QT-203", lot_id="LOT-2841", buyer_id=4, price=128.0, qty=12.0, status=QuoteStatus.accepted, message="Contract CNT-0092 generated.")
    db.add_all([q1, q2, q3])
    db.commit()

    print("Seeding contracts...")
    c1 = Contract(id="CNT-0091", lot_id="LOT-2839", buyer_id=1, fpo_id=1, qty=12.0, price=134.0, amount=16.08, status=ContractStatus.esign_pending, fpo_signed=True, buyer_signed=False, escrow_status=EscrowStatus.pending_deposit)
    c2 = Contract(id="CNT-0090", lot_id="LOT-2837", buyer_id=3, fpo_id=1, qty=8.8, price=131.0, amount=11.50, status=ContractStatus.signed, fpo_signed=True, buyer_signed=True, escrow_status=EscrowStatus.deposited, eway_bill="EWAY-283901", gps_tracking_id="GPS-892019", gst_invoice="INV-902102")
    c3 = Contract(id="CNT-0088", lot_id="LOT-2835", buyer_id=4, fpo_id=1, qty=7.0, price=127.0, amount=8.90, status=ContractStatus.signed, fpo_signed=True, buyer_signed=True, escrow_status=EscrowStatus.released)
    db.add_all([c1, c2, c3])
    db.commit()

    print("Seeding disputes...")
    d1 = Dispute(id="DSP-004", type=DisputeType.quality_mismatch, lot_id="LOT-2841", buyer_id=4, fpo_id=2, description="Curcumin below specification standard. Expected 4.5%, tested 3.8%.", status=DisputeStatus.review, filed_at=now - timedelta(days=3))
    d2 = Dispute(id="DSP-005", type=DisputeType.payment_delay, lot_id="LOT-2842", buyer_id=5, fpo_id=3, description="Escrow funds deposit timeline exceeded by 48 hours.", status=DisputeStatus.pending, filed_at=now - timedelta(days=5))
    db.add_all([d1, d2])
    db.commit()

    print("Seeding farmer splits...")
    s1 = FarmerSplit(id=1, lot_id="LOT-2837", farmer_name="Ramesh Patil", share_percent=28.0, amount=225000.0, status=SplitStatus.paid)
    s2 = FarmerSplit(id=2, lot_id="LOT-2837", farmer_name="Suresh Jadhav", share_percent=22.0, amount=177000.0, status=SplitStatus.paid)
    s3 = FarmerSplit(id=3, lot_id="LOT-2837", farmer_name="Priya Kulkarni", share_percent=17.0, amount=137000.0, status=SplitStatus.paid)
    s4 = FarmerSplit(id=4, lot_id="LOT-2837", farmer_name="Ganesh More", share_percent=33.0, amount=266000.0, status=SplitStatus.paid)
    db.add_all([s1, s2, s3, s4])
    db.commit()

    print("Seeding ledger entries...")
    l1 = LedgerEntry(id="TXN-9021", contract_id="CNT-0091", type=EntryType.credit, party="R.K. Traders Pvt. Ltd", amount=1608000.0, timestamp=now - timedelta(days=2))
    db.add(l1)
    db.commit()

    print("Seeding system logs...")
    log1 = SystemLog(
        id="LOG-001",
        channel=NotificationChannel.system,
        recipient="AI Matching Core",
        message="New AI Buyer Match found for Erode finger turmeric (LOT-2841). R.K. Traders Pvt. Ltd matched with 91% confidence score.",
        timestamp=now - timedelta(minutes=10)
    )
    log2 = SystemLog(
        id="LOG-002",
        channel=NotificationChannel.email,
        recipient="purchase@rktraders.in",
        message="Agronomic Alert: Nizamabad premium turmeric (LOT-2843) uploaded. Fits your curcumin requirement criteria. WhatsApp alert dispatched.",
        timestamp=now - timedelta(minutes=8)
    )
    log3 = SystemLog(
        id="LOG-003",
        channel=NotificationChannel.system,
        recipient="Escrow Daemon",
        message="Auto-generated contract CNT-0091 for LOT-2839 uploaded to vault.",
        timestamp=now - timedelta(days=1)
    )
    db.add_all([log1, log2, log3])
    db.commit()
    
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_db()
