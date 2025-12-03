from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageBase(BaseModel):
    content: str
    sender: str

class MessageCreate(MessageBase):
    chat_id: Optional[int] = None  # Will be set from URL parameter, not required in body

class MessageUpdate(MessageBase):
    content: Optional[str] = None

class MessageInDBBase(MessageBase):
    id: int
    chat_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Message(MessageInDBBase):
    pass

class MessageInDB(MessageInDBBase):
    pass