from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: date

class MilestoneCreate(MilestoneBase):
    goal_id: int

class MilestoneUpdate(MilestoneBase):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    progress: Optional[float] = None

class MilestoneInDBBase(MilestoneBase):
    id: int
    goal_id: int
    progress: float
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True

class Milestone(MilestoneInDBBase):
    pass

class MilestoneInDB(MilestoneInDBBase):
    pass