class TelegramError(Exception):
    """Base exception for Telegram integration errors."""


class TelegramConfigError(TelegramError):
    """Raised when Telegram configuration is invalid."""


class TelegramValidationError(TelegramError):
    """Raised when request payload is invalid."""


class TelegramTransportError(TelegramError):
    """Raised when Telegram API is unavailable or fails."""
