from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base
import enum

class AgreementStatus(str, enum.Enum):
    PENDING = "pending"      # Ожидает выполнения
    COMPLETED = "completed"  # Выполнено
    MISSED = "missed"        # Пропущено
    CANCELLED = "cancelled"  # Отменено

class Agreement(Base):
    """Договорённость между пользователем и коучем"""
    __tablename__ = "agreements"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=True)
    
    # Что пользователь обещал сделать
    description = Column(Text, nullable=False)
    
    # Дедлайн
    deadline = Column(DateTime(timezone=True), nullable=False)
    
    # Статус
    status = Column(String, default=AgreementStatus.PENDING)
    
    # Было ли отправлено напоминание
    reminder_sent = Column(Boolean, default=False)
    
    # Был ли отправлен чеклист для проверки
    checklist_sent = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    goal = relationship("Goal")

