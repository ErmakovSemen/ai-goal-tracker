from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.device_token import DeviceToken
from app.schemas import device_token as schemas
from datetime import datetime

def create_device_token(db: Session, token: schemas.DeviceTokenCreate) -> DeviceToken:
    """Create or update device token"""
    # Check if token already exists
    existing = db.query(DeviceToken).filter(DeviceToken.token == token.token).first()
    
    if existing:
        # Update existing token
        existing.user_id = token.user_id
        existing.platform = token.platform
        existing.device_id = token.device_id
        existing.is_active = True
        existing.last_used_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new token
    db_token = DeviceToken(
        user_id=token.user_id,
        token=token.token,
        platform=token.platform,
        device_id=token.device_id,
        is_active=True
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def get_device_token(db: Session, token_id: int) -> Optional[DeviceToken]:
    return db.query(DeviceToken).filter(DeviceToken.id == token_id).first()

def get_tokens_by_user(db: Session, user_id: int, active_only: bool = True) -> List[DeviceToken]:
    query = db.query(DeviceToken).filter(DeviceToken.user_id == user_id)
    if active_only:
        query = query.filter(DeviceToken.is_active == True)
    return query.all()

def get_all_active_tokens(db: Session) -> List[DeviceToken]:
    return db.query(DeviceToken).filter(DeviceToken.is_active == True).all()

def update_device_token(db: Session, token_id: int, update: schemas.DeviceTokenUpdate) -> Optional[DeviceToken]:
    db_token = get_device_token(db, token_id)
    if db_token:
        update_data = update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_token, key, value)
        db.commit()
        db.refresh(db_token)
    return db_token

def deactivate_token(db: Session, token: str) -> Optional[DeviceToken]:
    """Deactivate a token by token string"""
    db_token = db.query(DeviceToken).filter(DeviceToken.token == token).first()
    if db_token:
        db_token.is_active = False
        db.commit()
        db.refresh(db_token)
    return db_token

def delete_device_token(db: Session, token_id: int) -> bool:
    db_token = get_device_token(db, token_id)
    if db_token:
        db.delete(db_token)
        db.commit()
        return True
    return False

