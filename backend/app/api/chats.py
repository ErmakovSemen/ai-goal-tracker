from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Chat)
def create_chat(chat: schemas.ChatCreate, db: Session = Depends(get_db)):
    return crud.chat.create_chat(db=db, chat=chat)

@router.get("/{chat_id}", response_model=schemas.Chat)
def read_chat(chat_id: int, db: Session = Depends(get_db)):
    db_chat = crud.chat.get_chat(db, chat_id=chat_id)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat

@router.get("/", response_model=List[schemas.Chat])
def read_chats(goal_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    chats = crud.chat.get_chats(db, goal_id=goal_id, skip=skip, limit=limit)
    return chats

@router.put("/{chat_id}", response_model=schemas.Chat)
def update_chat(chat_id: int, chat: schemas.ChatUpdate, db: Session = Depends(get_db)):
    db_chat = crud.chat.update_chat(db, chat_id=chat_id, chat=chat)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat

@router.delete("/{chat_id}", response_model=schemas.Chat)
def delete_chat(chat_id: int, db: Session = Depends(get_db)):
    db_chat = crud.chat.delete_chat(db, chat_id=chat_id)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat

@router.post("/{chat_id}/messages/", response_model=schemas.Message)
def create_message(chat_id: int, message: schemas.MessageCreate, db: Session = Depends(get_db)):
    message.chat_id = chat_id
    return crud.chat.create_message(db=db, message=message)

@router.get("/{chat_id}/messages/", response_model=List[schemas.Message])
def read_messages(chat_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    messages = crud.chat.get_messages(db, chat_id=chat_id, skip=skip, limit=limit)
    return messages