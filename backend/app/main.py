from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.api import api
from app.core.auth import authenticate_user
from app.core.security import create_access_token
from app.core.config import settings
from app.database.database import get_db

app = FastAPI(
    title="AI Goal Tracker API",
    description="API for AI-powered goal tracking application",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    try:
        from app.database.database import engine, Base
        from app.models import goal, milestone, user, chat, report, agreement
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified successfully")
        
        # Start proactive service
        from app.services.proactive_service import start_proactive_service
        start_proactive_service()
        print("✅ Proactive messaging service started")
    except Exception as e:
        import traceback
        print(f"⚠️  Warning: Could not create database tables: {e}")
        print(traceback.format_exc())
        print("Make sure PostgreSQL is running and database exists")

@app.get("/")
async def root():
    return {"message": "AI Goal Tracker API"}

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}