from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class AgreementStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    MISSED = "missed"
    CANCELLED = "cancelled"

class AgreementBase(BaseModel):
    description: str
    deadline: datetime

class AgreementCreate(AgreementBase):
    goal_id: int
    chat_id: Optional[int] = None

class AgreementUpdate(BaseModel):
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[AgreementStatus] = None
    reminder_sent: Optional[bool] = None
    checklist_sent: Optional[bool] = None

class Agreement(AgreementBase):
    id: int
    goal_id: int
    chat_id: Optional[int]
    status: str
    reminder_sent: bool
    checklist_sent: bool
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

