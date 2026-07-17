from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
u = db.query(User).filter(User.email == "riteshk@ova.ngo").first()
if u:
    print(f"User found: ID={u.id}, Name={u.name}, Email={u.email}, Role={u.role_type}, Status={u.member_status}")
else:
    print("User NOT found")
db.close()
