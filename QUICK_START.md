# 🚀 Быстрый старт - Деплой за 15 минут

Это краткая инструкция для быстрого деплоя. Подробные инструкции см. в [DEPLOYMENT.md](DEPLOYMENT.md).

## Шаг 1: Деплой Backend (5 минут)

### На Render.com:

1. Зарегистрируйтесь на [render.com](https://render.com)
2. **New +** → **PostgreSQL** → Создайте БД
3. **New +** → **Web Service** → Подключите GitHub репозиторий
4. Настройки:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Добавьте переменные окружения:
   ```
   DATABASE_URL=<автоматически из PostgreSQL>
   SECRET_KEY=<случайная строка>
   LLM_PROVIDER=groq
   LLM_API_KEY=<ваш ключ от Groq>
   LLM_MODEL=llama-3.1-8b-instant
   FCM_SERVER_KEY=<пока оставьте пустым>
   ```
6. Сохраните и дождитесь деплоя
7. Скопируйте URL (например: `https://ai-goal-tracker-api.onrender.com`)

## Шаг 2: Получение LLM API ключа (3 минуты)

### Groq (бесплатно):

1. Зайдите на [console.groq.com](https://console.groq.com)
2. Зарегистрируйтесь
3. **API Keys** → **Create API Key**
4. Скопируйте ключ
5. Добавьте в Render: `LLM_API_KEY=<ваш ключ>`

## Шаг 3: Настройка Firebase (5 минут)

1. [Firebase Console](https://console.firebase.google.com) → **Add project**
2. **Add app** → **Android**
3. Package name: `com.yourcompany.aigoaltracker`
4. Скачайте `google-services.json` → положите в `frontend/android/app/`
5. **Project Settings** → **Cloud Messaging** → скопируйте **Server key**
6. Добавьте в Render: `FCM_SERVER_KEY=<ваш ключ>`

## Шаг 4: Настройка GitHub Secrets (2 минуты)

1. GitHub → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   ```
   Name: REACT_APP_API_URL
   Value: https://ai-goal-tracker-api.onrender.com
   ```
3. Сохраните

## Шаг 5: Сборка APK

1. Сделайте любой commit и push в `main`
2. GitHub Actions автоматически соберёт APK
3. **Actions** → выберите workflow → скачайте **android-apk**

## ✅ Готово!

Установите APK на телефон и начните использовать приложение.

## 🐛 Что-то не работает?

1. Проверьте логи в Render Dashboard
2. Проверьте, что все переменные окружения установлены
3. Убедитесь, что backend отвечает: `curl https://your-api-url.onrender.com/`

## 📚 Подробные инструкции

- [DEPLOYMENT.md](DEPLOYMENT.md) - Полная инструкция по деплою
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Детальная настройка Firebase
- [LLM_PROVIDERS.md](LLM_PROVIDERS.md) - Все варианты LLM провайдеров

