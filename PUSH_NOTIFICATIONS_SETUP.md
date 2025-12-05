# Настройка Push-уведомлений

Этот документ описывает, как настроить push-уведомления для мобильного приложения.

## Обзор

Приложение использует:
- **Backend**: Firebase Cloud Messaging (FCM) для отправки уведомлений
- **Frontend**: Capacitor Push Notifications plugin для получения уведомлений
- **Проактивный сервис**: Автоматически отправляет пуши при напоминаниях, дедлайнах и пропущенных днях

## Настройка Firebase Cloud Messaging

### 1. Создание Firebase проекта

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект или выберите существующий
3. Добавьте Android приложение:
   - Package name: `com.yourcompany.aigoaltracker` (из `capacitor.config.json`)
   - Скачайте `google-services.json`
4. Добавьте iOS приложение (если нужно):
   - Bundle ID: `com.yourcompany.aigoaltracker`
   - Скачайте `GoogleService-Info.plist`

### 2. Получение FCM Server Key

1. В Firebase Console перейдите в **Project Settings** → **Cloud Messaging**
2. Найдите **Server key** (или создайте новый)
3. Скопируйте ключ

### 3. Настройка Backend

Добавьте переменную окружения:

```bash
export FCM_SERVER_KEY="your-server-key-here"
```

Или в `.env` файл:
```
FCM_SERVER_KEY=your-server-key-here
```

### 4. Настройка Frontend (Capacitor)

#### Android

1. Скопируйте `google-services.json` в `android/app/`
2. Добавьте в `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

3. Добавьте в `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

#### iOS

1. Скопируйте `GoogleService-Info.plist` в `ios/App/App/`
2. Добавьте в `ios/App/App.xcodeproj` через Xcode

### 5. Установка зависимостей

#### Frontend

```bash
cd frontend
npm install @capacitor/push-notifications @capacitor/device @capacitor/core
npx cap sync
```

#### Backend

Зависимости уже добавлены в `requirements.txt`:
- `httpx` - для HTTP запросов к FCM API

## Как это работает

### Регистрация токена

1. При запуске приложения вызывается `pushNotificationService.initialize(userId)`
2. Capacitor запрашивает разрешение на уведомления
3. После регистрации токен отправляется на backend через `/api/push/register/`
4. Токен сохраняется в базе данных

### Отправка уведомлений

Проактивный сервис автоматически отправляет пуши при:
- **Напоминаниях о дедлайнах** (24ч, 12ч, 6ч, 2ч до дедлайна)
- **Проверках выполнения** (когда дедлайн прошёл)
- **Пропущенных днях** (1, 2, 3, 7+ дней без активности)
- **Утренних мотивациях** (7-10 утра)

### Обработка уведомлений

- **При получении**: Показывается стандартное уведомление
- **При нажатии**: Приложение открывается и переходит к соответствующему чату/цели

## Тестирование

### Тестовая отправка через API

```bash
curl -X POST "http://localhost:8000/api/push/test/?user_id=1&title=Тест&body=Тестовое уведомление"
```

### Проверка регистрации токена

```bash
curl "http://localhost:8000/api/push/tokens/?user_id=1"
```

## Структура данных

### DeviceToken модель

```python
- id: int
- user_id: int
- token: str (FCM token)
- platform: str ('android', 'ios', 'web')
- device_id: str (опционально)
- is_active: bool
- created_at: datetime
- last_used_at: datetime
```

### Push notification payload

```json
{
  "title": "Заголовок уведомления",
  "body": "Текст уведомления",
  "data": {
    "type": "proactive_message",
    "chat_id": "123",
    "goal_id": "456",
    "message_id": "789"
  }
}
```

## Troubleshooting

### Уведомления не приходят

1. Проверьте, что `FCM_SERVER_KEY` установлен в backend
2. Убедитесь, что токен зарегистрирован: `/api/push/tokens/?user_id=1`
3. Проверьте логи backend на наличие ошибок
4. Убедитесь, что разрешения на уведомления предоставлены

### Токен не регистрируется

1. Проверьте, что Capacitor правильно настроен
2. Убедитесь, что приложение запущено на реальном устройстве (не эмуляторе)
3. Проверьте логи браузера/консоли на наличие ошибок

### InvalidRegistration ошибка

Это означает, что токен недействителен. Токен автоматически деактивируется при получении такой ошибки.

## API Endpoints

- `POST /api/push/register/` - Регистрация токена устройства
- `POST /api/push/unregister/` - Отмена регистрации токена
- `GET /api/push/tokens/` - Получить все токены пользователя
- `POST /api/push/test/` - Тестовая отправка уведомления

## Безопасность

⚠️ **Важно**: 
- Никогда не коммитьте `FCM_SERVER_KEY` в git
- Используйте переменные окружения
- Ограничьте доступ к `/api/push/test/` endpoint в production

