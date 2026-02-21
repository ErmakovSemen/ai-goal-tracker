import json
from typing import Optional

from tgbot.config import ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES
from tgbot.exceptions import TelegramValidationError


def validate_text_payload(text: str) -> str:
    normalized = (text or "").strip()
    if not normalized:
        raise TelegramValidationError("Текст сообщения не должен быть пустым.")
    return normalized


def validate_photo_payload(content_type: Optional[str], file_size: int) -> None:
    if not content_type or content_type not in ALLOWED_PHOTO_MIME_TYPES:
        raise TelegramValidationError(
            "Неподдерживаемый формат изображения. Разрешены JPEG, PNG, WEBP."
        )
    if file_size <= 0:
        raise TelegramValidationError("Файл изображения пустой.")
    if file_size > MAX_PHOTO_SIZE_BYTES:
        raise TelegramValidationError("Файл слишком большой. Максимум 10 MB.")


def parse_meta(meta: Optional[str]) -> Optional[dict]:
    if meta is None:
        return None

    meta_text = meta.strip()
    if not meta_text:
        return None

    try:
        parsed = json.loads(meta_text)
    except json.JSONDecodeError:
        return {"raw": meta_text}

    if isinstance(parsed, dict):
        return parsed

    return {"raw": meta_text}


def build_text_message(
    text: str,
    user_id: int,
    source: Optional[str] = None,
    app_version: Optional[str] = None,
) -> str:
    lines = [
        "Bug report",
        f"user_id: {user_id}",
    ]
    if source:
        lines.append(f"source: {source}")
    if app_version:
        lines.append(f"app_version: {app_version}")
    lines.extend(["", text])
    return "\n".join(lines)


def build_caption(
    caption: Optional[str],
    user_id: int,
    meta: Optional[dict] = None,
) -> str:
    lines = [f"user_id: {user_id}"]
    if caption and caption.strip():
        lines.append(caption.strip())
    if meta:
        lines.append(f"meta: {json.dumps(meta, ensure_ascii=False)}")
    return "\n".join(lines)
