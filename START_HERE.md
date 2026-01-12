# 🚀 НАЧНИТЕ ЗДЕСЬ - Быстрый запуск проекта

## 📱 Запуск в браузере (5 минут)

### Терминал 1: Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
✅ Backend: http://localhost:8000

### Терминал 2: Frontend
```bash
cd frontend
npm install
echo REACT_APP_API_URL=http://localhost:8000 > .env
npm start
```
✅ Frontend: http://localhost:3000 (откроется автоматически)

---

## 📱 Сборка APK для телефона

### Вариант 1: Через GitHub (Автоматически) ⭐ Рекомендуется

1. Добавьте секрет в GitHub:
   - Settings → Secrets → Actions
   - Name: `REACT_APP_API_URL`
   - Value: `https://ai-goal-tracker-api.onrender.com`

2. Сделайте commit и push:
   ```bash
   git add .
   git commit -m "Build APK"
   git push
   ```

3. Скачайте APK:
   - GitHub → Actions → последний workflow → скачайте `android-apk`

---

### Вариант 2: Локально (Для разработки)

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

В Android Studio: **Build** → **Build APK**

APK будет в: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🌐 Деплой в интернет (для всех)

### Netlify (Самый простой):

1. https://netlify.com → Войти через GitHub
2. **Add new site** → Выберите репозиторий
3. Настройки:
   - Base directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Publish directory: `frontend/build`
4. Environment variables:
   - `REACT_APP_API_URL` = `https://ai-goal-tracker-api.onrender.com`
5. **Deploy**

✅ Получите URL: `https://your-site.netlify.app`

---

## 📋 Что нужно установить

### Для браузера:
- ✅ Python 3.9+
- ✅ Node.js 18+
- ✅ PostgreSQL (или используйте Docker)

### Для APK:
- ✅ Всё выше +
- ✅ Java JDK 17+
- ✅ Android Studio

---

## 🔧 Быстрая настройка .env

### Backend (`backend/.env`):
```env
SECRET_KEY=test-key-123
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
```

### Frontend (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:8000
```

---

## ✅ Проверка работы

1. Backend работает: http://localhost:8000/docs
2. Frontend работает: http://localhost:3000
3. Можно зарегистрироваться и войти

---

## 📚 Подробные инструкции

- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - Полная инструкция
- [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) - Тестирование
- [APK_BUILD_INSTRUCTIONS.md](APK_BUILD_INSTRUCTIONS.md) - Сборка APK

---

**Готово! Начните с запуска в браузере, затем соберите APK.** 🚀
