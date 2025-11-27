# Инструкция по настройке CI/CD и деплоя

Этот документ описывает процесс настройки автоматического деплоя на Render с использованием GitHub Actions.

## Архитектура деплоя

- **Backend**: FastAPI приложение, деплоится как Web Service на Render
- **Frontend**: React приложение, деплоится как Static Site на Render (или через Docker)
- **База данных**: Managed PostgreSQL на Render
- **CI/CD**: GitHub Actions автоматически деплоит при push в ветку `main`

## Предварительные требования

1. Аккаунт на [Render](https://render.com)
2. Репозиторий на GitHub
3. Локальный репозиторий, связанный с GitHub

## Шаг 1: Создание сервисов на Render

### 1.1 Создание PostgreSQL базы данных

1. Войдите в панель Render
2. Нажмите "New +" → "PostgreSQL"
3. Заполните форму:
   - **Name**: `ai-goal-tracker-db` (или любое другое имя)
   - **Database**: `ai_goal_tracker`
   - **User**: `postgres` (или свой)
   - **Region**: выберите ближайший регион
   - **PostgreSQL Version**: 13 или выше
   - **Plan**: выберите подходящий план (Free tier доступен)
4. Нажмите "Create Database"
5. После создания, скопируйте **Internal Database URL** (он будет использоваться для backend)

### 1.2 Создание Backend Web Service

1. В панели Render нажмите "New +" → "Web Service"
2. Подключите ваш GitHub репозиторий
3. Заполните настройки:
   - **Name**: `ai-goal-tracker-backend`
   - **Environment**: `Docker`
   - **Region**: тот же, что и для базы данных
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `backend/Dockerfile` (или просто `Dockerfile`, если root directory = backend)
   - **Build Command**: (оставить пустым, Dockerfile сам соберет)
   - **Start Command**: (оставить пустым, Dockerfile сам запустит)
4. В разделе **Environment Variables** добавьте:
   ```
   DATABASE_URL=<Internal Database URL из шага 1.1>
   SECRET_KEY=<сгенерируйте случайную строку, например через: openssl rand -hex 32>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   PORT=8000
   ```
5. Нажмите "Create Web Service"
6. После создания, скопируйте **URL сервиса** (например, `https://ai-goal-tracker-backend.onrender.com`)

### 1.3 Создание Frontend Static Site (вариант 1 - рекомендуемый)

1. В панели Render нажмите "New +" → "Static Site"
2. Подключите ваш GitHub репозиторий
3. Заполните настройки:
   - **Name**: `ai-goal-tracker-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `build`
4. В разделе **Environment Variables** добавьте:
   ```
   REACT_APP_API_URL=<URL вашего backend сервиса из шага 1.2>
   ```
5. Нажмите "Create Static Site"

### 1.3 Альтернатива: Frontend через Docker (вариант 2)

Если вы хотите использовать Docker для frontend:

1. В панели Render нажмите "New +" → "Web Service"
2. Подключите ваш GitHub репозиторий
3. Заполните настройки:
   - **Name**: `ai-goal-tracker-frontend`
   - **Environment**: `Docker`
   - **Region**: тот же, что и для backend
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Dockerfile Path**: `frontend/Dockerfile`
4. В разделе **Environment Variables** добавьте:
   ```
   REACT_APP_API_URL=<URL вашего backend сервиса>
   ```
5. Нажмите "Create Web Service"

## Шаг 2: Настройка GitHub Secrets

1. Перейдите в ваш GitHub репозиторий
2. Откройте **Settings** → **Secrets and variables** → **Actions**
3. Нажмите "New repository secret" и добавьте следующие секреты:

### Обязательные секреты:

- **`RENDER_API_KEY`**: 
  - Получите в Render: Account Settings → API Keys → Create API Key
  - Скопируйте ключ и добавьте как секрет

- **`RENDER_SERVICE_ID_BACKEND`**:
  - В панели Render откройте ваш backend сервис
  - В URL будет что-то вроде: `https://dashboard.render.com/web/srv-xxxxx`
  - `srv-xxxxx` - это Service ID (или найдите в Settings → Info)

- **`RENDER_SERVICE_ID_FRONTEND`**:
  - Аналогично, найдите Service ID для frontend сервиса

### Опциональные секреты:

- **`REACT_APP_API_URL`**:
  - URL вашего backend сервиса (например, `https://ai-goal-tracker-backend.onrender.com`)
  - Используется при сборке frontend и APK

- **`SECRET_KEY`**:
  - Секретный ключ для JWT (если не задан в Render Environment Variables)
  - Сгенерируйте: `openssl rand -hex 32`

- **`POSTGRES_URL`**:
  - URL базы данных (если нужен отдельно от DATABASE_URL)

## Шаг 3: Настройка автоматического деплоя на Render

### Вариант A: Автоматический деплой через Render (рекомендуемый)

Render автоматически деплоит при push в подключенную ветку (обычно `main`). Просто настройте сервисы как описано выше, и деплой будет происходить автоматически.

GitHub Actions workflow будет проверять сборку и триггерить деплой через Render API.

### Вариант B: Полностью через GitHub Actions

Если вы хотите, чтобы GitHub Actions полностью управлял деплоем, используйте workflow файл `.github/workflows/deploy.yml`, который уже настроен.

## Шаг 4: Первый деплой

1. Убедитесь, что все секреты добавлены в GitHub
2. Убедитесь, что сервисы созданы на Render
3. Сделайте commit и push в ветку `main`:
   ```bash
   git add .
   git commit -m "Setup CI/CD with GitHub Actions and Render"
   git push origin main
   ```

4. Проверьте статус деплоя:
   - В GitHub: вкладка **Actions** → выберите workflow "Deploy to Render"
   - В Render: панель каждого сервиса покажет статус деплоя

## Шаг 5: Сборка Android APK

APK автоматически собирается при каждом push в `main` через workflow `.github/workflows/build-apk.yml`.

### Получение APK:

1. Перейдите в GitHub репозиторий → **Actions**
2. Выберите последний запуск workflow "Build Android APK"
3. В разделе **Artifacts** скачайте `android-apk` (и `android-aab`, если собран)

### Локальная сборка APK:

Если нужно собрать APK локально:

```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
# APK будет в: android/app/build/outputs/apk/debug/app-debug.apk
```

## Переменные окружения

### Backend (в Render Environment Variables):

- `DATABASE_URL` - URL подключения к PostgreSQL (автоматически предоставляется Render)
- `SECRET_KEY` - секретный ключ для JWT токенов
- `ALGORITHM` - алгоритм шифрования (по умолчанию: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - время жизни токена (по умолчанию: 30)
- `PORT` - порт для приложения (Render автоматически устанавливает)

### Frontend (в Render Environment Variables):

- `REACT_APP_API_URL` - URL backend API (например, `https://ai-goal-tracker-backend.onrender.com`)

## Мониторинг и логи

- **Render Dashboard**: просмотр логов и статуса сервисов
- **GitHub Actions**: просмотр логов сборки и деплоя
- **Health Checks**: 
  - Backend: `https://your-backend.onrender.com/`
  - Frontend: `https://your-frontend.onrender.com/health`

## Устранение проблем

### Backend не запускается:

1. Проверьте логи в Render Dashboard
2. Убедитесь, что `DATABASE_URL` правильно настроен
3. Проверьте, что все зависимости установлены в `requirements.txt`

### Frontend не подключается к Backend:

1. Убедитесь, что `REACT_APP_API_URL` правильно установлен
2. Проверьте CORS настройки в backend (если нужно)
3. Убедитесь, что backend доступен по указанному URL

### APK не собирается:

1. Проверьте логи в GitHub Actions
2. Убедитесь, что Android SDK правильно установлен в workflow
3. Проверьте, что Capacitor правильно настроен

## Дополнительные ресурсы

- [Render Documentation](https://render.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Capacitor Documentation](https://capacitorjs.com/docs)

## Поддержка

При возникновении проблем:
1. Проверьте логи в Render Dashboard и GitHub Actions
2. Убедитесь, что все секреты правильно настроены
3. Проверьте, что переменные окружения установлены корректно
