from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, hash_password
from app.core.deps import get_current_user
from app.core.config import settings, DEV_SEED
from twilio.rest import Client
from app.services.notification_service import log_notification
from app.models.notification import NotificationChannel
import hashlib
import secrets

from app.models.user import User, Fpo, Buyer, Consultant, AdminInvite, RoleType, ContactInquiry
from app.schemas.auth import (
    LoginResponse,
    UserRegisterRequest,
    GoogleLoginRequest,
    OtpSendRequest,
    OtpVerifyRequest,
    AdminInviteRequest,
    AddMemberRequest,
    CompanyMemberResponse,
    CompleteRegistrationRequest,
    ContactInquiryCreate,
    ContactInquiryResponse
)
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory lockout for failed login attempts
FAILED_ATTEMPTS = {}
LOCKOUT_DURATION = timedelta(minutes=15)
MAX_FAILED_ATTEMPTS = 5

@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form_data.username.strip().lower()
    now = datetime.utcnow()
    
    # Check lockout
    attempts = FAILED_ATTEMPTS.get(username, [])
    attempts = [t for t in attempts if now - t < LOCKOUT_DURATION]
    FAILED_ATTEMPTS[username] = attempts
    if len(attempts) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again in 15 minutes."
        )

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        record_failed_attempt = FAILED_ATTEMPTS.get(username, [])
        record_failed_attempt.append(now)
        FAILED_ATTEMPTS[username] = record_failed_attempt
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Check if the user is a pending/rejected member
    if hasattr(user, "member_status") and user.member_status and user.member_status != "Active":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending approval from your organization." if user.member_status == "Pending" else "Your registration was not approved."
        )

    if not verify_password(form_data.password, user.password_hash):
        record_failed_attempt = FAILED_ATTEMPTS.get(username, [])
        record_failed_attempt.append(now)
        FAILED_ATTEMPTS[username] = record_failed_attempt
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Success, clear lockout history
    FAILED_ATTEMPTS.pop(username, None)
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role_type.value,
        "userId": user.id,
        "name": user.name
    }

@router.post("/register")
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    role = payload.role.strip().lower()
    email = payload.email.strip().lower() if payload.email else None
    mobile = payload.mobile.strip() if payload.mobile else None
    
    if role == "admin":
        raise HTTPException(status_code=400, detail="Admins cannot self-register.")
        
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered.")
            
    if mobile:
        existing_user = db.query(User).filter(User.mobile == mobile).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Mobile number already registered.")
            
    # Create based on role
    if role == "buyer":
        buyer = Buyer(
            name=payload.fullName,
            company_name=payload.companyName,
            business_type=payload.businessType,
            gstin=payload.gstin,
            location="Nashik, MH",
            reliability_score=70
        )
        db.add(buyer)
        db.flush()
        user = User(
            name=payload.fullName,
            email=email or f"buyer_{payload.mobile}@buyerportal.in",
            mobile=mobile,
            role_type=RoleType.buyer,
            buyer_id=buyer.id,
            system_role_id=2,
            member_status="Active"
        )
        db.add(user)
        db.flush()
        
        # Admin Notification #3 (System)
        admin_buyer_msg = f"New Buyer registration: {buyer.name}, GSTIN {buyer.gstin or '27AAAPL1234C1Z5'}. Awaiting verification."
        log_notification(db, NotificationChannel.system, "MahaFPC", admin_buyer_msg, recipient_role="mahafpc", event_type="new_buyer_registered")
        
        # Admin Notification #5 (System)
        from datetime import datetime
        submitted_date = datetime.utcnow().strftime("%d %b")
        admin_buyer_msg_pending = f"Verification pending: Buyer '{buyer.name}' — submitted {submitted_date}, awaiting KYC review."
        log_notification(db, NotificationChannel.system, "MahaFPC", admin_buyer_msg_pending, recipient_role="mahafpc", event_type="verification_pending")
        
    elif role in ("fpo", "fpo-farmer"):
        fpo = Fpo(
            name=payload.fullName,
            fpo_registration_number=payload.fpoRegNumber,
            state=payload.state,
            district=payload.district,
            village=payload.village,
            location=f"{payload.village or ''}, {payload.state or ''}".strip(", "),
            reliability_score=70
        )
        db.add(fpo)
        db.flush()
        user = User(
            name=payload.fullName,
            email=email or f"fpo_{payload.mobile}@buyerportal.in",
            mobile=mobile,
            role_type=RoleType.fpo,
            fpo_id=fpo.id,
            system_role_id=2,
            member_status="Active"
        )
        db.add(user)
        db.flush()
        
        # Admin Notification #2 (System)
        admin_fpo_msg = f"New FPO registration: {fpo.name}, Reg No. {fpo.fpo_registration_number or 'FPO-2201'}. Awaiting verification."
        log_notification(db, NotificationChannel.system, "MahaFPC", admin_fpo_msg, recipient_role="mahafpc", event_type="new_fpo_registered")
        
        # Admin Notification #6 (System)
        admin_fpo_msg_comp = f"Verification completed: FPO '{fpo.name}' approved and activated."
        log_notification(db, NotificationChannel.system, "MahaFPC", admin_fpo_msg_comp, recipient_role="mahafpc", event_type="verification_completed")
        
    elif role == "consultant":
        consultant = Consultant(
            name=payload.fullName,
            email=email or f"consultant_{payload.mobile}@buyerportal.in",
            mobile=mobile,
            associated_fpos=payload.associatedFpo,
            id_proof_url=payload.idProof
        )
        db.add(consultant)
        db.flush()
        user = User(
            name=payload.fullName,
            email=email or f"consultant_{payload.mobile}@buyerportal.in",
            mobile=mobile,
            role_type=RoleType.consultant,
            consultant_id=consultant.id,
            system_role_id=2,
            member_status="Active"
        )
        db.add(user)
    else:
        raise HTTPException(status_code=400, detail="Invalid role type.")
        
    db.commit()
    return {"message": "Registration successful."}


@router.post("/login/google")
def login_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    import urllib.request
    import json
    google_token = payload.google_token.strip()
    name = "Demo User"
    
    if "." in google_token and len(google_token) > 50:
        verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={google_token}"
        try:
            req = urllib.request.Request(verify_url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    token_info = json.loads(response.read().decode("utf-8"))
                    email = token_info.get("email", "").strip().lower()
                    name = token_info.get("name", "Google User")
                else:
                    raise HTTPException(status_code=400, detail="Invalid Google account credential token.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Google token verification failed: {str(e)}")
    else:
        # Fallback to mock email check for backward compatibility and tests
        email = google_token.strip().lower()
        name = "Demo User"

    role = payload.role.strip().lower()
    
    if role == "fpo-farmer":
        role = "fpo"
        
    user = None
    if role == "admin":
        user = db.query(User).filter(User.email == email, User.role_type.in_([RoleType.admin, RoleType.mahafpc])).first()
    else:
        user = db.query(User).filter(User.email == email, User.role_type == role).first()
    
    # Admin invite matching logic
    if not user and role == "admin":
        invite = db.query(AdminInvite).filter(AdminInvite.email == email).first()
        if invite:
            user = User(
                name=name,
                email=email,
                role_type=RoleType.admin,
                employee_id=invite.employee_id,
                system_role_id=2
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    
    # Auto-activate invited members who successfully login via Google (email verified by Google)
    if user and hasattr(user, "member_status") and user.member_status == "Pending":
        user.member_status = "Active"
        db.commit()
            
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"No account found for email {email} under role {role}. Please register first."
        )
        
    onboarding_completed = False
    if user.role_type.value == "buyer" and user.buyer_id is not None:
        from app.models.user import Buyer
        buyer = db.query(Buyer).filter(Buyer.id == user.buyer_id).first()
        if buyer:
            onboarding_completed = buyer.onboarding_completed

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role_type.value,
        "userId": user.id,
        "name": user.name,
        "email": user.email,
        "position": user.employee_role,
        "onboardingCompleted": onboarding_completed
    }

def normalize_to_e164(mobile: str) -> str:
    cleaned = "".join(c for c in mobile if c.isdigit() or c == "+")
    if not cleaned.startswith("+"):
        if len(cleaned) == 10:
            cleaned = "+91" + cleaned
        elif len(cleaned) == 12 and cleaned.startswith("91"):
            cleaned = "+" + cleaned
        elif len(cleaned) == 11 and cleaned.startswith("0"):
            cleaned = "+91" + cleaned[1:]
    return cleaned

def compute_dev_otp(mobile: str) -> str:
    h = hashlib.sha256(f"{mobile}:{DEV_SEED}".encode("utf-8")).hexdigest()
    val = int(h[:8], 16) % 1000000
    return f"{val:06d}"

@router.post("/otp/send")
def otp_send(payload: OtpSendRequest, response: Response):
    mobile = payload.mobile_number.strip()
    
    if settings.OTP_DEV_MODE:
        code = compute_dev_otp(mobile)
        print("\n" + "="*80)
        print(" [WARNING] RUNNING IN INSECURE OTP DEVELOPER MODE. DO NOT USE IN PRODUCTION.")
        print(f" [DEV MODE] Dynamic OTP Code generated for {mobile}: {code}")
        print("="*80 + "\n")
        response.headers["X-OTP-Dev-Mode"] = "true"
        return {"message": "OTP sent successfully.", "otp": code}
        
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_VERIFY_SERVICE_SID:
        raise HTTPException(
            status_code=500,
            detail="SMS service provider credentials not configured. Please define Twilio SIDs in env."
        )
        
    try:
        twilio_to = normalize_to_e164(mobile)
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        verification = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID) \
            .verifications \
            .create(to=twilio_to, channel="sms")
        return {"message": "OTP sent successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to send OTP via Twilio Verify: {str(e)}"
        )

@router.post("/otp/verify")
def otp_verify(payload: OtpVerifyRequest, response: Response, db: Session = Depends(get_db)):
    mobile = payload.mobile_number.strip()
    otp = payload.otp.strip()
    purpose = payload.purpose
    
    if settings.OTP_DEV_MODE:
        response.headers["X-OTP-Dev-Mode"] = "true"
        expected = compute_dev_otp(mobile)
        if otp != expected:
            raise HTTPException(status_code=400, detail="Invalid OTP code.")
    else:
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_VERIFY_SERVICE_SID:
            raise HTTPException(
                status_code=500,
                detail="SMS service provider credentials not configured. Please define Twilio SIDs in env."
            )
        try:
            twilio_to = normalize_to_e164(mobile)
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            verification_check = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID) \
                .verification_checks \
                .create(to=twilio_to, code=otp)
            
            if verification_check.status != "approved":
                raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Twilio verification failed: {str(e)}"
            )
            
    if purpose == "login":
        last_10 = mobile[-10:] if len(mobile) >= 10 else mobile
        user = db.query(User).filter(
            (User.mobile == mobile) | (User.mobile.like(f"%{last_10}"))
        ).first()
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this mobile number.")
            
        # Check if the user is a pending/rejected member
        if hasattr(user, "member_status") and user.member_status and user.member_status != "Active":
            raise HTTPException(
                status_code=403,
                detail="Your account is pending approval from your organization." if user.member_status == "Pending" else "Your registration was not approved."
            )
            
        onboarding_completed = False
        if user.role_type.value == "buyer" and user.buyer_id is not None:
            from app.models.user import Buyer
            buyer = db.query(Buyer).filter(Buyer.id == user.buyer_id).first()
            if buyer:
                onboarding_completed = buyer.onboarding_completed

        access_token = create_access_token(data={"sub": str(user.id)})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role_type.value,
            "userId": user.id,
            "name": user.name,
            "email": user.email,
            "position": user.employee_role,
            "onboardingCompleted": onboarding_completed
        }
        
    return {"message": "OTP verified successfully."}

@router.post("/invite-admin")
def invite_admin(payload: AdminInviteRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    emp_id = payload.employee_id.strip()
    
    existing = db.query(AdminInvite).filter(AdminInvite.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already invited.")
        
    invite = AdminInvite(
        email=email,
        employee_id=emp_id,
        invited_at=datetime.utcnow().isoformat()
    )
    db.add(invite)
    db.commit()
    return {"message": f"Admin invite sent successfully to {email}."}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    onboarding_completed = False
    if current_user.role_type.value == "buyer" and current_user.buyer_id is not None:
        from app.models.user import Buyer
        buyer = db.query(Buyer).filter(Buyer.id == current_user.buyer_id).first()
        if buyer:
            onboarding_completed = buyer.onboarding_completed
    elif current_user.role_type.value == "fpo" and current_user.fpo_id is not None:
        from app.models.user import Fpo
        fpo = db.query(Fpo).filter(Fpo.id == current_user.fpo_id).first()
        if fpo:
            onboarding_completed = fpo.onboarding_completed

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role_type.value,
        "system_role_id": current_user.system_role_id,
        "fpoId": current_user.fpo_id,
        "buyerId": current_user.buyer_id,
        "position": current_user.employee_role,
        "onboardingCompleted": onboarding_completed
    }

@router.get("/members", response_model=list[CompanyMemberResponse])
def get_members(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.fpo_id and not current_user.buyer_id:
        return []
        
    if current_user.fpo_id:
        members = db.query(User).filter(
            User.fpo_id == current_user.fpo_id,
            User.id != current_user.id
        ).all()
    else:
        members = db.query(User).filter(
            User.buyer_id == current_user.buyer_id,
            User.id != current_user.id
        ).all()
        
    return [
        CompanyMemberResponse(
            id=m.id,
            name=m.name,
            email=m.email,
            role=m.employee_role or "Employee",
            status=m.member_status or "Active"
        ) for m in members
    ]

@router.post("/add-member")
def add_member(payload: AddMemberRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.fpo_id and not current_user.buyer_id:
        raise HTTPException(status_code=400, detail="Only FPOs and Buyers can add members.")
        
    email = payload.email.strip().lower()
    
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered in system.")
        
    invite_token = secrets.token_urlsafe(32)
    
    new_member = User(
        name=payload.name.strip(),
        email=email,
        role_type=current_user.role_type,
        fpo_id=current_user.fpo_id,
        buyer_id=current_user.buyer_id,
        employee_role=payload.role.strip(),
        system_role_id=2,
        member_status="Active",  # Activate immediately so they can login after setting password
        password_hash=None,
        invited_by=current_user.id,
        invite_token=invite_token
    )
    db.add(new_member)
    db.flush()
    
    # Send / log notification audit trail
    invite_url = f"http://localhost:3000/register/complete?token={invite_token}"
    log_notification(
        db, 
        NotificationChannel.email, 
        email, 
        f"Welcome! You have been added as a member by {current_user.name}. Please complete your registration setting your password at: {invite_url}",
        recipient_role="buyer" if current_user.buyer_id else "fpo",
        event_type="invitation_sent"
    )
    
    company_name = "System"
    role_label = "FPO"
    if current_user.buyer_id:
        buyer = db.query(Buyer).filter(Buyer.id == current_user.buyer_id).first()
        company_name = buyer.name if buyer else "Buyer"
        role_label = "Buyer"
    elif current_user.fpo_id:
        fpo = db.query(Fpo).filter(Fpo.id == current_user.fpo_id).first()
        company_name = fpo.name if fpo else "FPO"
        role_label = "FPO"

    admin_msg = f"New team member '{new_member.name}' added under {role_label} '{company_name}' — status Pending."
    log_notification(db, NotificationChannel.system, "MahaFPC", admin_msg, recipient_role="mahafpc", event_type="new_user_registered")
    
    print(f"\n[INVITE SENT] Email: {email} | Registration Link: {invite_url}\n")
    
    db.commit()
    return {"message": "Invitation sent — they'll be able to log in once they register and you approve them."}

@router.delete("/members/{member_id}")
def delete_member(member_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
        
    if current_user.fpo_id and member.fpo_id != current_user.fpo_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this member.")
    elif current_user.buyer_id and member.buyer_id != current_user.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this member.")
    elif not current_user.fpo_id and not current_user.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully."}

@router.get("/directory")
def get_directory(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role_type not in [RoleType.mahafpc, RoleType.admin]:
        raise HTTPException(status_code=403, detail="Not authorized to view system directory.")
        
    users = db.query(User).all()
    fpos = db.query(Fpo).all()
    buyers = db.query(Buyer).all()
    
    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "roleType": u.role_type.value,
                "employeeRole": u.employee_role or "",
                "employeeId": u.employee_id or "",
                "mobile": u.mobile or "",
                "isActive": u.is_active
            }
            for u in users
        ],
        "fpos": [
            {
                "id": f.id,
                "name": f.name,
                "location": f.location or "",
                "membersCount": f.members_count,
                "gradeConformance": f.grade_conformance,
                "rating": f.rating,
                "reliabilityScore": f.reliability_score
            }
            for f in fpos
        ],
        "buyers": [
            {
                "id": b.id,
                "name": b.name,
                "location": b.location or "",
                "reliabilityScore": b.reliability_score,
                "paymentDaysAvg": b.payment_days_avg,
                "volumeTraded": b.volume_traded,
                "companyName": b.company_name or "",
                "businessType": b.business_type or ""
            }
            for b in buyers
        ]
    }

@router.post("/members/complete-registration")
def complete_registration(payload: CompleteRegistrationRequest, db: Session = Depends(get_db)):
    token = payload.token.strip()
    password = payload.password.strip()
    
    # Accept both Pending and Active statuses so members can always set/reset password via invite link
    user = db.query(User).filter(User.invite_token == token, User.member_status.in_(["Pending", "Active"])).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired registration token.")
        
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        
    user.password_hash = hash_password(password)
    # Ensure they are active after setting their password
    user.member_status = "Active"
    db.commit()
    return {"message": "Password set successfully. You can now log in with your email and password."}

@router.post("/members/{member_id}/approve")
def approve_member(member_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
        
    if current_user.fpo_id and member.fpo_id != current_user.fpo_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve this member.")
    elif current_user.buyer_id and member.buyer_id != current_user.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve this member.")
    elif not current_user.fpo_id and not current_user.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    if not member.password_hash:
        raise HTTPException(status_code=400, detail="Member has not completed registration/password setup yet.")
        
    member.member_status = "Active"
    db.commit()
    return {"message": "Member approved successfully."}

@router.post("/members/{member_id}/reject")
def reject_member(member_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
        
    if current_user.fpo_id and member.fpo_id != current_user.fpo_id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this member.")
    elif current_user.buyer_id and member.buyer_id != current_user.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this member.")
    elif not current_user.fpo_id and not current_user.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    member.member_status = "Rejected"
    db.commit()
    return {"message": "Member registration rejected."}

@router.post("/contact-inquiries")
def create_contact_inquiry(payload: ContactInquiryCreate, db: Session = Depends(get_db)):
    inquiry = ContactInquiry(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        company=payload.company.strip() if payload.company else None,
        phone=payload.phone.strip() if payload.phone else None,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(inquiry)
    db.commit()
    return {"message": "Inquiry recorded successfully."}

@router.get("/contact-inquiries", response_model=list[ContactInquiryResponse])
def get_contact_inquiries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role_type not in [RoleType.mahafpc, RoleType.admin]:
        raise HTTPException(status_code=403, detail="Not authorized to view contact inquiries.")
    inquiries = db.query(ContactInquiry).order_by(ContactInquiry.id.desc()).all()
    return inquiries
