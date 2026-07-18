from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notification import SystemLog
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["logs"])

# Aliases: frontend may send "admin" but backend stores "mahafpc" as the role
ROLE_ALIASES = {
    "admin": ["admin", "mahafpc"],
    "mahafpc": ["admin", "mahafpc"],
}

@router.get("")
def list_logs(
    channel: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 50, offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(SystemLog)
    if channel:
        q = q.filter(SystemLog.channel == channel)
        
    if role:
        # Role param provided — map aliases and filter by recipient_role column
        role_lower = role.strip().lower()
        if role_lower in ROLE_ALIASES:
            q = q.filter(SystemLog.recipient_role.in_(ROLE_ALIASES[role_lower]))
        else:
            q = q.filter(SystemLog.recipient_role == role_lower)
    else:
        # No role param — use current user's role to determine visibility
        from app.models.user import RoleType
        if current_user.role_type == RoleType.buyer:
            q = q.filter(SystemLog.recipient_role == "buyer")
        elif current_user.role_type == RoleType.fpo:
            q = q.filter(SystemLog.recipient_role == "fpo")
        elif current_user.role_type in (RoleType.mahafpc,):
            # MahaFPC / admin users can see both admin and mahafpc-tagged logs
            q = q.filter(SystemLog.recipient_role.in_(["admin", "mahafpc"]))
        elif current_user.role_type == RoleType.consultant:
            # Escrow service sees escrow-tagged logs
            q = q.filter(SystemLog.recipient_role == "escrow")
        # portal role: see portal-tagged logs only
        # (no filter = all): leave if needed for superadmin

    logs = q.order_by(SystemLog.timestamp.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": l.id,
            "channel": l.channel.value if hasattr(l.channel, 'value') else l.channel,
            "recipient": l.recipient,
            "message": l.message,
            "isRead": l.is_read,
            "recipientRole": l.recipient_role,
            "eventType": l.event_type,
            "timestamp": l.timestamp.isoformat() if l.timestamp else ""
        }
        for l in logs
    ]


@router.put("/mark-all-read")
def mark_all_logs_as_read(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_role = (role or current_user.role_type.value).strip().lower()
    q = db.query(SystemLog).filter(SystemLog.is_read == False)
    if active_role in ROLE_ALIASES:
        q = q.filter(SystemLog.recipient_role.in_(ROLE_ALIASES[active_role]))
    elif active_role:
        q = q.filter(SystemLog.recipient_role == active_role)
    
    unread_logs = q.all()
    for l in unread_logs:
        l.is_read = True
    db.commit()
    return {"status": "success", "count": len(unread_logs)}

