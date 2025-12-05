from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()


@router.post("/register/", response_model=schemas.DeviceToken)
def register_device_token(
    token: schemas.DeviceTokenCreate,
    db: Session = Depends(get_db)
):
    """Register a device token for push notifications"""
    return crud.device_token.create_device_token(db=db, token=token)


@router.post("/unregister/")
def unregister_device_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Unregister a device token"""
    result = crud.device_token.deactivate_token(db, token)
    if not result:
        raise HTTPException(status_code=404, detail="Token not found")
    return {"status": "success", "message": "Token deactivated"}


@router.get("/tokens/", response_model=list[schemas.DeviceToken])
def get_user_tokens(
    user_id: int,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all device tokens for a user"""
    return crud.device_token.get_tokens_by_user(db, user_id, active_only=active_only)


@router.post("/test/")
async def test_push_notification(
    user_id: int,
    title: str = "Тестовое уведомление",
    body: str = "Это тестовое push-уведомление!",
    db: Session = Depends(get_db)
):
    """Test push notification for a user"""
    from app.services.push_service import send_push_to_user
    
    result = await send_push_to_user(db, user_id, title, body)
    return {
        "status": "success",
        "result": result
    }

