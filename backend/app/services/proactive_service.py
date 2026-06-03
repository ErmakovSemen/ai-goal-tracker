"""
Proactive messaging service - sends reminders and checklists based on agreements
Настойчивый как Duolingo! 🦉
"""
import asyncio
import json
import random
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.database import SessionLocal
from app import crud, schemas
from app.models.agreement import AgreementStatus, Agreement
from app.models.chat import Message, Chat
from app.models.goal import Goal
from app.services import coach_voice

# Store for tracking active chats (in production, use Redis)
active_chats: dict = {}


def _goal_tone(db: Session, goal_id: int) -> str:
    """Resolve the coach tone (strict/normal/gentle) chosen for a goal."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    return coach_voice.resolve_tone(getattr(goal, "coach_trainer_id", None) if goal else None)

# Track last proactive message per chat to avoid spam
last_proactive_messages: Dict[int, datetime] = {}

# Track last check times for different types of messages
last_missed_days_check: Optional[datetime] = None
last_morning_check: Optional[datetime] = None


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


def get_last_user_message_time(db: Session, chat_id: int) -> Optional[datetime]:
    """Get timestamp of last message from user in this chat"""
    last_message = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.sender == "user"
    ).order_by(desc(Message.created_at)).first()
    
    if last_message:
        return last_message.created_at
    return None


def get_last_ai_message_time(db: Session, chat_id: int) -> Optional[datetime]:
    """Get timestamp of last message from AI in this chat"""
    last_message = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.sender == "ai"
    ).order_by(desc(Message.created_at)).first()
    
    if last_message:
        return last_message.created_at
    return None


def can_send_proactive_message(chat_id: int, min_interval_minutes: int = 60) -> bool:
    """Check if we can send proactive message (avoid spam)"""
    if chat_id not in last_proactive_messages:
        return True
    
    last_sent = last_proactive_messages[chat_id]
    time_since = (datetime.utcnow() - last_sent).total_seconds() / 60
    return time_since >= min_interval_minutes


async def send_proactive_message(db: Session, chat_id: int, content: str, actions: list = None, min_interval: int = 60, send_push: bool = True):
    """Send a proactive message from the AI coach"""
    # Check if we can send (avoid spam)
    if not can_send_proactive_message(chat_id, min_interval):
        return None
    
    message = Message(
        chat_id=chat_id,
        sender="ai",
        content=content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Track when we sent this
    last_proactive_messages[chat_id] = datetime.utcnow()
    
    print(f"📤 Proactive message sent to chat {chat_id}: {content[:50]}...")
    
    # Send push notification if enabled
    if send_push:
        try:
            # Get user_id from chat
            chat = db.query(Chat).filter(Chat.id == chat_id).first()
            if chat:
                goal = db.query(Goal).filter(Goal.id == chat.goal_id).first()
                if goal:
                    from app.services.push_service import send_push_to_user
                    
                    # Extract title and body from content (first line as title, rest as body)
                    lines = content.split('\n')
                    title = lines[0].strip()[:50]  # First line, max 50 chars
                    body = '\n'.join(lines[1:]).strip()[:200]  # Rest, max 200 chars
                    if not body:
                        body = title[:200]
                    
                    # Prepare data payload
                    data = {
                        "type": "proactive_message",
                        "chat_id": str(chat_id),
                        "goal_id": str(chat.goal_id),
                        "message_id": str(message.id)
                    }
                    
                    await send_push_to_user(db, goal.user_id, title, body, data)
                    print(f"📱 Push notification sent for chat {chat_id}")
        except Exception as e:
            print(f"⚠️ Error sending push notification: {e}")
            # Don't fail the message if push fails
    
    return message


async def check_and_send_reminders(db: Session):
    """Check for upcoming agreements and send reminders (multiple times per day!)"""
    now = datetime.utcnow()
    
    # Get agreements due in next 24 hours
    upcoming = crud.agreement.get_upcoming_agreements(db, hours_ahead=24)
    
    for agreement in upcoming:
        # Find the chat for this goal
        chat = db.query(Chat).filter(Chat.goal_id == agreement.goal_id).first()

        if not chat:
            continue

        tone = _goal_tone(db, agreement.goal_id)
        hours_left = (agreement.deadline - now).total_seconds() / 3600
        desc = agreement.description

        # Multiple reminders based on time left
        # 1. First reminder: 24 hours before
        if 20 <= hours_left <= 24 and not agreement.reminder_sent:
            reminder_content = coach_voice.pick("remind", tone, desc=desc, hours=int(hours_left))
            suggestions = ["Уже делаю!", "Сделаю сегодня", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, reminder_content, min_interval=0)
            crud.agreement.mark_reminder_sent(db, agreement.id)
            print(f"✅ 24h reminder sent for agreement {agreement.id} (tone={tone})")

        # 2. Second reminder: 12 hours before (more urgent!)
        elif 10 <= hours_left <= 12:
            reminder_content = coach_voice.pick("remind", tone, desc=desc, hours=int(hours_left))
            suggestions = ["В процессе!", "Скоро начну", "Всё под контролем"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, reminder_content, min_interval=60)
            print(f"✅ 12h reminder sent for agreement {agreement.id} (tone={tone})")

        # 3. Third reminder: 6 hours before (very urgent!)
        elif 4 <= hours_left <= 6:
            reminder_content = coach_voice.pick("remind_urgent", tone, desc=desc, hours=int(hours_left))
            suggestions = ["Почти готово!", "Сейчас доделаю", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, reminder_content, min_interval=60)
            print(f"✅ 6h reminder sent for agreement {agreement.id} (tone={tone})")

        # 4. Last reminder: 2 hours before (PANIC MODE!)
        elif 1 <= hours_left <= 2:
            reminder_content = coach_voice.pick("remind_urgent", tone, desc=desc, hours=int(hours_left))
            suggestions = ["Почти готово!", "Сейчас доделаю", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, reminder_content, min_interval=30)
            print(f"✅ 2h reminder sent for agreement {agreement.id} (tone={tone})")


async def check_and_send_deadline_checklists(db: Session):
    """Check for due agreements and send checklists"""
    due = crud.agreement.get_due_agreements(db)
    
    for agreement in due:
        # Find the chat for this goal
        chat = db.query(Chat).filter(Chat.goal_id == agreement.goal_id).first()
        
        if not chat:
            continue
        
        # Create checklist for this agreement
        checklist_data = {
            "title": f"🦉 Проверка выполнения",
            "items": [
                {"id": 1, "label": "Сделал?", "type": "boolean"},
                {"id": 2, "label": "На сколько процентов выполнил", "type": "number", "unit": "%"},
                {"id": 3, "label": "Что именно сделал", "type": "text"}
            ]
        }
        
        tone = _goal_tone(db, agreement.goal_id)
        intro = coach_voice.pick("checklist_intro", tone, desc=agreement.description)
        content = intro + f"\n\n<!--CHECKLIST:{json.dumps(checklist_data, ensure_ascii=False)}-->"
        
        await send_proactive_message(db, chat.id, content, min_interval=0)
        crud.agreement.mark_checklist_sent(db, agreement.id)
        print(f"✅ Deadline checklist sent for agreement {agreement.id}")


async def check_and_send_missed_days_messages(db: Session):
    """Send 'shaming' messages for missed days (like Duolingo!)"""
    global last_missed_days_check
    
    now = datetime.utcnow()
    
    # Check only every 30 minutes
    if last_missed_days_check and (now - last_missed_days_check).total_seconds() < 1800:
        return
    
    last_missed_days_check = now
    
    # Get all active goals with chats
    active_goals = db.query(Goal).filter(Goal.status == "active").all()
    
    for goal in active_goals:
        chat = db.query(Chat).filter(Chat.goal_id == goal.id).first()
        if not chat:
            continue
        
        # Get last user message
        last_user_msg_time = get_last_user_message_time(db, chat.id)
        if not last_user_msg_time:
            # No messages yet, skip
            continue
        
        # Calculate days since last activity
        days_since = (now - last_user_msg_time).days
        
        # Skip if chat is currently active
        if is_chat_active(chat.id, minutes=60):
            continue
        
        tone = _goal_tone(db, goal.id)

        # Different messages based on days missed
        if days_since == 1:
            content = coach_voice.pick("miss1", tone)
            suggestions = ["Вернулся!", "Был занят", "Продолжаю"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, content, min_interval=120)
            print(f"✅ 1-day missed message sent for chat {chat.id} (tone={tone})")

        elif days_since == 2:
            content = coach_voice.pick("miss2", tone)
            suggestions = ["Вернулся!", "Был занят", "Нужна помощь"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, content, min_interval=120)
            print(f"✅ 2-day missed message sent for chat {chat.id} (tone={tone})")

        elif days_since == 3:
            content = coach_voice.pick("miss3", tone)
            suggestions = ["Вернулся!", "Извини", "Продолжаю"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, content, min_interval=120)
            print(f"✅ 3-day missed message sent for chat {chat.id} (tone={tone})")

        elif days_since >= 7:
            content = coach_voice.pick("miss_week", tone, days=days_since)
            suggestions = ["Вернулся!", "Начну заново", "Нужна помощь"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"

            await send_proactive_message(db, chat.id, content, min_interval=180)
            print(f"✅ {days_since}-day missed message sent for chat {chat.id} (tone={tone})")


async def check_and_send_morning_motivations(db: Session):
    """Send motivational morning messages (like Duolingo!)"""
    global last_morning_check
    
    now = datetime.utcnow()
    current_hour = now.hour
    
    # Send between 7-10 AM
    if not (7 <= current_hour <= 10):
        return
    
    # Check only once per hour during morning hours
    if last_morning_check and (now - last_morning_check).total_seconds() < 3600:
        return
    
    last_morning_check = now
    
    # Get all active goals with chats
    active_goals = db.query(Goal).filter(Goal.status == "active").all()
    
    for goal in active_goals:
        chat = db.query(Chat).filter(Chat.goal_id == goal.id).first()
        if not chat:
            continue
        
        # Check if we already sent a message today
        last_ai_msg = get_last_ai_message_time(db, chat.id)
        if last_ai_msg and last_ai_msg.date() == now.date():
            # Already sent today
            continue
        
        # Check if user was active recently (don't wake them up!)
        last_user_msg = get_last_user_message_time(db, chat.id)
        if last_user_msg and (now - last_user_msg).total_seconds() < 3600:
            # User was active in last hour, skip
            continue
        
        # Get pending agreements
        pending_agreements = crud.agreement.get_pending_agreements(db, goal.id)
        tone = _goal_tone(db, goal.id)

        content = coach_voice.pick("morning", tone, goal=goal.title)

        if pending_agreements:
            agreement = pending_agreements[0]
            hours_left = (agreement.deadline - now).total_seconds() / 3600
            if hours_left <= 24:
                content = coach_voice.pick(
                    "morning_deadline", tone,
                    desc=agreement.description, hours=int(hours_left),
                )

        suggestions = ["Доброе утро!", "Начну сейчас", "Позже"]
        content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
        
        await send_proactive_message(db, chat.id, content, min_interval=0)
        print(f"✅ Morning motivation sent for chat {chat.id}")


async def check_and_mark_missed_agreements(db: Session):
    """Mark agreements as missed if deadline passed and no response"""
    now = datetime.utcnow()
    
    # Get agreements that are overdue by more than 24 hours
    overdue = db.query(Agreement).filter(
        Agreement.status == AgreementStatus.PENDING,
        Agreement.deadline < now - timedelta(hours=24),
        Agreement.checklist_sent == True
    ).all()
    
    for agreement in overdue:
        # Mark as missed
        crud.agreement.miss_agreement(db, agreement.id)
        
        # Send "shaming" message
        chat = db.query(Chat).filter(Chat.goal_id == agreement.goal_id).first()
        if chat:
            tone = _goal_tone(db, agreement.goal_id)
            content = coach_voice.pick("missed_agreement", tone, desc=agreement.description)
            suggestions = ["Извини, забыл", "Нужна помощь", "Продолжаю"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, content, min_interval=0)
            print(f"✅ Missed agreement message sent for agreement {agreement.id}")


async def proactive_check_loop():
    """Background loop that checks for reminders and deadlines - Duolingo style!"""
    print("🚀 Proactive service started (Duolingo mode: ON 🦉)")
    
    while True:
        try:
            db = SessionLocal()
            try:
                # Check every 5 minutes for urgent stuff
                await check_and_send_reminders(db)
                await check_and_send_deadline_checklists(db)
                await check_and_mark_missed_agreements(db)
                
                # Check every 30 minutes for missed days
                await check_and_send_missed_days_messages(db)
                
                # Check every hour for morning motivations
                await check_and_send_morning_motivations(db)
                
            finally:
                db.close()
        except Exception as e:
            print(f"❌ Proactive service error: {e}")
            import traceback
            traceback.print_exc()
        
        # Check every 5 minutes (aggressive like Duolingo!)
        await asyncio.sleep(300)


def start_proactive_service():
    """Start the proactive service in background"""
    asyncio.create_task(proactive_check_loop())

