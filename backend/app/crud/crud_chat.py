from sqlalchemy.orm import Session
from app.models.chat import Chat, Message
from app.schemas.chat import ChatCreate, ChatUpdate
from app.schemas.message import MessageCreate

def get_chat(db: Session, chat_id: int):
    return db.query(Chat).filter(Chat.id == chat_id).first()

def get_chats(db: Session, goal_id: int, skip: int = 0, limit: int = 100):
    return db.query(Chat).filter(Chat.goal_id == goal_id).offset(skip).limit(limit).all()

def create_chat(db: Session, chat: ChatCreate):
    db_chat = Chat(**chat.dict())
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

def update_chat(db: Session, chat_id: int, chat: ChatUpdate):
    db_chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if db_chat:
        update_data = chat.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_chat, key, value)
        db.commit()
        db.refresh(db_chat)
    return db_chat

def delete_chat(db: Session, chat_id: int):
    db_chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if db_chat:
        db.delete(db_chat)
        db.commit()
    return db_chat

def create_message(db: Session, message: MessageCreate):
    db_message = Message(**message.dict())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_messages(db: Session, chat_id: int, skip: int = 0, limit: int = 100):
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.id.asc()).offset(skip).limit(limit).all()