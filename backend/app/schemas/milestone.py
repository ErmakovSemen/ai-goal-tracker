from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None  # Make optional for easier creation

class MilestoneCreate(MilestoneBase):
    goal_id: int

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    completed: Optional[bool] = None  # Alias for is_completed
    progress: Optional[float] = None
    target_date: Optional[date] = None  # Deadline

class MilestoneInDBBase(MilestoneBase):
    id: int
    goal_id: int
    progress: float
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
        from_attributes = True  # Pydantic v2
    
    @property
    def completed(self) -> bool:
        """Alias for is_completed for frontend compatibility"""
        return self.is_completed

class Milestone(MilestoneInDBBase):
    pass

class MilestoneInDB(MilestoneInDBBase):
    pass