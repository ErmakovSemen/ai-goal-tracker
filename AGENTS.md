# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview
- **Backend**: Python/FastAPI at `/backend` (port 8000). Uses SQLAlchemy ORM.
- **Frontend**: React/TypeScript (CRA) at `/frontend` (port 3000). Uses npm.
- **Database**: PostgreSQL with automatic SQLite fallback for local dev (no DB setup needed).

### Running services
- **Backend**: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- **Frontend**: `cd frontend && BROWSER=none npm start` (runs on port 3000)
- Both can run simultaneously. The frontend `.env` sets `REACT_APP_API_URL=http://localhost:8000`.

### Key gotchas
- The backend `.env` file must NOT contain `CORS_ORIGINS` or `PORT` keys — the `Settings` pydantic model uses `extra="forbid"` (default in pydantic-settings v2) and rejects unknown fields. Only include fields defined in `backend/app/core/config.py`.
- The backend gracefully falls back to SQLite when PostgreSQL is unavailable. The SQLite DB file is created at `backend/ai_goal_tracker.db`.
- LLM features (AI chat) require a configured LLM provider. Without one (e.g. Ollama not running), the app starts fine but AI chat responses will fail. For basic CRUD testing, LLM is not needed.
- Telegram bot warnings at startup are expected and harmless when `TELEGRAM_BOT_TOKEN` is not set.
- The `python3.12-venv` system package is required to create the backend virtualenv (not installed by default on Ubuntu 24.04).

### Build & test commands
- **Frontend build**: `cd frontend && npm run build`
- **Frontend tests**: `cd frontend && CI=true npx react-scripts test --passWithNoTests` (no tests currently exist)
- **Backend import check**: `cd backend && source venv/bin/activate && python -c "from app.main import app"`
- See `README.md` for full reference.
