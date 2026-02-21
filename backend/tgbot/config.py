from tgbot.exceptions import TelegramConfigError
from tgbot.secret import TELEGRAM_BOT_TOKEN, TELEGRAM_TARGET_CHAT_ID

TELEGRAM_TIMEOUT_SECONDS = 15
MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_PHOTO_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


def validate_telegram_config() -> None:
    if not TELEGRAM_BOT_TOKEN:
        raise TelegramConfigError(
            "Telegram не настроен: отсутствует TELEGRAM_BOT_TOKEN в переменных окружения."
        )
    if not TELEGRAM_TARGET_CHAT_ID:
        raise TelegramConfigError(
            "Telegram не настроен: отсутствует TELEGRAM_TARGET_CHAT_ID в secret.py."
        )
