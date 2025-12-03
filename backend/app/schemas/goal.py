from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.schemas.milestone import Milestone
from app.schemas.report import Report

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    frequency: Optional[str] = "daily"

class GoalCreate(GoalBase):
    pass

class GoalUpdate(GoalBase):
    title: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None

class GoalInDBBase(GoalBase):
    id: int
    user_id: int
    status: str
    progress: float
    created_at: datetime
    updated_at: Optional[datetime]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class Goal(GoalInDBBase):
    milestones: List[Milestone] = []
    reports: List[Report] = []

class GoalInDB(GoalInDBBase):
    pass