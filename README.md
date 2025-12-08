# AI Goal Tracker

AI-powered goal tracking application with chat-based goal formalization and progress monitoring. Duolingo-like proactive AI coach that helps you achieve your goals.

## Features

- 🤖 **Proactive AI Coach** - AI actively asks about progress, sets deadlines, and motivates you
- 💬 **Chat-based goal formalization** - Natural conversation to create and refine goals
- 📊 **Progress tracking** - Milestones with deadlines and completion tracking
- ✅ **Checklists** - AI creates checklists to verify progress
- 📱 **Push notifications** - Reminders and motivational messages
- 📈 **Statistics and analytics** - Track your progress over time
- 📱 **Mobile application** - Native Android app (APK available)

## Tech Stack

- **Backend**: Python/FastAPI, PostgreSQL, Firebase Cloud Messaging
- **Frontend**: React/TypeScript, Capacitor
- **AI**: Supports multiple LLM providers (Groq, OpenAI, OpenRouter, Ollama, etc.)
- **Mobile**: Android (via Capacitor)

## Quick Start

### 🚀 Full Deployment (Recommended)

For complete setup instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

**Quick steps:**
1. Deploy backend to [Render.com](https://render.com) (see `render.yaml`)
2. Set up Firebase for push notifications (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))
3. Configure LLM provider (see [LLM_PROVIDERS.md](LLM_PROVIDERS.md))
4. Add `REACT_APP_API_URL` to GitHub Secrets
5. Push to `main` - APK will be built automatically

### 🧪 Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## Project Structure

- `/backend` - Python/FastAPI backend application
- `/frontend` - React/TypeScript frontend application
- `/.github/workflows` - CI/CD configuration for APK building

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Firebase configuration for push notifications
- **[LLM_PROVIDERS.md](LLM_PROVIDERS.md)** - LLM provider setup guide
- **[PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md)** - Push notifications technical details

## Mobile Application

The APK is automatically built on every push to the `main` branch via GitHub Actions.

### Download APK

1. Go to **Actions** tab in GitHub
2. Select the latest workflow run
3. Download **android-apk** artifact
4. Install on Android device

### Building Locally

```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK will be in `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## Environment Variables

See `backend/env.example.txt` for all required environment variables.

**Required for production:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `LLM_PROVIDER` - LLM provider (groq, openai, etc.)
- `LLM_API_KEY` - API key for LLM provider
- `FCM_SERVER_KEY` - Firebase Cloud Messaging server key

## License

MIT

<!-- Testing with fresh token -->

<!-- Testing GitHub mirroring setup -->