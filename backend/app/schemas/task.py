from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    milestone_id: Optional[int] = None
    goal_id: int
    due_date: Optional[datetime] = None
    priority: Optional[str] = "medium"  # low, medium, high

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    milestone_id: Optional[int] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    priority: Optional[str] = None
    completed_at: Optional[datetime] = None

class Task(TaskBase):
    id: int
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

