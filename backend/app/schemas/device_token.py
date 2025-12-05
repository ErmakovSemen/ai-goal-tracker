from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DeviceTokenBase(BaseModel):
    token: str
    platform: str  # 'android', 'ios', 'web'
    device_id: Optional[str] = None

class DeviceTokenCreate(DeviceTokenBase):
    user_id: int

class DeviceTokenUpdate(BaseModel):
    is_active: Optional[bool] = None
    last_used_at: Optional[datetime] = None

class DeviceToken(DeviceTokenBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used_at: datetime

    class Config:
        from_attributes = True

