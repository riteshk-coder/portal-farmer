from typing import Optional
import random
from sqlalchemy.orm import Session
from app.models.notification import SystemLog, NotificationChannel


def generate_log_id() -> str:
    return f"LOG-{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=5))}"

def log_notification(
    db: Session,
    channel: NotificationChannel,
    recipient: str,
    message: str,
    recipient_role: Optional[str] = None,
    event_type: Optional[str] = None
) -> SystemLog:
    """
    Utility helper that logs system messages, emails, and SMS alerts into the DB audit table.
    """
    log_entry = SystemLog(
        id=generate_log_id(),
        channel=channel,
        recipient=recipient,
        message=message,
        recipient_role=recipient_role,
        event_type=event_type,
        is_read=False
    )
    db.add(log_entry)
    db.commit()
    return log_entry

