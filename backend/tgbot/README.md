# Telegram backend module

Этот модуль содержит всю Telegram-логику для отправки bug-репортов в чат.

## Структура

- `secret.py` - CHAT_ID и чтение TOKEN из env
- `config.py` - лимиты и fail-fast валидация
- `client.py` - pyTelegramBotAPI клиент и runtime timeout
- `service.py` - бизнес-логика отправки текста/фото
- `schemas.py` - request/response схемы
- `exceptions.py` - доменные ошибки
- `utils.py` - валидация и форматирование

## Секреты

- `TELEGRAM_TARGET_CHAT_ID` хранится в `secret.py` (по принятому решению).
- `TELEGRAM_BOT_TOKEN` берется только из переменной окружения `TELEGRAM_BOT_TOKEN`.
- Если токен пустой, `configure_telegram_runtime()` вызывает fail-fast ошибку конфигурации.

## API

### POST `/api/tgbot/send-text`

Требует Bearer токен авторизации.

Body (JSON):

```json
{
  "text": "Описание бага",
  "source": "mobile",
  "app_version": "1.2.3"
}
```

Success (`200`):

```json
{
  "telegram_message_id": 12345
}
```

Errors: `4xx/5xx` с полем `detail`.

### POST `/api/tgbot/send-photo`

Требует Bearer токен авторизации.

`multipart/form-data`:
- `photo` (required)
- `caption` (optional)
- `meta` (optional, JSON string or plain text)

Success (`200`):

```json
{
  "telegram_message_id": 12346
}
```

## Ограничения фото

- MIME: `image/jpeg`, `image/png`, `image/webp`
- Размер: до `10 MB`

## Локальная проверка (curl)

```bash
curl -X POST "http://localhost:8000/api/tgbot/send-text" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"test from backend\"}"
```

```bash
curl -X POST "http://localhost:8000/api/tgbot/send-photo" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "photo=@/path/to/image.jpg" \
  -F "caption=photo test" \
  -F "meta={\"platform\":\"android\"}"
```

## Примечание по запуску

Пакет расположен в `backend/tgbot`. Запуск backend должен выполняться из директории `backend`
(или с корректным `PYTHONPATH`), чтобы импорт `tgbot` разрешался корректно.
