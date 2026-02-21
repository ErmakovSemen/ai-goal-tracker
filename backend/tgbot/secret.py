import os

# CHAT_ID - это идентификатор чата/канала/группы в Telegram,
# куда backend отправляет отчеты о багах.
TELEGRAM_TARGET_CHAT_ID = "-1001234567890"

# TOKEN берется только из переменной окружения на сервере.
# В репозитории токен не хранится.
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
