from fastapi import FastAPI, Depends, HTTPException, status, Form
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
# In production, allow all origins for mobile apps (Capacitor uses file:// or custom schemes)
# For web, you can restrict to specific domains
import os
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
if cors_origins == ["*"]:
    # Allow all for mobile apps and development
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
        from app.models import goal, milestone, user, chat, report, agreement, device_token
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

@app.get("/test-llm")
async def test_llm():
    """Test endpoint for LLM configuration"""
    from app.services.llm_service import llm_service
    from app.core.config import settings
    import os
    
    config_info = {
        "provider": settings.LLM_PROVIDER,
        "model": settings.LLM_MODEL,
        "api_key_set": bool(settings.LLM_API_KEY),
        "api_key_length": len(settings.LLM_API_KEY) if settings.LLM_API_KEY else 0,
        "provider_from_service": llm_service.provider,
        "model_from_service": llm_service.model
    }
    
    # Test connection if DeepSeek
    if settings.LLM_PROVIDER == "deepseek" and settings.LLM_API_KEY:
        try:
            # Check API key format
            api_key = settings.LLM_API_KEY.strip()
            config_info["api_key_preview"] = f"{api_key[:10]}...{api_key[-4:]}" if len(api_key) > 14 else "***"
            config_info["api_key_starts_with_sk"] = api_key.startswith("sk-")
            
            messages = [
                {"role": "system", "content": "Ты помощник. Отвечай кратко."},
                {"role": "user", "content": "Скажи 'Тест успешен' если ты работаешь."}
            ]
            response = await llm_service.chat_completion(messages, temperature=0.7, max_tokens=50)
            config_info["test_successful"] = True
            config_info["test_response"] = response[:200]
        except Exception as e:
            config_info["test_successful"] = False
            config_info["test_error"] = str(e)
            import traceback
            config_info["test_error_traceback"] = traceback.format_exc()
    else:
        config_info["test_successful"] = None
        config_info["test_message"] = "DeepSeek не настроен или не выбран"
    
    return config_info

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
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

@app.post("/register")
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Register a new user"""
    from app import crud
    from app.schemas.user import UserCreate
    
    # Validate password length
    if len(password) < 6:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 6 characters long"
        )
    
    # Validate email format
    if "@" not in email or "." not in email.split("@")[1]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid email format"
        )
    
    # Validate username (not empty, reasonable length)
    if not username or len(username) < 3:
        raise HTTPException(
            status_code=400,
            detail="Username must be at least 3 characters long"
        )
    
    # Check if user already exists by username
    db_user = crud.user.get_user_by_username(db, username=username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )
    
    # Check if user already exists by email
    db_user = crud.user.get_user_by_email(db, email=email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    user_create = UserCreate(username=username, email=email, password=password)
    new_user = crud.user.create_user(db=db, user=user_create)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": new_user.id}