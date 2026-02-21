from typing import Optional

from pydantic import BaseModel


class SendTextRequest(BaseModel):
    text: str
    source: Optional[str] = None
    app_version: Optional[str] = None


class TelegramSendResponse(BaseModel):
    telegram_message_id: int
