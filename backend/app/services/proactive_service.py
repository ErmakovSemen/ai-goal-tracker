"""
Proactive messaging service - sends reminders and checklists based on agreements
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app import crud, schemas
from app.models.agreement import AgreementStatus
from app.models.chat import Message

# Store for tracking active chats (in production, use Redis)
active_chats: dict = {}


def register_active_chat(chat_id: int, goal_id: int):
    """Register that a user is active in a chat"""
    active_chats[chat_id] = {
        "goal_id": goal_id,
        "last_activity": datetime.utcnow()
    }


def unregister_chat(chat_id: int):
    """Unregister a chat"""
    active_chats.pop(chat_id, None)


def is_chat_active(chat_id: int, minutes: int = 30) -> bool:
    """Check if chat was active in the last N minutes"""
    if chat_id not in active_chats:
        return False
    last_activity = active_chats[chat_id]["last_activity"]
    return (datetime.utcnow() - last_activity) < timedelta(minutes=minutes)


async def send_proactive_message(db: Session, chat_id: int, content: str, actions: list = None):
    """Send a proactive message from the AI coach"""
    message = Message(
        chat_id=chat_id,
        sender="ai",
        content=content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    print(f"📤 Proactive message sent to chat {chat_id}: {content[:50]}...")
    return message


async def check_and_send_reminders(db: Session):
    """Check for upcoming agreements and send reminders"""
    # Get agreements due in next 24 hours
    upcoming = crud.agreement.get_upcoming_agreements(db, hours_ahead=24)
    
    for agreement in upcoming:
        # Find the chat for this goal
        chat = db.query(crud.chat.Chat).filter(
            crud.chat.Chat.goal_id == agreement.goal_id
        ).first()
        
        if chat:
            hours_left = (agreement.deadline - datetime.utcnow()).total_seconds() / 3600
            
            import random
            reminders = [
                f"🦉 Эй! Не забыл? Ты обещал: {agreement.description}\n\nОсталось {int(hours_left)} часов. Как прогресс?",
                f"👀 Я слежу за тобой! До дедлайна {int(hours_left)} ч.\n\nЗадача: {agreement.description}\n\nУспеваешь?",
                f"⏰ Тик-так! {agreement.description} — осталось {int(hours_left)} часов!\n\nНе подведи меня 🦉",
                f"🔔 Напоминалка! Мы договаривались: {agreement.description}\n\nВремя идёт... {int(hours_left)} ч. до дедлайна!"
            ]
            reminder_content = random.choice(reminders)
            
            # Add suggestions
            suggestions = ["Уже делаю!", "Сделаю сегодня", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, reminder_content)
            crud.agreement.mark_reminder_sent(db, agreement.id)
            print(f"✅ Reminder sent for agreement {agreement.id}")


async def check_and_send_deadline_checklists(db: Session):
    """Check for due agreements and send checklists"""
    from app.services.llm_service import LLMService
    
    due = crud.agreement.get_due_agreements(db)
    llm = LLMService()
    
    for agreement in due:
        # Find the chat for this goal
        from app.models.chat import Chat
        chat = db.query(Chat).filter(Chat.goal_id == agreement.goal_id).first()
        
        if chat:
            # Create checklist for this agreement
            checklist_data = {
                "title": f"🦉 Проверка выполнения",
                "items": [
                    {"id": 1, "label": "Сделал?", "type": "boolean"},
                    {"id": 2, "label": "На сколько процентов выполнил", "type": "number", "unit": "%"},
                    {"id": 3, "label": "Что именно сделал", "type": "text"}
                ]
            }
            
            import random
            intros = [
                f"🦉 Та-дам! Время проверки!\n\nТы обещал: {agreement.description}\n\nНу что, справился? Давай честно!",
                f"⏰ Дедлайн! Как там с задачей?\n\n📝 {agreement.description}\n\nПокажи результат! 👇",
                f"🔔 Время пришло! Мы договаривались: {agreement.description}\n\nРассказывай, что получилось!"
            ]
            content = random.choice(intros) + f"\n\n<!--CHECKLIST:{json.dumps(checklist_data, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, content)
            crud.agreement.mark_checklist_sent(db, agreement.id)
            print(f"✅ Deadline checklist sent for agreement {agreement.id}")


async def proactive_check_loop():
    """Background loop that checks for reminders and deadlines"""
    print("🚀 Proactive service started")
    
    while True:
        try:
            db = SessionLocal()
            try:
                await check_and_send_reminders(db)
                await check_and_send_deadline_checklists(db)
            finally:
                db.close()
        except Exception as e:
            print(f"❌ Proactive service error: {e}")
        
        # Check every 5 minutes
        await asyncio.sleep(300)


def start_proactive_service():
    """Start the proactive service in background"""
    asyncio.create_task(proactive_check_loop())

