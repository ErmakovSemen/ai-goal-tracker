# Инструкция по деплою AI Goal Tracker

Это руководство поможет вам развернуть полную версию приложения с backend API и мобильным приложением.

## 📋 Содержание

1. [Деплой Backend на Render.com](#деплой-backend-на-rendercom)
2. [Настройка Firebase для Push-уведомлений](#настройка-firebase)
3. [Настройка GitHub Secrets для CI/CD](#настройка-github-secrets)
4. [Сборка и установка APK](#сборка-и-установка-apk)
5. [Альтернативные платформы деплоя](#альтернативные-платформы)

---

## 🚀 Деплой Backend на Render.com

### Шаг 1: Подготовка

1. Зарегистрируйтесь на [Render.com](https://render.com) (бесплатный план доступен)
2. Подключите ваш GitHub репозиторий к Render

### Шаг 2: Создание базы данных PostgreSQL

1. В Render Dashboard нажмите **"New +"** → **"PostgreSQL"**
2. Настройки:
   - **Name**: `ai-goal-tracker-db`
   - **Database**: `ai_goal_tracker`
   - **User**: `ai_goal_tracker_user`
   - **Plan**: Free (для начала)
3. Нажмите **"Create Database"**
4. Скопируйте **Internal Database URL** (он будет использован автоматически)

### Шаг 3: Создание Web Service

1. В Render Dashboard нажмите **"New +"** → **"Web Service"**
2. Подключите ваш GitHub репозиторий
3. Настройки:
   - **Name**: `ai-goal-tracker-api`
   - **Environment**: `Python 3`
   - **Region**: `Oregon` (или ближайший к вам)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (для начала)

4. **Environment Variables** (добавьте вручную):
   ```
   DATABASE_URL=<автоматически из PostgreSQL>
   SECRET_KEY=<сгенерируйте случайную строку>
   LLM_PROVIDER=groq
   LLM_API_KEY=<ваш API ключ от Groq/OpenAI/OpenRouter>
   LLM_MODEL=llama-3.1-8b-instant
   FCM_SERVER_KEY=<ваш FCM Server Key из Firebase>
   PORT=8000
   ```

5. Нажмите **"Create Web Service"**

### Шаг 4: Получение API URL

После деплоя Render предоставит URL вида:
```
https://ai-goal-tracker-api.onrender.com
```

**Важно**: На бесплатном плане Render "засыпает" после 15 минут неактивности. Первый запрос может занять 30-60 секунд.

---

## 🔥 Настройка Firebase для Push-уведомлений

### Шаг 1: Создание Firebase проекта

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Нажмите **"Add project"**
3. Введите название проекта (например, `ai-goal-tracker`)
4. Отключите Google Analytics (опционально)
5. Нажмите **"Create project"**

### Шаг 2: Добавление Android приложения

1. В Firebase Console нажмите на иконку Android
2. Заполните:
   - **Package name**: `com.yourcompany.aigoaltracker` (должен совпадать с `package` в `android/app/build.gradle`)
   - **App nickname**: `AI Goal Tracker`
   - **Debug signing certificate SHA-1**: (опционально, для тестирования)
3. Нажмите **"Register app"**
4. Скачайте `google-services.json`

### Шаг 3: Получение FCM Server Key

1. В Firebase Console перейдите в **Project Settings** → **Cloud Messaging**
2. Найдите **"Server key"** (или создайте новый в **Cloud Messaging API**)
3. Скопируйте ключ - это ваш `FCM_SERVER_KEY`

### Шаг 4: Добавление google-services.json в Android проект

1. Скопируйте `google-services.json` в `frontend/android/app/`
2. Убедитесь, что в `frontend/android/build.gradle` есть:
   ```gradle
   dependencies {
       classpath 'com.google.gms:google-services:4.4.0'
   }
   ```
3. Убедитесь, что в `frontend/android/app/build.gradle` есть:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

---

## 🔐 Настройка GitHub Secrets для CI/CD

### Шаг 1: Добавление секретов

1. Перейдите в ваш GitHub репозиторий
2. **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **"New repository secret"**
4. Добавьте следующие секреты:

   ```
   REACT_APP_API_URL=https://ai-goal-tracker-api.onrender.com
   ```

   (Замените на ваш реальный URL из Render)

### Шаг 2: Проверка workflow

После добавления секрета, при следующем push в `main`:
- CI автоматически соберёт APK с правильным API URL
- APK будет доступен в **Actions** → **Artifacts**

---

## 📱 Сборка и установка APK

### Автоматическая сборка (через GitHub Actions)

1. Сделайте push в `main` ветку
2. Перейдите в **Actions** → выберите последний workflow run
3. Дождитесь завершения сборки
4. Скачайте **android-apk** artifact
5. Установите APK на Android устройство:
   - Включите **"Установка из неизвестных источников"** в настройках
   - Передайте APK на телефон и установите

### Локальная сборка

```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK будет в `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🌐 Альтернативные платформы деплоя

### Railway.app

1. Зарегистрируйтесь на [Railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Выберите `backend` директорию
4. Railway автоматически определит Python и создаст PostgreSQL
5. Добавьте Environment Variables (см. выше)

### Heroku

1. Установите [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Создайте приложение:
   ```bash
   heroku create ai-goal-tracker-api
   heroku addons:create heroku-postgresql:mini
   ```
3. Добавьте переменные окружения:
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set LLM_PROVIDER=groq
   heroku config:set LLM_API_KEY=your-key
   heroku config:set FCM_SERVER_KEY=your-key
   ```
4. Деплой:
   ```bash
   git subtree push --prefix backend heroku main
   ```

### VPS (DigitalOcean, AWS EC2, etc.)

1. Установите PostgreSQL и Python на сервере
2. Клонируйте репозиторий
3. Создайте `.env` файл (см. `backend/.env.example`)
4. Установите зависимости: `pip install -r requirements.txt`
5. Запустите с systemd или supervisor:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
6. Настройте Nginx как reverse proxy

---

## ✅ Проверка работоспособности

### Backend

1. Откройте `https://your-api-url.onrender.com/`
2. Должен вернуться: `{"message": "AI Goal Tracker API"}`

### Frontend

1. Установите APK на телефон
2. Откройте приложение
3. Попробуйте создать цель
4. Проверьте, что данные сохраняются

### Push-уведомления

1. Откройте приложение на телефоне
2. Разрешите уведомления
3. Создайте цель с дедлайном
4. Дождитесь напоминания (если настроен proactive service)

---

## 🐛 Решение проблем

### Backend не отвечает

- Проверьте логи в Render Dashboard
- Убедитесь, что DATABASE_URL правильный
- Проверьте, что все переменные окружения установлены

### APK не подключается к API

- Проверьте `REACT_APP_API_URL` в GitHub Secrets
- Убедитесь, что backend доступен (не "спит")
- Проверьте CORS настройки в `backend/app/main.py`

### Push-уведомления не работают

- Проверьте `FCM_SERVER_KEY` в переменных окружения
- Убедитесь, что `google-services.json` добавлен в Android проект
- Проверьте логи в Firebase Console

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в Render Dashboard
2. Проверьте логи в GitHub Actions
3. Проверьте логи на устройстве через `adb logcat`
