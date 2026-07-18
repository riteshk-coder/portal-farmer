from sqlalchemy import Column, String, Integer, Enum as SAEnum, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class NotificationChannel(str, enum.Enum):
    whatsapp = "WhatsApp"
    email = "Email"
    system = "System"
    sms = "SMS"

class SystemLog(Base):
    __tablename__ = "system_logs"
    id = Column(String, primary_key=True)
    channel = Column(SAEnum(NotificationChannel))
    recipient = Column(String)
    message = Column(Text)
    recipient_role = Column(String, nullable=True)
    event_type = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

