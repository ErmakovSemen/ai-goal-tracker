# API Testing Guide

## Быстрое тестирование API

Используйте скрипт `backend/test_api.sh` для тестирования всех API endpoints.

### Использование:

```bash
cd backend
./test_api.sh [endpoint]
```

### Доступные команды:

- `./test_api.sh root` - Тест корневого endpoint
- `./test_api.sh goal` - Тест endpoints для целей
- `./test_api.sh milestone` - Тест endpoints для milestones
- `./test_api.sh chat` - Тест endpoints для чатов и сообщений
- `./test_api.sh all` - Тест всех endpoints (по умолчанию)

### Примеры:

```bash
# Тест корневого endpoint
./test_api.sh root

# Тест создания цели
./test_api.sh goal

# Тест отправки сообщения в чат
./test_api.sh chat

# Тест всех endpoints
./test_api.sh all
```

## Ручное тестирование с curl

### 1. Проверка бэкенда:
```bash
curl http://localhost:8000/
```

### 2. Создание цели:
```bash
curl -X POST "http://localhost:8000/api/goals/?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Goal","description":"Goal description"}'
```

### 3. Получение целей:
```bash
curl "http://localhost:8000/api/goals/?user_id=1"
```

### 4. Создание milestone:
```bash
curl -X POST "http://localhost:8000/api/milestones/" \
  -H "Content-Type: application/json" \
  -d '{"title":"Milestone 1","goal_id":1}'
```

### 5. Получение milestones:
```bash
curl "http://localhost:8000/api/milestones/?goal_id=1"
```

### 6. Создание чата:
```bash
curl -X POST "http://localhost:8000/api/chats/" \
  -H "Content-Type: application/json" \
  -d '{"goal_id":1}'
```

### 7. Отправка сообщения:
```bash
curl -X POST "http://localhost:8000/api/chats/1/messages/" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello","sender":"user"}'
```

### 8. Получение сообщений:
```bash
curl "http://localhost:8000/api/chats/1/messages/"
```

## Простое тестирование

Для быстрого тестирования без цветного вывода используйте:
```bash
cd backend
./test_api_simple.sh
```

Этот скрипт всегда показывает полный ответ от API, даже если есть ошибки.

## Отладка

Если скрипт не работает:
1. Убедитесь, что бэкенд запущен: `curl http://localhost:8000/`
2. Проверьте логи бэкенда в терминале, где запущен uvicorn
3. Используйте режим отладки в браузере (F12) для просмотра ошибок
4. Все ошибки теперь показываются полностью в режиме отладки в UI

## Автоматическое тестирование

Скрипт `test_api.sh` автоматически:
- Показывает HTTP статус код
- Форматирует JSON ответы
- Выводит понятные сообщения об ошибках
- Предлагает решение, если бэкенд не запущен

