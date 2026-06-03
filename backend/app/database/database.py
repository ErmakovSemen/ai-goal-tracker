from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Use DATABASE_URL if provided (e.g., from Render), otherwise construct from individual variables
if settings.DATABASE_URL:
    # Render provides postgres:// but SQLAlchemy needs postgresql://
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Try PostgreSQL first, fallback to SQLite for development
    try:
        import psycopg2
        # Try to connect to PostgreSQL
        SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        # Test connection
        test_conn = psycopg2.connect(SQLALCHEMY_DATABASE_URL)
        test_conn.close()
        print("✅ Using PostgreSQL database")
    except:
        # Fallback to SQLite for development
        SQLALCHEMY_DATABASE_URL = "sqlite:///./ai_goal_tracker.db"
        print("⚠️  PostgreSQL not available, using SQLite for development")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_additive_columns():
    """Lightweight, DB-agnostic safety net for additive columns when there is no
    migration tool. Adds missing nullable columns so deploys don't require manual SQL.

    Only ever ADDs nullable columns — never drops or alters existing data.
    """
    from sqlalchemy import inspect, text

    # (table, column, SQL type) — keep types simple/portable.
    required = [
        ("goals", "coach_trainer_id", "VARCHAR"),
    ]
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        with engine.begin() as conn:
            for table, column, col_type in required:
                if table not in existing_tables:
                    continue
                cols = {c["name"] for c in inspector.get_columns(table)}
                if column in cols:
                    continue
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}'))
                print(f"🧩 Added missing column {table}.{column}")
    except Exception as exc:  # never block startup on this best-effort helper
        print(f"⚠️  ensure_additive_columns skipped: {exc}")