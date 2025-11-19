from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class ReportBase(BaseModel):
    content: str
    report_date: date

class ReportCreate(ReportBase):
    goal_id: int

class ReportUpdate(ReportBase):
    content: Optional[str] = None

class ReportInDBBase(ReportBase):
    id: int
    goal_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True

class Report(ReportInDBBase):
    pass

class ReportInDB(ReportInDBBase):
    pass