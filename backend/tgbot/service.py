import asyncio
from typing import Optional

from fastapi import UploadFile

from tgbot.client import send_photo, send_text
from tgbot.exceptions import TelegramValidationError
from tgbot.schemas import SendTextRequest
from tgbot.secret import TELEGRAM_TARGET_CHAT_ID
from tgbot.utils import (
    build_caption,
    build_text_message,
    parse_meta,
    validate_photo_payload,
    validate_text_payload,
)


def send_text_report(payload: SendTextRequest, user_id: int) -> int:
    text = validate_text_payload(payload.text)
    telegram_text = build_text_message(
        text=text,
        user_id=user_id,
        source=payload.source,
        app_version=payload.app_version,
    )
    return send_text(TELEGRAM_TARGET_CHAT_ID, telegram_text)


async def send_photo_report(
    photo: UploadFile,
    user_id: int,
    caption: Optional[str] = None,
    meta: Optional[str] = None,
) -> int:
    if photo is None:
        raise TelegramValidationError("Файл изображения не передан.")

    content = await photo.read()
    validate_photo_payload(photo.content_type, len(content))
    meta_payload = parse_meta(meta)
    telegram_caption = build_caption(caption=caption, user_id=user_id, meta=meta_payload)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: send_photo(
            TELEGRAM_TARGET_CHAT_ID,
            photo_bytes=content,
            filename=photo.filename or "photo.jpg",
            caption=telegram_caption,
        ),
    )
