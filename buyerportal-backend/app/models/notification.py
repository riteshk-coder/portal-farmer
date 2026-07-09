from sqlalchemy import Column, String, Integer, Enum as SAEnum, DateTime, Text
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
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
