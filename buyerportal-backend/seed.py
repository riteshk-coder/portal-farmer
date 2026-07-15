import sys
import os
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, Fpo, Buyer, RoleType, Consultant, AdminInvite
from app.models.farmer import Farmer
from app.models.lot import Lot, LotMatch, LotStatus
from app.models.quote import Quote, QuoteStatus, CounterBy
from app.models.contract import Contract, ContractStatus, EscrowStatus
from app.models.dispute import Dispute, DisputeType, DisputeStatus
from app.models.escrow import LedgerEntry, FarmerSplit, EntryType, SplitStatus
from app.models.notification import SystemLog, NotificationChannel
from app.models.role import SystemRole, RolePermission

def backup_custom_data(db: Session) -> dict:
    backup = {
        "users": [],
        "buyers": [],
        "fpos": [],
        "consultants": [],
        "admin_invites": []
    }
    
    try:
        # Default seeded emails
        default_emails = {
            "admin@mahafpc.in",
            "fpo@buyerportal.in",
            "buyer@buyerportal.in",
            "escrow@buyerportal.in",
            "portal@buyerportal.in",
            "fpo@test.com",
            "buyer@test.com",
            "regulator@test.com",
            "escrow@test.com",
            "fpo@buyerportal.com",
            "buyer@buyerportal.com",
            "mahafpc@buyerportal.com",
            "escrow@buyerportal.com",
            "portal@buyerportal.com",
            "riteshk@ova.ngo"
        }
        
        # Backup custom users
        users = db.query(User).all()
        custom_users = [u for u in users if u.email not in default_emails]
        for u in custom_users:
            backup["users"].append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "password_hash": u.password_hash,
                "role_type": u.role_type.value,
                "system_role_id": u.system_role_id,
                "fpo_id": u.fpo_id,
                "buyer_id": u.buyer_id,
                "consultant_id": u.consultant_id,
                "mobile": u.mobile,
                "employee_id": u.employee_id,
                "employee_role": u.employee_role,
                "is_active": u.is_active
            })
            
        # Default seeded buyer IDs are 1, 2, 3, 4, 5
        buyers = db.query(Buyer).filter(Buyer.id > 5).all()
        for b in buyers:
            backup["buyers"].append({
                "id": b.id,
                "name": b.name,
                "location": b.location,
                "reliability_score": b.reliability_score,
                "payment_days_avg": b.payment_days_avg,
                "volume_traded": b.volume_traded,
                "company_name": getattr(b, "company_name", None),
                "business_type": getattr(b, "business_type", None),
                "gstin": getattr(b, "gstin", None)
            })
            
        # Default seeded FPO IDs are 1, 2, 3, 4
        fpos = db.query(Fpo).filter(Fpo.id > 4).all()
        for f in fpos:
            backup["fpos"].append({
                "id": f.id,
                "name": f.name,
                "location": f.location,
                "members_count": f.members_count,
                "grade_conformance": f.grade_conformance,
                "rating": f.rating,
                "fpo_registration_number": getattr(f, "fpo_registration_number", None),
                "state": getattr(f, "state", None),
                "district": getattr(f, "district", None),
                "village": getattr(f, "village", None),
                "bank_account_num": getattr(f, "bank_account_num", None),
                "bank_ifsc": getattr(f, "bank_ifsc", None)
            })
            
        # Consultants
        consultants = db.query(Consultant).all()
        for c in consultants:
            backup["consultants"].append({
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "mobile": c.mobile,
                "notes": c.notes
            })
            
        # Admin Invites
        invites = db.query(AdminInvite).all()
        for i in invites:
            backup["admin_invites"].append({
                "id": i.id,
                "email": i.email,
                "employee_id": i.employee_id,
                "invited_at": i.invited_at
            })
            
    except Exception as e:
        print(f"Skipping custom data backup (tables may not exist yet): {e}")
        
    return backup

def seed_db():
    # 1. Backup custom registered user metadata if tables exist
    backup_file = "custom_seeds.json"
    backup = {
        "users": [],
        "buyers": [],
        "fpos": [],
        "consultants": [],
        "admin_invites": []
    }
    
    try:
        db = SessionLocal()
        backup = backup_custom_data(db)
        db.close()
    except Exception:
        pass

    # Save backup to file if we found entries, otherwise retain existing backup file if present
    if backup["users"] or backup["buyers"] or backup["fpos"] or backup["admin_invites"]:
        with open(backup_file, "w") as f:
            json.dump(backup, f, indent=2)
        print("Backup custom registered data to custom_seeds.json completed.")

    # 2. Recreate all tables
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    print("Seeding System Roles...")
    superadmin = SystemRole(id=1, name="Superadmin", description="Full system access", email="admin@mahafpc.in", is_superadmin=True, users_assigned=1)
    manager = SystemRole(id=2, name="Manager", description="Manager access", email="fpo@buyerportal.in", is_superadmin=False, users_assigned=3)
    viewer = SystemRole(id=3, name="Viewer", description="Viewer access", email="portal@buyerportal.in", is_superadmin=False, users_assigned=1)
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

    print("Seeding FPO member farmers...")
    fpo_farmers = [
        Farmer(fpo_id=1, name="Ramesh Patil"),
        Farmer(fpo_id=1, name="Suresh Jadhav"),
        Farmer(fpo_id=1, name="Priya Kulkarni"),
        Farmer(fpo_id=1, name="Ganesh More"),
        Farmer(fpo_id=2, name="Arjun Singh"),
        Farmer(fpo_id=2, name="Vijay Pawar"),
        Farmer(fpo_id=3, name="M. Karthik"),
        Farmer(fpo_id=3, name="S. Ramasamy"),
        Farmer(fpo_id=4, name="P. Selvam"),
        Farmer(fpo_id=4, name="R. Swaminathan"),
    ]
    db.add_all(fpo_farmers)
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
        User(id=6, name="Ritesh Khatakar", email="riteshk@ova.ngo", password_hash=hash_password("admin@123"), role_type=RoleType.mahafpc, system_role_id=1),
    ]
    db.add_all(users)
    db.commit()

    print("Seeding default admin invites...")
    invite = AdminInvite(id=99, email="riteshk@ova.ngo", employee_id="EMP-0925", invited_at=datetime.utcnow().isoformat())
    db.add(invite)
    db.commit()

    print("Skipping mock lots and transaction seeding for a clean initial state.")

    # 3. Load and restore backup custom data
    if os.path.exists(backup_file):
        print("Restoring custom registered data from custom_seeds.json...")
        try:
            with open(backup_file, "r") as f:
                saved = json.load(f)
                
            # Restore Fpos
            for f_data in saved.get("fpos", []):
                if not db.query(Fpo).filter(Fpo.id == f_data["id"]).first():
                    db.add(Fpo(**f_data))
            db.commit()
            
            # Restore Buyers
            for b_data in saved.get("buyers", []):
                if not db.query(Buyer).filter(Buyer.id == b_data["id"]).first():
                    db.add(Buyer(**b_data))
            db.commit()
            
            # Restore Consultants
            for c_data in saved.get("consultants", []):
                if not db.query(Consultant).filter(Consultant.id == c_data["id"]).first():
                    db.add(Consultant(**c_data))
            db.commit()
            
            # Restore Admin Invites
            for i_data in saved.get("admin_invites", []):
                if not db.query(AdminInvite).filter(AdminInvite.email == i_data["email"]).first():
                    db.add(AdminInvite(**i_data))
            db.commit()
            
            # Restore Users
            for u_data in saved.get("users", []):
                if not db.query(User).filter(User.email == u_data["email"]).first():
                    role_str = u_data.pop("role_type")
                    u_data["role_type"] = RoleType(role_str)
                    db.add(User(**u_data))
            db.commit()
            print("Custom data restoration complete!")
        except Exception as e:
            print(f"Error restoring custom seeds: {e}")
    
    from sqlalchemy import text
    if "postgresql" in engine.name:
        db.execute(text("SELECT setval('buyers_id_seq', COALESCE((SELECT MAX(id) FROM buyers), 1))"))
        db.execute(text("SELECT setval('fpos_id_seq', COALESCE((SELECT MAX(id) FROM fpos), 1))"))
        db.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))"))
        db.commit()
        
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_db()
