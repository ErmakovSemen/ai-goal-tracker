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

# Store for tracking active chats (in production, use Redis)
active_chats: dict = {}

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
        
        hours_left = (agreement.deadline - now).total_seconds() / 3600
        
        # Multiple reminders based on time left
        # 1. First reminder: 24 hours before
        if 20 <= hours_left <= 24 and not agreement.reminder_sent:
            reminders_24h = [
                f"🦉 Эй! Не забыл? Ты обещал: {agreement.description}\n\nОсталось {int(hours_left)} часов. Как прогресс?",
                f"👀 Я слежу за тобой! До дедлайна {int(hours_left)} ч.\n\nЗадача: {agreement.description}\n\nУспеваешь?",
                f"⏰ Тик-так! {agreement.description} — осталось {int(hours_left)} часов!\n\nНе подведи меня 🦉",
                f"🔔 Напоминалка! Мы договаривались: {agreement.description}\n\nВремя идёт... {int(hours_left)} ч. до дедлайна!"
            ]
            reminder_content = random.choice(reminders_24h)
            suggestions = ["Уже делаю!", "Сделаю сегодня", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, reminder_content, min_interval=0)
            crud.agreement.mark_reminder_sent(db, agreement.id)
            print(f"✅ 24h reminder sent for agreement {agreement.id}")
        
        # 2. Second reminder: 12 hours before (more urgent!)
        elif 10 <= hours_left <= 12:
            reminders_12h = [
                f"🦉 Эй-эй! Время идёт! Ты обещал: {agreement.description}\n\nОсталось всего {int(hours_left)} часов! Как дела?",
                f"⏰ {int(hours_left)} часов до дедлайна! {agreement.description}\n\nТы же не хочешь меня расстроить? 🦉",
                f"👀 Я всё ещё слежу! {agreement.description} — через {int(hours_left)} ч. дедлайн!\n\nВсё под контролем?",
                f"🔔 Напоминаю ещё раз! {agreement.description}\n\nОсталось {int(hours_left)} часов. Не забудь!"
            ]
            reminder_content = random.choice(reminders_12h)
            suggestions = ["В процессе!", "Скоро начну", "Всё под контролем"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, reminder_content, min_interval=60)
            print(f"✅ 12h reminder sent for agreement {agreement.id}")
        
        # 3. Third reminder: 6 hours before (very urgent!)
        elif 4 <= hours_left <= 6:
            reminders_6h = [
                f"🦉 ЭЙ! Внимание! {agreement.description}\n\nОсталось всего {int(hours_left)} часов! Ты точно успеешь?",
                f"⏰ {int(hours_left)} часов! {agreement.description}\n\nЯ начинаю волноваться... 🦉 Всё ок?",
                f"👀 Последний рывок! {agreement.description} — через {int(hours_left)} ч.!\n\nКак прогресс?",
                f"🔔 Срочно! {agreement.description}\n\nОсталось {int(hours_left)} часов. Не подведи!"
            ]
            reminder_content = random.choice(reminders_6h)
            suggestions = ["Почти готово!", "Сейчас доделаю", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, reminder_content, min_interval=60)
            print(f"✅ 6h reminder sent for agreement {agreement.id}")
        
        # 4. Last reminder: 2 hours before (PANIC MODE!)
        elif 1 <= hours_left <= 2:
            reminders_2h = [
                f"🦉 ЭЙ-ЭЙ-ЭЙ! {agreement.description}\n\nОСТАЛОСЬ {int(hours_left)} ЧАСА! Ты где?!",
                f"⏰ {int(hours_left)} часа до дедлайна! {agreement.description}\n\nЯ очень волнуюсь... 🦉 Ты успеешь?",
                f"👀 ПОСЛЕДНИЙ ШАНС! {agreement.description} — через {int(hours_left)} ч.!\n\nВсё под контролем?",
                f"🔔 СРОЧНО! {agreement.description}\n\nОсталось {int(hours_left)} часа. Не забудь!"
            ]
            reminder_content = random.choice(reminders_2h)
            suggestions = ["Почти готово!", "Сейчас доделаю", "Нужна помощь"]
            reminder_content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, reminder_content, min_interval=30)
            print(f"✅ 2h reminder sent for agreement {agreement.id}")


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
        
        intros = [
            f"🦉 Та-дам! Время проверки!\n\nТы обещал: {agreement.description}\n\nНу что, справился? Давай честно!",
            f"⏰ Дедлайн! Как там с задачей?\n\n📝 {agreement.description}\n\nПокажи результат! 👇",
            f"🔔 Время пришло! Мы договаривались: {agreement.description}\n\nРассказывай, что получилось!"
        ]
        content = random.choice(intros) + f"\n\n<!--CHECKLIST:{json.dumps(checklist_data, ensure_ascii=False)}-->"
        
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
        
        # Different messages based on days missed
        if days_since == 1:
            # First day missed - gentle reminder
            messages = [
                "🦉 Эй, ты где? Я скучаю!\n\nВчера ты не заходил. Всё в порядке?",
                "👀 Я заметил, что ты вчера не появлялся...\n\nВсё хорошо? Может, продолжим?",
                "🦉 Привет! Вчера тебя не было видно.\n\nКак дела с целью? Давай вернёмся к ней!"
            ]
            content = random.choice(messages)
            suggestions = ["Вернулся!", "Был занят", "Продолжаю"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, content, min_interval=120)
            print(f"✅ 1-day missed message sent for chat {chat.id}")
        
        elif days_since == 2:
            # Second day - more concerned
            messages = [
                "🦉 Эй-эй! Ты пропустил уже 2 дня подряд!\n\nЯ начинаю волноваться... Всё ок?",
                "👀 Два дня без тебя! Это не похоже на тебя...\n\nЧто случилось? Может, нужна помощь?",
                "🦉 Хм, ты пропустил 2 дня. Я немного расстроен... 😔\n\nДавай вернёмся к цели?"
            ]
            content = random.choice(messages)
            suggestions = ["Вернулся!", "Был занят", "Нужна помощь"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, content, min_interval=120)
            print(f"✅ 2-day missed message sent for chat {chat.id}")
        
        elif days_since == 3:
            # Third day - Duolingo style "shaming" (but friendly!)
            messages = [
                "🦉 ЭЙ! Ты пропустил 3 дня подряд! 😤\n\nЯ очень расстроен... Мы же договаривались!",
                "👀 Три дня без тебя! Это уже серьёзно...\n\nЯ верю в тебя, но нужно возвращаться! 🦉",
                "🦉 Хм, 3 дня пропущено. Я начинаю думать, что ты меня забыл... 😢\n\nВернись, пожалуйста!"
            ]
            content = random.choice(messages)
            suggestions = ["Вернулся!", "Извини", "Продолжаю"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, content, min_interval=120)
            print(f"✅ 3-day missed message sent for chat {chat.id}")
        
        elif days_since >= 7:
            # Week missed - very concerned but encouraging
            messages = [
                f"🦉 Эй... Ты пропустил уже {days_since} дней. Я очень скучаю...\n\nДавай вернёмся? Я верю, что у тебя всё получится!",
                f"👀 {days_since} дней без тебя... Это долго.\n\nНо я не сдаюсь! Давай начнём заново? 🦉",
                f"🦉 Я всё ещё здесь! Ты пропустил {days_since} дней, но я не теряю надежду.\n\nВернись, пожалуйста. Я помогу тебе!"
            ]
            content = random.choice(messages)
            suggestions = ["Вернулся!", "Начну заново", "Нужна помощь"]
            content += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
            
            await send_proactive_message(db, chat.id, content, min_interval=180)
            print(f"✅ {days_since}-day missed message sent for chat {chat.id}")


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
        
        morning_messages = [
            f"🌅 Доброе утро! Готов к новому дню?\n\nСегодня отличный день, чтобы поработать над целью: {goal.title}",
            f"🦉 Привет! Утро — лучшее время для продуктивности!\n\nКак дела с целью '{goal.title}'?",
            f"☀️ Доброе утро! Я проснулся и сразу подумал о тебе!\n\nДавай сегодня сделаем шаг к цели: {goal.title}"
        ]
        
        if pending_agreements:
            agreement = pending_agreements[0]
            hours_left = (agreement.deadline - now).total_seconds() / 3600
            if hours_left <= 24:
                morning_messages = [
                    f"🌅 Доброе утро! Напоминаю: сегодня дедлайн по '{agreement.description}'!\n\nОсталось {int(hours_left)} часов. Успеешь?",
                    f"🦉 Утро! Сегодня важный день — дедлайн по '{agreement.description}'!\n\nОсталось {int(hours_left)} часов. Всё под контролем?",
                    f"☀️ Доброе утро! Не забудь: '{agreement.description}' — дедлайн через {int(hours_left)} ч.!\n\nГотов?"
                ]
        
        content = random.choice(morning_messages)
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
            missed_messages = [
                f"🦉 Хм... Дедлайн по '{agreement.description}' прошёл, а я не получил ответа...\n\nЧто случилось? 😔",
                f"👀 Я заметил, что дедлайн по '{agreement.description}' прошёл...\n\nВсё в порядке? Может, нужно было больше времени?",
                f"🦉 Эй, дедлайн по '{agreement.description}' прошёл...\n\nЯ немного расстроен, но понимаю, что бывает. Что дальше?"
            ]
            content = random.choice(missed_messages)
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

