from typing import Optional

from telebot import TeleBot, apihelper
from telebot.apihelper import ApiTelegramException

from tgbot.config import TELEGRAM_TIMEOUT_SECONDS, validate_telegram_config
from tgbot.exceptions import TelegramTransportError
from tgbot.secret import TELEGRAM_BOT_TOKEN

_bot: Optional[TeleBot] = None


def configure_telegram_runtime() -> None:
    # Fail-fast for missing token/chat id is triggered during startup via this call.
    validate_telegram_config()
    apihelper.CONNECT_TIMEOUT = TELEGRAM_TIMEOUT_SECONDS
    apihelper.READ_TIMEOUT = TELEGRAM_TIMEOUT_SECONDS


def _get_bot() -> TeleBot:
    global _bot
    if _bot is None:
        validate_telegram_config()
        _bot = TeleBot(TELEGRAM_BOT_TOKEN, parse_mode=None)
    return _bot


def send_text(chat_id: str, text: str) -> int:
    try:
        message = _get_bot().send_message(chat_id=chat_id, text=text, disable_web_page_preview=True)
        return int(message.message_id)
    except ApiTelegramException as exc:
        raise TelegramTransportError(
            f"Ошибка Telegram API при отправке текста: HTTP {getattr(exc, 'error_code', 'unknown')}."
        ) from exc
    except Exception as exc:
        raise TelegramTransportError("Не удалось отправить текст в Telegram.") from exc


def send_photo(chat_id: str, photo_bytes: bytes, filename: str, caption: Optional[str] = None) -> int:
    try:
        safe_name = filename or "photo.jpg"
        message = _get_bot().send_photo(
            chat_id=chat_id,
            photo=(safe_name, photo_bytes),
            caption=caption or None,
        )
        return int(message.message_id)
    except ApiTelegramException as exc:
        raise TelegramTransportError(
            f"Ошибка Telegram API при отправке фото: HTTP {getattr(exc, 'error_code', 'unknown')}."
        ) from exc
    except Exception as exc:
        raise TelegramTransportError("Не удалось отправить фото в Telegram.") from exc
