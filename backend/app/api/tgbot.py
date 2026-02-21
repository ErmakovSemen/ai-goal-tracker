from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.auth import get_current_user
from app.models.user import User
from tgbot.exceptions import TelegramConfigError, TelegramTransportError, TelegramValidationError
from tgbot.schemas import SendTextRequest, TelegramSendResponse
from tgbot.service import send_photo_report, send_text_report

router = APIRouter()


@router.post("/send-text", response_model=TelegramSendResponse)
def api_send_text(
    payload: SendTextRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        message_id = send_text_report(payload, user_id=current_user.id)
        return TelegramSendResponse(telegram_message_id=message_id)
    except TelegramValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TelegramConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TelegramTransportError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Внутренняя ошибка отправки сообщения.") from exc


@router.post("/send-photo", response_model=TelegramSendResponse)
async def api_send_photo(
    photo: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    meta: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    try:
        message_id = await send_photo_report(
            photo=photo,
            user_id=current_user.id,
            caption=caption,
            meta=meta,
        )
        return TelegramSendResponse(telegram_message_id=message_id)
    except TelegramValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TelegramConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TelegramTransportError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Внутренняя ошибка отправки фото.") from exc
