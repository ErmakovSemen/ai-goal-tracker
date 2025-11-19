from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.message import Message

class ChatBase(BaseModel):
    title: str

class ChatCreate(ChatBase):
    goal_id: int

class ChatUpdate(ChatBase):
    title: Optional[str] = None

class ChatInDBBase(ChatBase):
    id: int
    goal_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True

class Chat(ChatInDBBase):
    messages: List[Message] = []

class ChatInDB(ChatInDBBase):
    pass