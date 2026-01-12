# 🧪 Инструкция по запуску проекта для тестирования

## 🎯 Быстрый запуск (Docker) - Рекомендуется

### Шаг 1: Установите Docker и Docker Compose
- [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/)

### Шаг 2: Запустите проект
```bash
# В корне проекта
docker-compose up --build
```

Это запустит:
- ✅ PostgreSQL базу данных (порт 5432)
- ✅ Backend API (порт 8000)

### Шаг 3: Проверьте работу
Откройте в браузере:
- **API**: http://localhost:8000
- **Документация API**: http://localhost:8000/docs
- **Альтернативная документация**: http://localhost:8000/redoc

---

## 🔧 Локальный запуск (для разработки)

### Вариант 1: С PostgreSQL (рекомендуется)

#### Шаг 1: Установите PostgreSQL
- Windows: [PostgreSQL для Windows](https://www.postgresql.org/download/windows/)
- Или используйте Docker только для БД:
  ```bash
  docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_goal_tracker -p 5432:5432 postgres:13
  ```

#### Шаг 2: Настройте Backend

```bash
# Перейдите в папку backend
cd backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте виртуальное окружение
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt
```

#### Шаг 3: Создайте файл .env

Создайте файл `backend/.env` на основе `backend/env.example.txt`:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_goal_tracker

# JWT Security
SECRET_KEY=test-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# LLM Configuration
# Вариант 1: Ollama (локальный, бесплатный)
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:7b
OLLAMA_URL=http://localhost:11434

# Вариант 2: Groq (бесплатный API)
# LLM_PROVIDER=groq
# LLM_API_KEY=your-groq-api-key
# LLM_MODEL=llama-3.1-8b-instant

# CORS
CORS_ORIGINS=*

# Port
PORT=8000
```

#### Шаг 4: Настройте LLM провайдер

**Вариант A: Ollama (локальный, бесплатный)**

1. Установите Ollama: https://ollama.ai
2. Запустите Ollama:
   ```bash
   ollama serve
   ```
3. Скачайте модель:
   ```bash
   ollama pull qwen2.5:7b
   ```

**Вариант B: Groq (бесплатный API)**

1. Зарегистрируйтесь на https://console.groq.com
2. Создайте API ключ
3. Добавьте в `.env`:
   ```env
   LLM_PROVIDER=groq
   LLM_API_KEY=ваш-ключ-здесь
   LLM_MODEL=llama-3.1-8b-instant
   ```

#### Шаг 5: Запустите Backend

```bash
# Убедитесь, что виртуальное окружение активировано
cd backend
uvicorn app.main:app --reload
```

Backend будет доступен на: http://localhost:8000

---

### Вариант 2: Без PostgreSQL (SQLite для тестов)

Если не хотите устанавливать PostgreSQL, проект автоматически использует SQLite:

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt

# Создайте минимальный .env
echo SECRET_KEY=test-key > .env
echo LLM_PROVIDER=ollama >> .env

# Запустите
uvicorn app.main:app --reload
```

⚠️ **Примечание**: SQLite используется только если PostgreSQL недоступен. Для продакшена нужен PostgreSQL.

---

## 🧪 Тестирование API

### 1. Проверка работы API

```bash
# Проверка главной страницы
curl http://localhost:8000/

# Должен вернуть: {"message":"AI Goal Tracker API"}
```

### 2. Регистрация пользователя

```bash
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&email=test@example.com&password=testpass123"
```

Ответ должен содержать `access_token`.

### 3. Вход пользователя

```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```

### 4. Тест LLM

```bash
curl http://localhost:8000/test-llm
```

Проверяет настройку LLM провайдера.

### 5. Интерактивная документация

Откройте в браузере:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Здесь можно тестировать все endpoints через веб-интерфейс!

---

## 🎨 Запуск Frontend (опционально)

### Шаг 1: Установите Node.js
- [Node.js 18+](https://nodejs.org/)

### Шаг 2: Установите зависимости

```bash
cd frontend
npm install
```

### Шаг 3: Настройте API URL

Создайте файл `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000
```

### Шаг 4: Запустите Frontend

```bash
npm start
```

Frontend будет доступен на: http://localhost:3000

---

## 🔍 Проверка работы всех компонентов

### 1. Проверка базы данных

Если используете PostgreSQL через Docker:
```bash
docker exec -it postgres psql -U postgres -d ai_goal_tracker -c "\dt"
```

Должны увидеть таблицы: users, goals, chats, messages и т.д.

### 2. Проверка логов Backend

При запуске `uvicorn app.main:app --reload` вы должны увидеть:
```
INFO:     Started server process
INFO:     Waiting for application startup.
✅ Database tables created/verified successfully
✅ Proactive messaging service started
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3. Проверка LLM

```bash
curl http://localhost:8000/test-llm
```

Должен вернуть информацию о настройке LLM.

---

## 🐛 Решение проблем

### Проблема: "Could not create database tables"

**Решение:**
1. Убедитесь, что PostgreSQL запущен
2. Проверьте настройки в `.env`
3. Проверьте подключение:
   ```bash
   psql -U postgres -h localhost -d ai_goal_tracker
   ```

### Проблема: "Ollama is not running"

**Решение:**
1. Установите Ollama: https://ollama.ai
2. Запустите: `ollama serve`
3. Проверьте: `curl http://localhost:11434/api/tags`

### Проблема: "Module not found"

**Решение:**
1. Убедитесь, что виртуальное окружение активировано
2. Переустановите зависимости: `pip install -r requirements.txt`

### Проблема: Порт 8000 занят

**Решение:**
Используйте другой порт:
```bash
uvicorn app.main:app --reload --port 8001
```

---

## 📝 Быстрая команда для тестирования

Создайте файл `test_api.sh` (Linux/Mac) или `test_api.bat` (Windows):

**Windows (test_api.bat):**
```batch
@echo off
echo Testing API...
curl http://localhost:8000/
curl http://localhost:8000/test-llm
echo.
echo Testing registration...
curl -X POST "http://localhost:8000/register" -H "Content-Type: application/x-www-form-urlencoded" -d "username=test&email=test@test.com&password=test123"
pause
```

**Linux/Mac (test_api.sh):**
```bash
#!/bin/bash
echo "Testing API..."
curl http://localhost:8000/
echo ""
curl http://localhost:8000/test-llm
echo ""
echo "Testing registration..."
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&email=test@test.com&password=test123"
```

---

## ✅ Чек-лист готовности к тестированию

- [ ] PostgreSQL установлен и запущен (или Docker запущен)
- [ ] Python 3.9+ установлен
- [ ] Виртуальное окружение создано и активировано
- [ ] Зависимости установлены (`pip install -r requirements.txt`)
- [ ] Файл `.env` создан и настроен
- [ ] LLM провайдер настроен (Ollama или Groq)
- [ ] Backend запущен (`uvicorn app.main:app --reload`)
- [ ] API доступен на http://localhost:8000
- [ ] Документация открывается на http://localhost:8000/docs

---

## 🎯 Готово к тестированию!

Теперь вы можете:
1. Тестировать API через Swagger UI: http://localhost:8000/docs
2. Использовать curl для тестирования endpoints
3. Запустить frontend для полного тестирования приложения
4. Проверить работу LLM через `/test-llm` endpoint

Удачи в тестировании! 🚀
