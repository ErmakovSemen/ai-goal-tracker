from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.core.config import settings
from app.core.security import verify_password
from app import crud
from app.database.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def authenticate_user(db: Session, username: str, password: str):
    user = crud.user.get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print(f"⚠️  JWT Error: 'sub' field is missing in token payload")
            raise credentials_exception
    except JWTError as e:
        print(f"⚠️  JWT Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"⚠️  Unexpected error decoding JWT: {e}")
        raise credentials_exception
    
    user = crud.user.get_user_by_username(db, username=username)
    if user is None:
        print(f"⚠️  User not found: {username}")
        raise credentials_exception
    return user