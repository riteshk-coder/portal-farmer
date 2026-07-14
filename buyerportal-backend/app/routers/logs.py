from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notification import SystemLog
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("")
def list_logs(
    channel: Optional[str] = None,
    limit: int = 50, offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(SystemLog)
    if channel:
        q = q.filter(SystemLog.channel == channel)
    logs = q.order_by(SystemLog.timestamp.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": l.id,
            "channel": l.channel.value if hasattr(l.channel, 'value') else l.channel,
            "recipient": l.recipient,
            "message": l.message,
            "timestamp": l.timestamp.strftime("%d %b %Y %H:%M:%S") if l.timestamp else ""
        }
        for l in logs
    ]
