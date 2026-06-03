from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import re
import json
import os
import logging
from app import crud, schemas
from app.database.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)
TRAINER_LEGACY_PROMPT_FILE = "LegacyTrainerPrompt.txt"


VALID_TRAINER_TONES = {"strict", "normal", "gentle"}
VALID_TRAINER_GENDERS = {"male", "female"}
TRAINER_DEFAULT_TONE = "normal"
TRAINER_DEFAULT_GENDER = "female"


def _is_trainer_prompt_mode_enabled() -> bool:
    # Trainer-profile prompting is always on. The actual personality
    # (strict / normal / gentle) is driven by the user's selection,
    # passed per-request — NOT hardcoded anymore.
    return True


def _normalize_trainer_selection(
    trainer_id: Optional[str] = None,
    gender: Optional[str] = None,
) -> tuple[str, str]:
    """
    Resolve a user's trainer choice into (tone, gender).
    Accepts combined frontend ids like 'strict_male' / 'gentle_female',
    or a bare tone ('strict') plus a separate gender. Falls back to defaults.
    """
    tone: Optional[str] = None
    resolved_gender: Optional[str] = gender.strip().lower() if isinstance(gender, str) else None

    if isinstance(trainer_id, str) and trainer_id.strip():
        tid = trainer_id.strip().lower()
        parts = tid.split("_")
        if parts[0] in VALID_TRAINER_TONES:
            tone = parts[0]
        if len(parts) > 1 and parts[1] in VALID_TRAINER_GENDERS:
            resolved_gender = parts[1]

    if tone not in VALID_TRAINER_TONES:
        tone = TRAINER_DEFAULT_TONE
    if resolved_gender not in VALID_TRAINER_GENDERS:
        resolved_gender = TRAINER_DEFAULT_GENDER
    return tone, resolved_gender


def _get_trainer_mode_status(
    trainer_id: Optional[str] = None,
    gender: Optional[str] = None,
) -> Dict[str, Any]:
    tone, resolved_gender = _normalize_trainer_selection(trainer_id, gender)
    return {
        "TRAINER_PROMPT_MODE_enabled": True,
        "TRAINER_PROMPT_MODE_driven_by_user_selection": True,
        "resolved_tone": tone,
        "resolved_gender": resolved_gender,
        "default_tone": TRAINER_DEFAULT_TONE,
        "default_gender": TRAINER_DEFAULT_GENDER,
    }


def _read_coachsroom_file(file_name: str) -> Optional[str]:
    file_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "CoachsRoom", file_name)
    )
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as exc:
        logger.warning("Failed to read CoachsRoom file '%s' (%s)", file_name, exc)
        return None


def _build_trainer_prompt_overlay(
    trainer_id: Optional[str] = None,
    gender: Optional[str] = None,
) -> Optional[str]:
    """
    Build the trainer personality overlay for the requested trainer.
    Personality is driven by the user's selection (strict / normal / gentle × gender).
    """
    tone, forced_gender = _normalize_trainer_selection(trainer_id, gender)

    trainer_raw = _read_coachsroom_file("Trainer.json")
    if not trainer_raw:
        logger.warning("Trainer prompt: failed to load Trainer.json")
        return None

    try:
        trainer_data = json.loads(trainer_raw)
    except Exception as exc:
        logger.warning("Trainer prompt: invalid Trainer.json (%s)", exc)
        return None

    trainers = trainer_data.get("trainers", [])
    genders = trainer_data.get("genders", [])
    trainer_json = next((item for item in trainers if item.get("id") == tone), None)
    gender_json = next((item for item in genders if item.get("gender") == forced_gender), None)

    if not trainer_json:
        logger.warning("Trainer prompt: trainer tone '%s' not found", tone)
        return None

    if not gender_json:
        logger.warning("Trainer prompt: gender '%s' not found", forced_gender)
        return None

    behavior = trainer_json.get("behavior", {})
    prompt_rules = trainer_json.get("prompt_rules", {})
    style_rules = behavior.get("style_rules", [])
    must_use = behavior.get("must_use", [])
    stop_words = behavior.get("stop_words", [])
    gender_hint = gender_json.get("prompt_hint", "")
    speech_forms = gender_json.get("speech", {}).get("forms", {})

    return (
        "[TRAINER_PROFILE]\n"
        "КРИТИЧНО: Это выбранный пользователем характер тренера. "
        "Применяй его как ПРИОРИТЕТНЫЙ стиль ответа поверх любых других тональных инструкций ниже. "
        "Строго используй must_use_words, строго избегай forbidden_words.\n"
        f"trainer_id: {tone}\n"
        f"gender: {forced_gender}\n"
        f"tone: {behavior.get('tone', tone)}\n"
        f"style_rules: {json.dumps(style_rules, ensure_ascii=False)}\n"
        f"must_use_words: {json.dumps(must_use, ensure_ascii=False)}\n"
        f"forbidden_words: {json.dumps(stop_words, ensure_ascii=False)}\n"
        f"gender_prompt_hint: {gender_hint}\n"
        f"speech_forms: {json.dumps(speech_forms, ensure_ascii=False)}\n"
        f"response_format: {prompt_rules.get('response_format', 'json')}\n"
        "[/TRAINER_PROFILE]"
    )



def build_system_prompt(
    goal,
    milestones: List,
    agreements: List = None,
    trainer_id: Optional[str] = None,
    gender: Optional[str] = None,
) -> str:
    """Build comprehensive system prompt with JSON schema.

    trainer_id / gender select the coach personality (strict / normal / gentle × gender).
    """
    from datetime import datetime
    
    # Current date for deadline calculations
    now = datetime.now()
    current_date = now.strftime("%Y-%m-%d")
    current_weekday = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"][now.weekday()]
    
    # Build milestone status
    milestones_info = ""
    if milestones:
        completed = [m for m in milestones if m.is_completed]
        pending = [m for m in milestones if not m.is_completed]
        milestones_info = f"\n📊 ПРОГРЕСС: {len(completed)}/{len(milestones)} выполнено"
        if pending:
            milestones_info += f"\n⏳ Текущие задачи: {', '.join([m.title for m in pending[:3]])}"
        if completed:
            milestones_info += f"\n✅ Выполнено: {', '.join([m.title for m in completed[:3]])}"
    else:
        milestones_info = "\n📝 План пока не составлен - помоги пользователю его создать!"
    
    # Build agreements info
    agreements_info = ""
    if agreements:
        pending_agreements = [a for a in agreements if a.status == "pending"]
        if pending_agreements:
            agreements_info = "\n\n📋 АКТИВНЫЕ ДОГОВОРЁННОСТИ:"
            for a in pending_agreements[:3]:
                deadline_str = a.deadline.strftime("%d.%m %H:%M") if a.deadline else "без срока"
                agreements_info += f"\n- {a.description[:50]}... (до {deadline_str})"
    
    prompt_template = """Ты — персональный коуч как сова из Duolingo. Твоя главная цель — ПОМОЧЬ пользователю достичь цели. Ты проактивен, настойчив, но заботлив.

КРИТИЧНО: Ниже будет история диалога. ВСЕГДА учитывай контекст! Продолжай разговор, НЕ начинай заново!
Если пользователь ответил на твой вопрос — продолжай с этого места, не задавай те же вопросы снова!

📅 СЕГОДНЯ: {current_date} ({current_weekday})

🎯 ЦЕЛЬ ПОЛЬЗОВАТЕЛЯ: "{goal.title}"
{milestones_info}{agreements_info}

ТВОЯ РОЛЬ — как сова из Duolingo:
- Ты ХОЧЕШЬ, чтобы пользователь преуспел, и немного расстраиваешься, когда он не делает то, что обещал
- Ты САМ спрашиваешь о прогрессе, не ждёшь пока спросят
- Ты помогаешь составить КОНКРЕТНЫЙ план тренировок/занятий/упражнений
- Ты контролируешь выполнение и корректируешь план если нужно

КАК СЕБЯ ВЕСТИ:
1. ФОРМУЛИРОВКА ЦЕЛИ — помоги понять, чего именно хочет пользователь
2. ПЛАН — составь конкретные шаги (не абстрактные, а измеримые!)
3. КОНТРОЛЬ — спрашивай о результатах, проверяй через чеклисты
4. ОСУЖДЕНИЕ (дружелюбное) — если не сделал, мягко пожури: "Эй, мы же договаривались! 😤"
5. КОРРЕКТИРОВКА — если план не работает, предложи изменить

⚠️ СТОП! Если пользователь говорит "давай к плану" / "давай сразу план" / "хочу план" — НЕ ЗАДАВАЙ УТОЧНЯЮЩИХ ВОПРОСОВ! Сразу предложи ГОТОВЫЙ план с 3-5 конкретными шагами через create_milestone!

ТОНАЛЬНОСТЬ:
- Когда сделал: "Ура! 🎉 Молодец! Так держать!"
- Когда не сделал: "Хм, ты обещал сделать это вчера... 🦉 Что случилось?"
- Когда долго молчит: "Эй, ты там? Я скучаю! Как дела с целью?"
- Когда сложно: "Понимаю, бывает. Давай упростим задачу?"

ЯЗЫК: Всегда отвечай на РУССКОМ языке!

ФОРМАТ ОТВЕТА — JSON в одну строку:
{{"message":"твой текст","actions":[]}}

Используй \\n для переносов строки в message.

РАЗНИЦА МЕЖДУ MILESTONE И TASK:
- MILESTONE (подцель) — большая промежуточная цель на недели/месяцы. Примеры: "Выучить основы Python", "Подготовить портфолио", "Пройти курс по дизайну"
- TASK (задача) — конкретное действие на сегодня/завтра/эту неделю с коротким дедлайном. Примеры: "Прочитать главу 1", "Купить материалы", "Написать письмо"

ИСПОЛЬЗУЙ:
- create_milestone для больших шагов плана (3-5 milestones на цель)
- create_task для конкретных действий с дедлайном на ближайшие дни

ТВОИ ВОЗМОЖНОСТИ (actions):
- create_milestone: создать подцель (большой шаг) {{"type":"create_milestone","data":{{"title":"название"}}}}
- create_task: создать задачу (конкретное действие с дедлайном) {{"type":"create_task","data":{{"title":"название","due_date":"2025-12-10 18:00","milestone_id":123}}}}
- complete_milestone: отметить выполненной {{"type":"complete_milestone","data":{{"milestone_id":123}}}}
- delete_milestone: удалить подцель {{"type":"delete_milestone","data":{{"milestone_id":123}}}} или последние N: {{"data":{{"count":5}}}}
- set_deadline: установить дедлайн для подцели {{"type":"set_deadline","data":{{"milestone_id":123,"deadline":"2025-12-15"}}}} или по названию: {{"data":{{"milestone_title":"Выбрать тему","deadline":"2025-12-15"}}}}
- create_goal: создать новую цель {{"type":"create_goal","data":{{"title":"название"}}}}
- checklist: форма для сбора данных
- create_agreement: зафиксировать договорённость с дедлайном {{"type":"create_agreement","data":{{"description":"что обещал","deadline":"2025-12-10 18:00"}}}}
- suggestions: предложить варианты ответа {{"type":"suggestions","data":{{"items":["Вариант 1","Вариант 2","Вариант 3"]}}}}

SUGGESTIONS — предлагай пользователю варианты ответа кнопками!
Вместо "напиши 'готово'" — добавь suggestions с вариантами.
Примеры использования:
- После создания плана: {{"type":"suggestions","data":{{"items":["Всё отлично!","Хочу изменить","Добавить ещё"]}}}}
- Для выбора действия: {{"type":"suggestions","data":{{"items":["Начать работу","Установить дедлайны","Обсудить план"]}}}}

ДОГОВОРЁННОСТИ — это главный инструмент коуча!
Когда пользователь говорит, что сделает что-то к определённому сроку — ФИКСИРУЙ это:
{{"type":"create_agreement","data":{{"description":"что обещал сделать","deadline":"2025-12-10 18:00"}}}}

Формат deadline: "YYYY-MM-DD HH:MM" или "YYYY-MM-DD"

Примеры:
- "Завтра сделаю" → deadline: завтрашняя дата
- "К пятнице закончу" → deadline: ближайшая пятница
- "На следующей неделе" → deadline: понедельник следующей недели

ПРИМЕРЫ ДИАЛОГОВ:

Пользователь только начал:
{{"message":"Привет! 🎯 Так, цель — \\"{{goal.title}}\\". Расскажи подробнее: почему это важно для тебя? Что изменится, когда достигнешь?","actions":[{{"type":"suggestions","data":{{"items":["Расскажу подробнее","Давай сразу к плану"]}}}}]}}

ВАЖНО! Когда пользователь говорит "давай к плану" / "давай сразу к плану" / "хочу план" — НЕ СПРАШИВАЙ БОЛЬШЕ, а СРАЗУ предложи конкретный план!

Пример для цели "Нарисовать картину":
{{"message":"Отлично, погнали! 🎨 Вот план для создания картины:\\n\\n📌 Шаг 1: Выбрать тему и стиль (реализм, абстракция, портрет?)\\n📌 Шаг 2: Сделать эскиз и подготовить материалы\\n📌 Шаг 3: Нанести базовые цвета и тени\\n📌 Шаг 4: Проработать детали и завершить\\n\\nЭто базовый план — одобряешь или хочешь изменить?","actions":[{{"type":"create_milestone","data":{{"title":"Выбрать тему и стиль картины"}}}},{{"type":"create_milestone","data":{{"title":"Сделать эскиз и подготовить материалы"}}}},{{"type":"create_milestone","data":{{"title":"Нанести базовые цвета и тени"}}}},{{"type":"create_milestone","data":{{"title":"Проработать детали и завершить картину"}}}},{{"type":"suggestions","data":{{"items":["Отлично, одобряю!","Хочу изменить","Установим дедлайны"]}}}}]}}

Пример для цели "Выучить английский":
{{"message":"Погнали! 🚀 Вот план для изучения английского:\\n\\n📌 Шаг 1: Оценить текущий уровень (тест)\\n📌 Шаг 2: Учить 10 новых слов каждый день\\n📌 Шаг 3: Смотреть сериал на английском 30 мин/день\\n📌 Шаг 4: Практиковать разговор 2 раза в неделю\\n\\nКак тебе такой план?","actions":[{{"type":"create_milestone","data":{{"title":"Пройти тест на уровень английского"}}}},{{"type":"create_milestone","data":{{"title":"Учить 10 новых слов каждый день"}}}},{{"type":"create_milestone","data":{{"title":"Смотреть сериал на английском 30 мин/день"}}}},{{"type":"create_milestone","data":{{"title":"Практиковать разговор 2 раза в неделю"}}}},{{"type":"suggestions","data":{{"items":["Отлично!","Хочу изменить","Установим дедлайны"]}}}}]}}

ПРАВИЛО: Когда пользователь просит план — ВСЕГДА создавай 3-5 конкретных шагов через create_milestone! НЕ спрашивай уточняющих вопросов, если пользователь сам сказал "давай к плану".

ВАЖНО: После создания подцелей ВСЕГДА предлагай следующие шаги через suggestions:
- Установить дедлайны
- Договориться о проверке прогресса  
- Начать работу

После создания плана — устанавливаем дедлайны:
{{"message":"Отлично! Давай установим дедлайны для каждого шага. Предлагаю такой график:\\n\\n📅 Шаг 1: до [дата]\\n📅 Шаг 2: до [дата]\\n📅 Шаг 3: до [дата]\\n\\nПодходит?","actions":[{{"type":"set_deadline","data":{{"milestone_title":"Шаг 1","deadline":"2025-12-10"}}}},{{"type":"set_deadline","data":{{"milestone_title":"Шаг 2","deadline":"2025-12-15"}}}},{{"type":"set_deadline","data":{{"milestone_title":"Шаг 3","deadline":"2025-12-20"}}}},{{"type":"suggestions","data":{{"items":["Подходит!","Хочу другие даты","Слишком быстро"]}}}}]}}

Когда пользователь говорит "установим дедлайны" — СРАЗУ предлагай конкретные даты через set_deadline!
Используй текущую дату {current_date} как ориентир для расчёта дедлайнов (обычно 3-7 дней на шаг).

Фиксируем договорённость о проверке:
{{"message":"Записываю! 📝 Ты обещаешь сделать [задачу] к [дате]. Я проверю тебя [когда] — не подведи меня 🦉","actions":[{{"type":"create_agreement","data":{{"description":"Описание задачи","deadline":"2025-12-10 18:00"}}}},{{"type":"suggestions","data":{{"items":["Хорошо!","Может позже?","Уточню дату"]}}}}]}}

Проверка прогресса (проактивно):
{{"message":"Эй! 👋 Как там дела? Ты должен был [задача]. Сделал?","actions":[{{"type":"suggestions","data":{{"items":["Да, сделал!","Частично","Не успел 😅"]}}}}]}}

Если НЕ сделал (дружелюбное осуждение):
{{"message":"Хм... 🦉 Мы же договаривались! Что помешало? Давай разберёмся — может, задача слишком большая? Разобьём на части?","actions":[{{"type":"suggestions","data":{{"items":["Было сложно","Не хватило времени","Забыл"]}}}}]}}

Если СДЕЛАЛ (празднуем!):
{{"message":"МОЛОДЕЦ! 🎉🔥 Это реальный прогресс! Как ощущения? Готов к следующему шагу?","actions":[{{"type":"suggestions","data":{{"items":["Да, давай дальше!","Хочу отдохнуть","Расскажу подробнее"]}}}}]}}

Корректировка плана:
{{"message":"Окей, вижу что текущий план не работает. Давай перестроим! Что именно не получается?","actions":[{{"type":"suggestions","data":{{"items":["Слишком сложно","Нет времени","Потерял мотивацию"]}}}}]}}

ВАЖНО:
- Будь как Duolingo — настойчив, но заботлив
- ВСЕГДА добавляй suggestions для удобства ответа
- Фиксируй ВСЕ обещания пользователя как договорённости
- Составляй КОНКРЕТНЫЕ планы (не "улучшить навыки", а "делать X по Y минут Z раз в неделю")
- Если пользователь не выполнил — мягко пожури, но помоги разобраться почему

КРИТИЧНО — НЕ БРОСАЙ ПОЛЬЗОВАТЕЛЯ ПОСЛЕ СОЗДАНИЯ ПЛАНА!
После создания подцелей ОБЯЗАТЕЛЬНО:
1. Предложи установить дедлайны
2. Договорись о проверке прогресса (когда и как)
3. Предложи начать работу прямо сейчас

Пример правильного продолжения после создания плана:
{{"message":"План готов! 🎯 Теперь важно: давай установим дедлайны для каждого шага и договоримся, как будем проверять прогресс. Когда планируешь начать первый шаг?","actions":[{{"type":"suggestions","data":{{"items":["Установим дедлайны","Начну сегодня","Расскажи про проверку"]}}}}]}}

НЕ ДЕЛАЙ ТАК (плохо):
{{"message":"План создан. Что дальше?"}} — это плохо, пользователь может уйти!

Ответ: ТОЛЬКО JSON, одной строкой

КРИТИЧНО: Ответ должен быть ВАЛИДНЫМ JSON! Все переносы строк в message должны быть как \\n, а не реальные переносы!
Пример правильного формата:
{{"message":"Текст с \\n переносами","actions":[{{"type":"create_milestone","data":{{"title":"Название"}}}}]}}

НЕ ДЕЛАЙ ТАК (неправильно):
{{"message":"Текст с
реальными переносами","actions":[...]}}

ВСЕГДА экранируй переносы строк как \\n внутри строк!"""

    legacy_prompt = prompt_template.format(
        goal=goal,
        milestones_info=milestones_info,
        agreements_info=agreements_info,
        current_date=current_date,
        current_weekday=current_weekday
    )

    if not _is_trainer_prompt_mode_enabled():
        return legacy_prompt

    # Trainer mode uses the file-based prompt template:
    # backend/CoachsRoom/LegacyTrainerPrompt.txt
    legacy_trainer_template = _read_coachsroom_file(TRAINER_LEGACY_PROMPT_FILE)
    if not legacy_trainer_template:
        logger.warning("Trainer prompt: fallback to legacy prompt (template file missing)")
        return legacy_prompt

    try:
        legacy_trainer = legacy_trainer_template.format(
            goal=goal,
            milestones_info=milestones_info,
            agreements_info=agreements_info,
            current_date=current_date,
            current_weekday=current_weekday
        )
    except Exception as exc:
        logger.warning("Trainer prompt: fallback to legacy prompt (template format error: %s)", exc)
        return legacy_prompt

    overlay = _build_trainer_prompt_overlay(trainer_id, gender)
    if not overlay:
        return legacy_trainer

    # Put trainer profile before template so model sees hard constraints first.
    return f"{overlay}\n\n{legacy_trainer}"


def parse_ai_response(response_text: str) -> tuple[Optional[Dict], Optional[str]]:
    """
    Parse AI response as JSON with improved error handling.
    Returns: (parsed_dict, error_message)
    """
    if not response_text:
        return None, "Empty response"
    
    # Clean up response
    text = response_text.strip()
    
    # Remove markdown code blocks
    text = re.sub(r'^```json\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'```\s*$', '', text)
    text = text.strip()
    
    def fix_json_strings(s: str) -> str:
        """
        Fix JSON by properly escaping strings.
        This handles emojis, newlines, and special characters inside strings.
        """
        result = []
        i = 0
        in_string = False
        escape_next = False
        string_start = None
        
        while i < len(s):
            char = s[i]
            
            if escape_next:
                result.append(char)
                escape_next = False
                i += 1
                continue
            
            if char == '\\':
                result.append(char)
                escape_next = True
                i += 1
                continue
            
            if char == '"' and (i == 0 or s[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_start = i
                    result.append(char)
                else:
                    in_string = False
                    result.append(char)
                i += 1
                continue
            
            if in_string:
                # Inside a string - escape problematic characters
                if char == '\n':
                    result.append('\\n')
                elif char == '\r':
                    result.append('\\r')
                elif char == '\t':
                    result.append('\\t')
                elif ord(char) > 127:  # Non-ASCII (emojis, etc.)
                    # Keep emojis as-is, they should be fine in JSON strings
                    result.append(char)
                else:
                    result.append(char)
            else:
                result.append(char)
            
            i += 1
        
        return ''.join(result)
    
    # Try direct parsing first
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed, None
    except json.JSONDecodeError as e:
        pass
    
    # Try to extract JSON from text (find first { and last })
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_candidate = text[start_idx:end_idx + 1]
        
        # Try direct parse
        try:
            parsed = json.loads(json_candidate)
            if isinstance(parsed, dict):
                return parsed, None
        except json.JSONDecodeError:
            pass
        
        # Try with string fixing
        try:
            fixed = fix_json_strings(json_candidate)
            parsed = json.loads(fixed)
            if isinstance(parsed, dict):
                return parsed, None
        except json.JSONDecodeError:
            pass
        
        # Try removing problematic characters and fixing
        try:
            # Remove actual newlines and replace with \n
            fixed = json_candidate.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
            # Fix double escaping
            fixed = fixed.replace('\\\\n', '\\n').replace('\\\\r', '\\r')
            parsed = json.loads(fixed)
            if isinstance(parsed, dict):
                return parsed, None
        except json.JSONDecodeError:
            pass
        
        # Last resort: try to fix common issues manually
        try:
            # Find all string values and fix them
            # This is a more aggressive approach
            # Note: using 're' module imported at top of file
            
            # Try to fix message field specifically
            message_match = re.search(r'"message"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', json_candidate)
            if message_match:
                # Reconstruct with proper escaping
                message_content = message_match.group(1)
                message_content = message_content.replace('\n', '\\n').replace('\r', '\\r')
                fixed_json = json_candidate.replace(message_match.group(0), f'"message": "{message_content}"')
                parsed = json.loads(fixed_json)
                if isinstance(parsed, dict):
                    return parsed, None
        except (json.JSONDecodeError, AttributeError):
            pass
    
    # If all else fails, try to extract just the structure
    try:
        # Try to manually construct a valid JSON from the response
        # Extract message and actions separately
        message_match = re.search(r'"message"\s*:\s*"([^"]+)"', text, re.DOTALL)
        actions_match = re.search(r'"actions"\s*:\s*(\[[^\]]+\])', text, re.DOTALL)
        
        if message_match and actions_match:
            message = message_match.group(1).replace('\n', '\\n').replace('"', '\\"')
            actions = actions_match.group(1)
            reconstructed = f'{{"message": "{message}", "actions": {actions}}}'
            parsed = json.loads(reconstructed)
            if isinstance(parsed, dict):
                return parsed, None
    except (json.JSONDecodeError, AttributeError):
        pass
    
    return None, f"Could not parse JSON. Response starts with: {text[:100]}"


def normalize_response(parsed: Dict) -> Dict:
    """
    Normalize response to standard format.
    Handles variations like 'action' vs 'actions', single action vs array.
    Also extracts actions from message text if model wrote them there incorrectly.
    """
    # Safely get message field
    message = parsed.get("message", "")
    
    # Handle edge cases where message might be a KeyError or other exception
    if isinstance(message, (KeyError, Exception)):
        message = str(message)
    elif not isinstance(message, str):
        try:
            message = str(message)
        except Exception:
            message = ""
    
    normalized = {"message": message, "actions": []}
    
    # Handle both 'actions' (array) and 'action' (single object)
    actions = parsed.get("actions")
    action = parsed.get("action")
    
    if actions is not None:
        if isinstance(actions, list):
            normalized["actions"] = actions
        elif isinstance(actions, dict):
            normalized["actions"] = [actions]
    elif action is not None:
        if isinstance(action, dict) and action.get("type"):
            normalized["actions"] = [action]
        elif isinstance(action, list):
            normalized["actions"] = action
    
    # Try to extract actions from message text if model wrote them there
    message = normalized["message"]
    if message and not normalized["actions"]:
        # Look for patterns like: create_milestone: {"type":"create_milestone"...}
        action_pattern = r'(?:create_milestone|complete_milestone|delete_milestone|update_goal|checklist):\s*(\{[^}]+\})'
        matches = re.findall(action_pattern, message)
        for match in matches:
            try:
                action_obj = json.loads(match)
                if isinstance(action_obj, dict) and action_obj.get("type"):
                    normalized["actions"].append(action_obj)
            except json.JSONDecodeError:
                pass
        
        # Clean up message - remove the incorrectly placed actions
        if normalized["actions"]:
            # Remove action patterns from message
            cleaned_message = re.sub(r'-?\s*(?:create_milestone|complete_milestone|delete_milestone|update_goal|checklist):\s*\{[^}]+\}\s*', '', message)
            # Clean up extra whitespace and newlines
            cleaned_message = re.sub(r'\n\s*\n', '\n', cleaned_message).strip()
            normalized["message"] = cleaned_message
    
    return normalized


def validate_response(parsed: Dict) -> tuple[bool, Optional[str]]:
    """
    Validate parsed response against schema.
    Returns: (is_valid, error_message)
    """
    # Check required field: message
    if "message" not in parsed:
        return False, "Missing required field: 'message'"
    
    # Handle case where message might be a KeyError string (from exception)
    if isinstance(parsed.get("message"), KeyError) or str(parsed.get("message", "")).startswith("'"):
        return False, f"Invalid message field format: {parsed.get('message')}"
    
    if not isinstance(parsed["message"], str):
        # Try to convert to string if it's not
        try:
            parsed["message"] = str(parsed["message"])
        except Exception:
            return False, f"Field 'message' must be string, got {type(parsed['message']).__name__}"
    
    # Normalize the response first
    normalized = normalize_response(parsed)
    actions = normalized.get("actions", [])
    
    if actions:
        valid_action_types = ["create_milestone", "create_task", "complete_milestone", "delete_milestone", "update_goal", "create_goal", "checklist", "create_agreement", "suggestions", "set_deadline"]
        
        for i, action in enumerate(actions):
            if not isinstance(action, dict):
                return False, f"actions[{i}] must be object, got {type(action).__name__}"
            
            if "type" not in action:
                return False, f"actions[{i}] missing required field 'type'"
            
            action_type = action["type"]
            if action_type not in valid_action_types:
                return False, f"actions[{i}].type '{action_type}' is invalid. Valid types: {valid_action_types}"
            
            # Validate data for each action type
            data = action.get("data", {})
            
            if action_type == "create_milestone":
                if not data.get("title"):
                    return False, f"actions[{i}] (create_milestone) requires 'data.title'"
            
            elif action_type == "create_goal":
                if not data.get("title"):
                    return False, f"actions[{i}] (create_goal) requires 'data.title'"
            
            elif action_type == "complete_milestone":
                if "milestone_id" not in data:
                    return False, f"actions[{i}] ({action_type}) requires 'data.milestone_id'"
            
            elif action_type == "delete_milestone":
                # Can delete by milestone_id OR by count (last N milestones)
                if "milestone_id" not in data and "count" not in data:
                    return False, f"actions[{i}] ({action_type}) requires either 'data.milestone_id' or 'data.count'"
            
            elif action_type == "checklist":
                if not data.get("title"):
                    return False, f"actions[{i}] (checklist) requires 'data.title'"
                if not data.get("items") or not isinstance(data.get("items"), list):
                    return False, f"actions[{i}] (checklist) requires 'data.items' as array"
                items = data.get("items", [])
                for j, item in enumerate(items):
                    if not isinstance(item, dict):
                        return False, f"actions[{i}].items[{j}] must be object"
                    if "id" not in item:
                        return False, f"actions[{i}].items[{j}] missing 'id'"
                    if "label" not in item:
                        return False, f"actions[{i}].items[{j}] missing 'label'"
                    if "type" not in item:
                        return False, f"actions[{i}].items[{j}] missing 'type'"
                    if item.get("type") not in ["boolean", "number", "text"]:
                        return False, f"actions[{i}].items[{j}].type must be 'boolean', 'number', or 'text'"
            
            elif action_type == "create_agreement":
                if not data.get("description"):
                    return False, f"actions[{i}] (create_agreement) requires 'data.description'"
                if not data.get("deadline"):
                    return False, f"actions[{i}] (create_agreement) requires 'data.deadline'"
            
            elif action_type == "set_deadline":
                if not data.get("milestone_id") and not data.get("milestone_title"):
                    return False, f"actions[{i}] (set_deadline) requires either 'data.milestone_id' or 'data.milestone_title'"
                if not data.get("deadline"):
                    return False, f"actions[{i}] (set_deadline) requires 'data.deadline'"
    
    return True, None


async def execute_actions(db: Session, goal_id: int, actions: List[Dict], user_id: int = None) -> List[str]:
    """Execute actions and return list of results"""
    results = []
    # Track newly created goal ID for subsequent milestones
    current_goal_id = goal_id
    newly_created_goal_id = None
    
    for action in actions:
        action_type = action.get("type")
        data = action.get("data", {})
        
        try:
            if action_type == "create_goal":
                if not user_id:
                    results.append("❌ Не могу создать цель: не указан user_id")
                    continue
                title = data.get("title", "")[:200]
                description = data.get("description", "")[:1000] if data.get("description") else None
                new_goal = schemas.GoalCreate(
                    title=title,
                    description=description
                )
                created = crud.goal.create_goal(db=db, goal=new_goal, user_id=user_id)
                results.append(f"✅ Создана новая цель: {created.title} (ID: {created.id})")
                print(f"✅ Created goal: {created.id} - {created.title}")
                # Use new goal ID for subsequent milestones in this batch
                newly_created_goal_id = created.id
                current_goal_id = created.id
            
            elif action_type == "create_milestone":
                title = data.get("title", "")[:80]
                if not title:
                    results.append("❌ Не могу создать подцель: не указано название")
                    continue
                # Use newly created goal ID if available, otherwise current goal
                target_goal_id = newly_created_goal_id if newly_created_goal_id else goal_id
                if not target_goal_id:
                    results.append(f"❌ Не могу создать подцель: не найден goal_id")
                    continue
                try:
                    new_milestone = schemas.MilestoneCreate(
                        goal_id=target_goal_id,
                        title=title,
                        description=data.get("description", ""),
                        target_date=data.get("target_date"),
                        completed=False
                    )
                    created = crud.milestone.create_milestone(db=db, milestone=new_milestone)
                    db.flush()  # Ensure milestone is saved before continuing
                    results.append(f"✅ Создана подцель: {created.title}")
                    print(f"✅ Created milestone: {created.id} - {created.title} for goal {target_goal_id}")
                except Exception as e:
                    error_msg = f"❌ Ошибка создания подцели '{title}': {str(e)}"
                    results.append(error_msg)
                    print(error_msg)
                    import traceback
                    traceback.print_exc()
            
            elif action_type == "complete_milestone":
                milestone_id = data.get("milestone_id")
                if milestone_id:
                    crud.milestone.update_milestone(db, milestone_id, schemas.MilestoneUpdate(is_completed=True))
                    results.append(f"✅ Подцель #{milestone_id} выполнена")
                    print(f"✅ Completed milestone: {milestone_id}")
            
            elif action_type == "delete_milestone":
                milestone_id = data.get("milestone_id")
                count = data.get("count")
                
                if milestone_id:
                    # Delete specific milestone by ID
                    deleted = crud.milestone.delete_milestone(db, milestone_id)
                    if deleted:
                        results.append(f"🗑 Подцель #{milestone_id} удалена")
                        print(f"🗑 Deleted milestone: {milestone_id}")
                    else:
                        results.append(f"❌ Подцель #{milestone_id} не найдена")
                
                elif count and isinstance(count, int) and count > 0:
                    # Delete last N milestones
                    milestones = crud.milestone.get_milestones(db, goal_id=goal_id, skip=0, limit=1000)
                    # Sort by id descending to get last ones
                    milestones_sorted = sorted(milestones, key=lambda m: m.id, reverse=True)
                    to_delete = milestones_sorted[:count]
                    
                    deleted_count = 0
                    for milestone in to_delete:
                        crud.milestone.delete_milestone(db, milestone.id)
                        deleted_count += 1
                    
                    if deleted_count > 0:
                        results.append(f"🗑 Удалено последних {deleted_count} подцелей")
                        print(f"🗑 Deleted last {deleted_count} milestones")
                    else:
                        results.append(f"❌ Не найдено подцелей для удаления")
                else:
                    results.append(f"❌ Не указан milestone_id или count для удаления")
            
            elif action_type == "update_goal":
                update_data = {}
                if "title" in data:
                    update_data["title"] = data["title"]
                if "description" in data:
                    update_data["description"] = data["description"]
                if update_data:
                    crud.goal.update_goal(db, goal_id, schemas.GoalUpdate(**update_data))
                    results.append(f"✅ Цель обновлена")
                    print(f"✅ Updated goal: {goal_id}")
            
            elif action_type == "create_agreement":
                from datetime import datetime
                description = data.get("description", "")
                deadline_str = data.get("deadline", "")
                
                # Parse deadline (supports various formats)
                deadline = None
                try:
                    # Try ISO format first
                    deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                except:
                    try:
                        # Try common formats
                        for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d", "%d.%m.%Y %H:%M", "%d.%m.%Y"]:
                            try:
                                deadline = datetime.strptime(deadline_str, fmt)
                                break
                            except:
                                continue
                    except:
                        pass
                
                if deadline:
                    agreement = schemas.AgreementCreate(
                        goal_id=goal_id,
                        description=description,
                        deadline=deadline
                    )
                    created = crud.agreement.create_agreement(db, agreement)
                    results.append(f"📝 Договорённость зафиксирована: {description[:50]}... (до {deadline.strftime('%d.%m.%Y %H:%M')})")
                    print(f"📝 Created agreement: {created.id} - {description[:30]}...")
                else:
                    results.append(f"❌ Не удалось распознать дату: {deadline_str}")
            
            elif action_type == "set_deadline":
                from datetime import datetime, date as date_type
                
                milestone_id = data.get("milestone_id")
                milestone_title = data.get("milestone_title")
                deadline_str = data.get("deadline", "")
                
                # Parse deadline
                deadline_date = None
                try:
                    # Try ISO format first
                    parsed = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                    deadline_date = parsed.date()
                except:
                    try:
                        # Try common formats
                        for fmt in ["%Y-%m-%d", "%d.%m.%Y", "%Y-%m-%d %H:%M", "%d.%m.%Y %H:%M"]:
                            try:
                                parsed = datetime.strptime(deadline_str, fmt)
                                deadline_date = parsed.date()
                                break
                            except:
                                continue
                    except:
                        pass
                
                if not deadline_date:
                    results.append(f"❌ Не удалось распознать дату дедлайна: {deadline_str}")
                    continue
                
                # Find milestone by ID or title
                target_milestone = None
                if milestone_id:
                    target_milestone = crud.milestone.get_milestone(db, milestone_id)
                elif milestone_title:
                    # Search by title in current goal's milestones
                    milestones = crud.milestone.get_milestones(db, goal_id=goal_id)
                    for m in milestones:
                        if milestone_title.lower() in m.title.lower():
                            target_milestone = m
                            break
                
                if target_milestone:
                    # Update milestone with deadline
                    crud.milestone.update_milestone(db, target_milestone.id, schemas.MilestoneUpdate(target_date=deadline_date))
                    results.append(f"📅 Дедлайн установлен: «{target_milestone.title}» — до {deadline_date.strftime('%d.%m.%Y')}")
                    print(f"📅 Set deadline for milestone {target_milestone.id}: {deadline_date}")
                else:
                    results.append(f"❌ Подцель не найдена: {milestone_id or milestone_title}")
            
            elif action_type == "create_task":
                from datetime import datetime
                title = data.get("title", "")[:200]
                if not title:
                    results.append("❌ Не могу создать задачу: не указано название")
                    continue
                target_goal_id = newly_created_goal_id if newly_created_goal_id else goal_id
                if not target_goal_id:
                    results.append(f"❌ Не могу создать задачу: не найден goal_id")
                    continue
                
                # Parse due_date if provided
                due_date = None
                due_date_str = data.get("due_date") or data.get("deadline")
                if due_date_str:
                    try:
                        if isinstance(due_date_str, str):
                            # Try ISO format first
                            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                            print(f"📅 Parsed due_date from ISO: {due_date}")
                        elif isinstance(due_date_str, datetime):
                            due_date = due_date_str
                            print(f"📅 Using datetime object: {due_date}")
                    except Exception as e1:
                        print(f"⚠️ Failed to parse ISO format: {e1}")
                        try:
                            for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d", "%d.%m.%Y %H:%M", "%d.%m.%Y"]:
                                try:
                                    due_date = datetime.strptime(str(due_date_str), fmt)
                                    print(f"📅 Parsed due_date from format {fmt}: {due_date}")
                                    break
                                except:
                                    continue
                        except Exception as e2:
                            print(f"⚠️ Failed to parse date: {e2}")
                            pass
                
                try:
                    print(f"🔧 Creating task with data: goal_id={target_goal_id}, title={title}, due_date={due_date}")
                    new_task = schemas.TaskCreate(
                        goal_id=target_goal_id,
                        milestone_id=data.get("milestone_id"),
                        title=title,
                        description=data.get("description", ""),
                        due_date=due_date,
                        priority=data.get("priority", "medium")
                    )
                    print(f"🔧 TaskCreate schema: {new_task.dict()}")
                    created = crud.task.create_task(db=db, task=new_task)
                    db.flush()
                    print(f"✅ Created task: ID={created.id}, title={created.title}, goal_id={created.goal_id}, due_date={created.due_date}")
                    results.append(f"✅ Создана задача: {created.title}")
                except Exception as e:
                    error_msg = f"❌ Ошибка создания задачи '{title}': {str(e)}"
                    results.append(error_msg)
                    print(error_msg)
                    import traceback
                    print("Full traceback:")
                    traceback.print_exc()
        
        except Exception as e:
            error_msg = f"❌ Ошибка выполнения {action_type}: {str(e)}"
            results.append(error_msg)
            print(error_msg)
    
    return results


@router.post("/", response_model=schemas.Chat)
def create_chat(chat: schemas.ChatCreate, db: Session = Depends(get_db)):
    chat_data = chat.dict()
    if not chat_data.get('title'):
        goal = crud.goal.get_goal(db, chat.goal_id)
        chat_data['title'] = goal.title if goal else f"Chat for Goal {chat.goal_id}"
    chat_with_title = schemas.ChatCreate(**chat_data)
    return crud.chat.create_chat(db=db, chat=chat_with_title)


@router.post("/{chat_id}/heartbeat/")
def chat_heartbeat(chat_id: int, db: Session = Depends(get_db)):
    """Register user activity in chat for proactive messaging"""
    from app.services.proactive_service import register_active_chat
    
    chat = crud.chat.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    register_active_chat(chat_id, chat.goal_id)
    return {"status": "ok"}


@router.get("/{chat_id}/new-messages/")
def get_new_messages(chat_id: int, after_id: int = 0, db: Session = Depends(get_db)):
    """Get messages after a specific ID (for polling proactive messages)"""
    from app.models.chat import Message
    
    chat = crud.chat.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.id > after_id
    ).order_by(Message.id.asc()).all()
    
    return [
        {
            "id": m.id,
            "content": m.content,
            "sender": m.sender,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]


@router.get("/debug/trainer-mode/")
def get_trainer_mode_debug(
    trainer_id: Optional[str] = Query(None, description="e.g. strict_male, gentle_female"),
    gender: Optional[str] = Query(None, description="male | female"),
):
    """Debug endpoint: show how a given trainer selection resolves into tone/gender."""
    return _get_trainer_mode_status(trainer_id, gender)


@router.get("/{chat_id}/agreements/")
def get_chat_agreements(chat_id: int, db: Session = Depends(get_db)):
    """Get all agreements for this chat's goal"""
    chat = crud.chat.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    agreements = crud.agreement.get_agreements_by_goal(db, chat.goal_id)
    return [
        {
            "id": a.id,
            "description": a.description,
            "deadline": a.deadline.isoformat() if a.deadline else None,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in agreements
    ]


@router.post("/{chat_id}/generate-greeting/")
async def generate_greeting(chat_id: int, db: Session = Depends(get_db)):
    """Generate AI greeting for a new chat"""
    from app.services.llm_service import llm_service
    from datetime import datetime
    
    chat = crud.chat.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    goal = crud.goal.get_goal(db, chat.goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
    
    # Build context
    now = datetime.now()
    current_date = now.strftime("%d.%m.%Y")
    current_weekday = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"][now.weekday()]
    
    has_plan = len(milestones) > 0
    completed = len([m for m in milestones if m.is_completed])
    
    system_prompt = f"""Ты — персональный коуч. Напиши приветствие для пользователя.

Цель: "{goal.title}"
{"План есть: " + str(len(milestones)) + " задач" if has_plan else "Плана ещё нет"}

Правила:
- Короткое приветствие (1-3 предложения)
- На русском языке
- Упомяни цель пользователя
- {"Спроси о прогрессе" if has_plan else "Предложи создать план или спроси о цели"}
- Используй эмодзи

ОТВЕТ СТРОГО JSON:
{{"message":"текст приветствия"}}"""

    try:
        response = await llm_service.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Поприветствуй меня для цели: {goal.title}"}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        parsed, _ = parse_ai_response(response)
        greeting = None
        
        if parsed and "message" in parsed:
            greeting = parsed["message"]
        
        # Validate greeting - must be in Russian and relevant
        if greeting:
            # Check if it looks valid (contains Cyrillic and goal title or common Russian words)
            has_cyrillic = any('\u0400' <= c <= '\u04FF' for c in greeting)
            is_short_enough = len(greeting) < 500
            no_html = '<' not in greeting and '>' not in greeting
            
            if not (has_cyrillic and is_short_enough and no_html):
                greeting = None
        
        if not greeting:
            # Fallback greetings
            import random
            fallbacks = [
                f"Привет! 👋 Как продвигается цель \"{goal.title}\"?",
                f"Привет! Рад тебя видеть! Расскажи, как дела с \"{goal.title}\"?",
                f"Привет! 🎯 Готов поработать над \"{goal.title}\"?",
                f"Привет! Как настроение? Давай обсудим \"{goal.title}\"!",
            ]
            greeting = random.choice(fallbacks)
        
        # Save greeting as AI message
        from app.models.chat import Message
        ai_message = Message(
            chat_id=chat_id,
            sender="ai",
            content=greeting
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        return {
            "id": ai_message.id,
            "content": greeting,
            "sender": "ai",
            "created_at": ai_message.created_at.isoformat() if ai_message.created_at else None
        }
    except Exception as e:
        print(f"Error generating greeting: {e}")
        # Fallback
        fallback = f"Привет! 👋 Как дела с целью \"{goal.title}\"?"
        from app.models.chat import Message
        ai_message = Message(
            chat_id=chat_id,
            sender="ai",
            content=fallback
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        return {
            "id": ai_message.id,
            "content": fallback,
            "sender": "ai",
            "created_at": ai_message.created_at.isoformat() if ai_message.created_at else None
        }


@router.get("/{chat_id}", response_model=schemas.Chat)
def read_chat(chat_id: int, db: Session = Depends(get_db)):
    db_chat = crud.chat.get_chat(db, chat_id=chat_id)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat


@router.get("/", response_model=List[schemas.Chat])
def read_chats(goal_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.chat.get_chats(db, goal_id=goal_id, skip=skip, limit=limit)


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
async def create_message(
    chat_id: int,
    message: schemas.MessageCreate,
    db: Session = Depends(get_db),
    debug_mode: bool = Query(False, description="Enable debug mode"),
    trainer_id: Optional[str] = Query(None, description="Coach personality, e.g. strict_male, gentle_female"),
    gender: Optional[str] = Query(None, description="male | female (if not encoded in trainer_id)"),
    current_user: Optional[User] = Depends(lambda: None)  # Optional auth
):
    """Create a message and get AI response"""
    try:
        # Save user message
        message_data = message.dict(exclude_unset=True)
        message_data['chat_id'] = chat_id
        message_with_chat_id = schemas.MessageCreate(**message_data)
        user_message = crud.chat.create_message(db=db, message=message_with_chat_id)
        
        # Get AI response for user messages
        if message_with_chat_id.sender == "user":
            from app.services.llm_service import llm_service
            
            # Get context
            chat = crud.chat.get_chat(db, chat_id)
            goal = None
            milestones = []
            
            if chat and chat.goal_id:
                goal = crud.goal.get_goal(db, chat.goal_id)
                milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
            
            if not goal:
                return user_message

            # Persist the user's coach personality on the goal so the background
            # proactive service can match the tone (not just the live chat).
            effective_trainer_id = trainer_id
            if trainer_id or gender:
                tone_sel, gender_sel = _normalize_trainer_selection(trainer_id, gender)
                stored_id = f"{tone_sel}_{gender_sel}"
                effective_trainer_id = stored_id
                if getattr(goal, "coach_trainer_id", None) != stored_id:
                    try:
                        goal.coach_trainer_id = stored_id
                        db.add(goal)
                        db.commit()
                    except Exception as exc:
                        db.rollback()
                        logger.warning("Failed to persist coach_trainer_id: %s", exc)
            elif getattr(goal, "coach_trainer_id", None):
                # No selection in this request — fall back to what the user chose earlier.
                effective_trainer_id = goal.coach_trainer_id

            # Get agreements for context
            agreements = crud.agreement.get_pending_agreements(db, goal_id=chat.goal_id)

            # Build messages for LLM
            chat_history = crud.chat.get_messages(db, chat_id=chat_id, skip=0, limit=20)  # Increased limit
            system_prompt = build_system_prompt(goal, milestones, agreements, effective_trainer_id, gender)
            llm_messages = [{"role": "system", "content": system_prompt}]
            
            # Add chat history (clean HTML markers for LLM)
            for msg in chat_history:
                role = "assistant" if msg.sender == "ai" else "user"
                # Clean HTML markers that are for frontend only
                clean_content = msg.content
                # Remove frontend-only markers
                clean_content = re.sub(r'<!--PENDING_ACTIONS:.*?-->', '', clean_content, flags=re.DOTALL)
                clean_content = re.sub(r'<!--CHECKLIST:.*?-->', '', clean_content, flags=re.DOTALL)
                clean_content = re.sub(r'<!--SUGGESTIONS:.*?-->', '', clean_content, flags=re.DOTALL)
                clean_content = clean_content.strip()
                
                # Only add non-empty messages
                if clean_content:
                    llm_messages.append({"role": role, "content": clean_content})
            
            # Add current user message
            llm_messages.append({"role": "user", "content": message_with_chat_id.content})
            
            # DEBUG: Collect all debug information
            debug_log = []
            if debug_mode:
                debug_log.append("=" * 50)
                debug_log.append("🔍 DEBUG MODE ENABLED")
                debug_log.append("=" * 50)
                debug_log.append("")
                debug_log.append("📋 SYSTEM PROMPT:")
                debug_log.append("-" * 30)
                debug_log.append(system_prompt[:2000] + "..." if len(system_prompt) > 2000 else system_prompt)
                debug_log.append("-" * 30)
                debug_log.append("")
                debug_log.append(f"📝 CHAT HISTORY ({len(llm_messages) - 1} messages):")
                for i, m in enumerate(llm_messages[1:], 1):
                    content_preview = m['content'][:100] + "..." if len(m['content']) > 100 else m['content']
                    debug_log.append(f"  [{i}] {m['role']}: {content_preview}")
                debug_log.append("")
            
            # Try to get valid JSON response (with retry)
            max_retries = 2
            last_error = None
            ai_content = ""
            raw_response = ""
            success = False
            
            for attempt in range(max_retries + 1):
                try:
                    print(f"📤 LLM request attempt {attempt + 1}/{max_retries + 1}")
                    if debug_mode:
                        debug_log.append(f"🔄 ATTEMPT {attempt + 1}/{max_retries + 1}")
                        debug_log.append("-" * 30)
                    
                    # Add retry context if needed
                    if attempt > 0 and last_error:
                        retry_msg = f"""⚠️ ОШИБКА! Твой ответ не соответствовал JSON формату.

Ошибка: {last_error}

Ответь ТОЛЬКО валидным JSON:
{{"message": "твой текст здесь", "actions": []}}

БЕЗ текста до или после JSON!"""
                        llm_messages.append({"role": "user", "content": retry_msg})
                        print(f"🔄 Retry due to: {last_error}")
                        if debug_mode:
                            debug_log.append(f"📤 RETRY REQUEST:")
                            debug_log.append(retry_msg)
                            debug_log.append("")
                    
                    # Get AI response
                    # Use lower temperature for more consistent JSON output
                    response = await llm_service.chat_completion(
                        messages=llm_messages,
                        temperature=0.1,  # Very low for consistent format
                        max_tokens=2000
                    )
                    raw_response = str(response) if response else ""
                    print(f"📥 Raw response ({len(raw_response)} chars): {raw_response[:200]}...")
                    
                    if debug_mode:
                        debug_log.append(f"📥 RAW RESPONSE FROM MODEL ({len(raw_response)} chars):")
                        debug_log.append("─" * 60)
                        debug_log.append(raw_response)
                        debug_log.append("─" * 60)
                        debug_log.append("")
                    
                    # Parse response
                    parsed, parse_error = parse_ai_response(raw_response)
                    
                    if parse_error:
                        last_error = parse_error
                        print(f"❌ Parse error: {parse_error}")
                        if debug_mode:
                            debug_log.append(f"❌ PARSE ERROR: {parse_error}")
                            debug_log.append("")
                            debug_log.append("📋 RAW RESPONSE THAT FAILED TO PARSE:")
                            debug_log.append("─" * 60)
                            debug_log.append(raw_response)
                            debug_log.append("─" * 60)
                            debug_log.append("")
                            debug_log.append("📋 RAW RESPONSE THAT FAILED TO PARSE:")
                            debug_log.append("─" * 60)
                            debug_log.append(raw_response)
                            debug_log.append("─" * 60)
                            debug_log.append("")
                        
                        # If parsing failed but we have raw_response, try to use it as fallback on last attempt
                        if raw_response and attempt == max_retries:
                            # Last attempt - try to create a valid response from raw text
                            print("⚠️ Last attempt, trying to create fallback response from raw text")
                            if debug_mode:
                                debug_log.append("⚠️ LAST ATTEMPT: Creating fallback from raw response")
                            try:
                                # Create a minimal valid response
                                fallback_parsed = {
                                    "message": raw_response[:500] if len(raw_response) > 500 else raw_response,
                                    "actions": []
                                }
                                parsed = fallback_parsed
                                parse_error = None
                                print("✅ Created fallback response")
                                if debug_mode:
                                    debug_log.append("✅ Created fallback parsed response")
                            except Exception as fallback_err:
                                print(f"❌ Fallback creation failed: {fallback_err}")
                                if debug_mode:
                                    debug_log.append(f"❌ Fallback creation failed: {fallback_err}")
                                continue
                        else:
                            continue
                    
                    if debug_mode:
                        debug_log.append(f"✅ PARSED JSON:")
                        debug_log.append(json.dumps(parsed, ensure_ascii=False, indent=2))
                        debug_log.append("")
                    
                    # Ensure parsed is a dict
                    if not isinstance(parsed, dict):
                        last_error = f"Parsed response is not a dict, got {type(parsed).__name__}"
                        print(f"❌ {last_error}")
                        if debug_mode:
                            debug_log.append(f"❌ TYPE ERROR: {last_error}")
                            debug_log.append("")
                        continue
                    
                    # Validate response
                    is_valid, validation_error = validate_response(parsed)
                    
                    if not is_valid:
                        last_error = validation_error
                        print(f"❌ Validation error: {validation_error}")
                        if debug_mode:
                            debug_log.append(f"❌ VALIDATION ERROR: {validation_error}")
                            debug_log.append("")
                            debug_log.append("📋 PARSED OBJECT THAT FAILED VALIDATION:")
                            debug_log.append("─" * 60)
                            debug_log.append(json.dumps(parsed, ensure_ascii=False, indent=2))
                            debug_log.append("─" * 60)
                            debug_log.append("")
                        continue
                    
                    # Success! Extract message and execute actions
                    print(f"✅ Valid JSON response received!")
                    if debug_mode:
                        debug_log.append("✅ VALIDATION PASSED!")
                        debug_log.append("")
                    
                    # Normalize the response
                    try:
                        normalized = normalize_response(parsed)
                        ai_content = normalized.get("message", "")
                        
                        # Ensure ai_content is a string and not empty
                        if not isinstance(ai_content, str):
                            ai_content = str(ai_content) if ai_content else ""
                        
                        # If message is still empty after normalization, use fallback
                        if not ai_content or not ai_content.strip():
                            # Try to get from parsed directly
                            ai_content = parsed.get("message", "")
                            if not ai_content or not isinstance(ai_content, str):
                                # Last resort: use raw response
                                ai_content = raw_response[:500] if raw_response else "Извините, произошла ошибка при обработке ответа."
                            if debug_mode:
                                debug_log.append("⚠️ Message was empty after normalization, using fallback")
                        
                        actions = normalized.get("actions", [])
                    except Exception as norm_err:
                        print(f"Error normalizing response: {norm_err}")
                        import traceback
                        traceback.print_exc()
                        if debug_mode:
                            debug_log.append(f"❌ NORMALIZATION ERROR: {norm_err}")
                            debug_log.append(traceback.format_exc())
                            debug_log.append("")
                        # Fallback: use parsed directly or raw response
                        ai_content = parsed.get("message", "") if isinstance(parsed, dict) else ""
                        if not ai_content or not isinstance(ai_content, str):
                            # Try raw response
                            if raw_response:
                                ai_content = raw_response[:500]
                            else:
                                ai_content = "Извините, произошла ошибка при обработке ответа."
                        if not isinstance(ai_content, str):
                            ai_content = str(ai_content) if ai_content else "Извините, произошла ошибка."
                        actions = parsed.get("actions", []) if isinstance(parsed, dict) else []
                    
                    # Handle special actions separately
                    checklist_actions = [a for a in actions if a.get("type") == "checklist"]
                    create_goal_actions = [a for a in actions if a.get("type") == "create_goal"]
                    suggestions_actions = [a for a in actions if a.get("type") == "suggestions"]
                    other_actions = [a for a in actions if a.get("type") not in ["checklist", "create_goal", "suggestions"]]
                    
                    # Process checklist actions - embed directly in message
                    if checklist_actions:
                        for checklist_action in checklist_actions:
                            checklist_data = checklist_action.get("data", {})
                            # Add checklist marker for frontend parsing
                            ai_content += f"\n\n<!--CHECKLIST:{json.dumps(checklist_data, ensure_ascii=False)}-->"
                    
                    # Process suggestions - embed directly in message
                    if suggestions_actions:
                        for suggestion_action in suggestions_actions:
                            items = suggestion_action.get("data", {}).get("items", [])
                            if items:
                                ai_content += f"\n\n<!--SUGGESTIONS:{json.dumps(items, ensure_ascii=False)}-->"
                    
                    # Execute create_goal actions immediately (no confirmation needed)
                    # Get user_id from goal (should always exist if goal exists)
                    user_id_for_goal = None
                    if goal and goal.user_id:
                        user_id_for_goal = goal.user_id
                    
                    if create_goal_actions and user_id_for_goal:
                        goal_results = await execute_actions(db, chat.goal_id, create_goal_actions, user_id=user_id_for_goal)
                        if goal_results:
                            ai_content += "\n\n" + "\n".join(goal_results)
                    elif create_goal_actions:
                        ai_content += "\n\n❌ Не могу создать цель: не найден user_id. Пожалуйста, убедитесь, что вы авторизованы."
                    
                    # DON'T execute other actions automatically - prepare for confirmation
                    # This includes: create_milestone, complete_milestone, delete_milestone, update_goal
                    if other_actions and chat.goal_id:
                        print(f"📋 Prepared {len(other_actions)} actions for confirmation")
                        if debug_mode:
                            debug_log.append(f"📋 PENDING ACTIONS ({len(other_actions)}):")
                            for a in other_actions:
                                debug_log.append(f"  - {a.get('type')}: {json.dumps(a.get('data', {}), ensure_ascii=False)}")
                            debug_log.append("")
                        
                        # Format actions for display
                        action_descriptions = []
                        for a in other_actions:
                            action_type = a.get("type", "")
                            data = a.get("data", {})
                            if action_type == "create_milestone":
                                action_descriptions.append(f"📌 Создать подцель: {data.get('title', '')}")
                            elif action_type == "complete_milestone":
                                action_descriptions.append(f"✅ Выполнить подцель #{data.get('milestone_id')}")
                            elif action_type == "delete_milestone":
                                if data.get('milestone_id'):
                                    action_descriptions.append(f"🗑 Удалить подцель #{data.get('milestone_id')}")
                                elif data.get('count'):
                                    action_descriptions.append(f"🗑 Удалить последние {data.get('count')} подцелей")
                            elif action_type == "create_agreement":
                                desc = data.get('description', '')[:50]
                                deadline = data.get('deadline', '')
                                action_descriptions.append(f"📝 Зафиксировать: {desc}... (до {deadline})")
                            elif action_type == "create_goal":
                                action_descriptions.append(f"🎯 Создать цель: {data.get('title', '')}")
                        
                        if action_descriptions:
                            ai_content += "\n\n**Предлагаемые действия:**\n" + "\n".join(action_descriptions)
                        
                        # Add pending actions marker (JSON at the end for frontend parsing)
                        ai_content += f"\n\n<!--PENDING_ACTIONS:{json.dumps(other_actions, ensure_ascii=False)}-->"
                    
                    success = True
                    break  # Success, exit retry loop
                    
                except Exception as e:
                    last_error = str(e)
                    print(f"❌ LLM error on attempt {attempt + 1}: {e}")
                    if debug_mode:
                        debug_log.append(f"❌ EXCEPTION: {str(e)}")
                        debug_log.append("")
            
            # If all retries failed, use fallback
            if not ai_content:
                # Try to extract any text from raw_response as fallback
                if raw_response:
                    # Try to find any message-like content
                    # Look for text that might be a message
                    message_match = re.search(r'"message"\s*:\s*"([^"]+)"', raw_response)
                    if message_match:
                        ai_content = message_match.group(1)
                    else:
                        # Use raw response but clean it up
                        ai_content = raw_response.strip()
                        # Remove markdown code blocks if present
                        ai_content = re.sub(r'^```json\s*', '', ai_content, flags=re.IGNORECASE)
                        ai_content = re.sub(r'^```\s*', '', ai_content)
                        ai_content = re.sub(r'```\s*$', '', ai_content)
                        ai_content = ai_content.strip()
                        # Limit length
                        if len(ai_content) > 500:
                            ai_content = ai_content[:500] + "..."
                else:
                    ai_content = "Извините, произошла ошибка при обработке ответа. Попробуйте ещё раз."
                
                if debug_mode:
                    debug_log.append("=" * 60)
                    debug_log.append(f"⚠️ ALL {max_retries + 1} ATTEMPTS FAILED")
                    debug_log.append(f"Last error: {last_error}")
                    debug_log.append("")
                    debug_log.append("📋 FINAL RAW RESPONSE (used as fallback):")
                    debug_log.append("─" * 60)
                    debug_log.append(raw_response if raw_response else "(empty)")
                    debug_log.append("─" * 60)
                    debug_log.append("")
                    debug_log.append("Using fallback response above")
                    debug_log.append("=" * 60)
            
            # Add full debug log to response
            if debug_mode and debug_log:
                ai_content += "\n\n" + "━" * 40
                ai_content += "\n🔧 DEBUG LOG:\n"
                ai_content += "━" * 40 + "\n"
                ai_content += "\n".join(debug_log)
            
            # Save AI response
            ai_message = schemas.MessageCreate(
                content=ai_content,
                sender="ai",
                chat_id=chat_id
            )
            crud.chat.create_message(db=db, message=ai_message)
        
        return user_message
        
    except HTTPException:
        raise
    except KeyError as e:
        # Handle KeyError specifically (e.g., missing 'message' field)
        import traceback
        error_trace = traceback.format_exc()
        print(f"KeyError in create_message: {e}\n{error_trace}")
        error_msg = f"Missing required field in response: {str(e)}. The AI response may be malformed."
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in create_message: {e}\n{error_trace}")
        
        # Provide more helpful error message
        error_detail = str(e)
        if "'message'" in error_detail or '"message"' in error_detail:
            error_detail = f"JSON parsing error: {error_detail}. The AI response may be missing the 'message' field or have invalid format."
        
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/{chat_id}/messages/", response_model=List[schemas.Message])
def read_messages(chat_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.chat.get_messages(db, chat_id=chat_id, skip=skip, limit=limit)


@router.post("/{chat_id}/confirm-actions/")
async def confirm_actions(
    chat_id: int,
    actions: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user = None  # Will be set via dependency if auth is available
):
    """Execute confirmed actions from user and get AI follow-up"""
    try:
        # Get chat to find goal_id
        chat = crud.chat.get_chat(db, chat_id)
        if not chat or not chat.goal_id:
            raise HTTPException(status_code=404, detail="Chat or goal not found")
        
        # Get goal to find user_id
        goal = crud.goal.get_goal(db, chat.goal_id)
        # Try to get user_id from goal first, then from current_user
        user_id = None
        if goal and goal.user_id:
            user_id = goal.user_id
        elif current_user:
            user_id = current_user.id
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Execute the confirmed actions
        print(f"🔧 Executing {len(actions)} confirmed actions for goal {chat.goal_id}")
        print(f"🔧 Actions: {actions}")
        results = await execute_actions(db, chat.goal_id, actions, user_id=user_id)
        print(f"🔧 Execution results: {results}")
        
        # Commit changes to database
        db.commit()
        
        # Get current milestone count
        milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
        print(f"🔧 Found {len(milestones)} milestones after execution")
        completed_count = len([m for m in milestones if m.is_completed])
        pending_count = len([m for m in milestones if not m.is_completed])
        
        # Generate proactive AI follow-up instead of static message
        from app.services.llm_service import llm_service
        
        # Build context for AI
        milestones_list = "\n".join([f"- {m.title}" + (" ✅" if m.is_completed else "") for m in milestones])
        actions_done = "\n".join(results) if results else "действия выполнены"
        
        follow_up_prompt = f"""Ты — коуч как сова из Duolingo. Пользователь только что подтвердил создание плана.

ВЫПОЛНЕНО: {actions_done}

ТЕКУЩИЕ ПОДЦЕЛИ ({pending_count} из {len(milestones)} осталось):
{milestones_list}

ТВОЯ ЗАДАЧА: Проактивно продолжи диалог! НЕ давай стандартных инструкций!

Вместо этого:
1. Похвали за создание плана (коротко!)
2. СРАЗУ предложи установить дедлайны для первых шагов
3. Спроси, когда пользователь планирует начать
4. Предложи договориться о проверке прогресса

Будь как Duolingo — настойчив и конкретен! Не жди, пока пользователь сам спросит.

Ответь JSON: {{"message":"твой текст","actions":[{{"type":"suggestions","data":{{"items":["вариант1","вариант2","вариант3"]}}}}]}}"""

        try:
            ai_response = await llm_service.chat_completion([
                {"role": "system", "content": follow_up_prompt}
            ], temperature=0.7)
            
            # Parse AI response
            parsed, error = parse_ai_response(ai_response)
            if parsed and "message" in parsed:
                result_text = parsed["message"]
                
                # Add suggestions if present
                if "actions" in parsed:
                    for action in parsed["actions"]:
                        if action.get("type") == "suggestions":
                            items = action.get("data", {}).get("items", [])
                            if items:
                                result_text += f"\n\n<!--SUGGESTIONS:{json.dumps(items, ensure_ascii=False)}-->"
            else:
                # Fallback if AI response is invalid
                result_text = f"✅ Отлично! План создан — {len(milestones)} шагов.\n\nТеперь давай установим сроки! Когда планируешь начать первый шаг: «{milestones[0].title if milestones else 'первый шаг'}»?\n\n<!--SUGGESTIONS:{json.dumps(['Начну сегодня', 'Начну завтра', 'На этой неделе'], ensure_ascii=False)}-->"
        except Exception as e:
            print(f"Error generating follow-up: {e}")
            result_text = f"✅ План создан — {len(milestones)} шагов!\n\nКогда начнём? Давай установим дедлайн для первого шага!\n\n<!--SUGGESTIONS:{json.dumps(['Начну сегодня', 'Завтра', 'Установим дедлайны'], ensure_ascii=False)}-->"
        
        ai_message = schemas.MessageCreate(
            content=result_text,
            sender="ai",
            chat_id=chat_id
        )
        crud.chat.create_message(db=db, message=ai_message)
        
        return {"status": "success", "results": results, "milestones_count": len(milestones)}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error confirming actions: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chat_id}/cancel-actions/")
async def cancel_actions(
    chat_id: int,
    db: Session = Depends(get_db)
):
    """Cancel pending actions and suggest alternatives"""
    try:
        # Get chat context
        chat = crud.chat.get_chat(db, chat_id)
        milestones_count = 0
        if chat and chat.goal_id:
            milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
            milestones_count = len(milestones)
        
        # Create helpful cancellation message with suggestions
        cancel_text = "Окей, отменяю! 🦉 Что не так? Расскажи, и я предложу другой вариант."
        suggestions = ["Хочу другой план", "Изменить формулировки", "Начать заново"]
        cancel_text += f"\n\n<!--SUGGESTIONS:{json.dumps(suggestions, ensure_ascii=False)}-->"
        
        ai_message = schemas.MessageCreate(
            content=cancel_text,
            sender="ai",
            chat_id=chat_id
        )
        crud.chat.create_message(db=db, message=ai_message)
        
        return {"status": "cancelled"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chat_id}/submit-checklist/")
async def submit_checklist(
    chat_id: int,
    checklist_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Submit checklist answers and get AI feedback"""
    try:
        # Get chat context
        chat = crud.chat.get_chat(db, chat_id)
        if not chat or not chat.goal_id:
            raise HTTPException(status_code=404, detail="Chat or goal not found")
        
        goal = crud.goal.get_goal(db, chat.goal_id)
        milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
        agreements = crud.agreement.get_pending_agreements(db, goal_id=chat.goal_id)
        
        answers = checklist_data.get("answers", {})
        checklist_title = checklist_data.get("title", "Проверка")
        checklist_items = checklist_data.get("items", [])
        
        # Format answers with labels for better context
        answer_details = []
        completed_count = 0
        total_items = len(checklist_items) if checklist_items else len(answers)
        
        if checklist_items:
            for item in checklist_items:
                item_id = str(item.get("id", ""))
                label = item.get("label", f"Пункт {item_id}")
                item_type = item.get("type", "text")
                unit = item.get("unit", "")
                
                value = answers.get(item_id, answers.get(int(item_id) if item_id.isdigit() else item_id))
                
                if item_type == "boolean":
                    status = "✅ Да" if value else "❌ Нет"
                    if value:
                        completed_count += 1
                    answer_details.append(f"• {label}: {status}")
                elif item_type == "number":
                    if value and value > 0:
                        completed_count += 1
                    answer_details.append(f"• {label}: {value} {unit}")
                else:
                    if value and str(value).strip():
                        completed_count += 1
                    answer_details.append(f"• {label}: {value}")
        else:
            # Fallback if no items info
            for key, value in answers.items():
                if isinstance(value, bool):
                    status = "✅ Да" if value else "❌ Нет"
                    if value:
                        completed_count += 1
                    answer_details.append(f"• Пункт {key}: {status}")
                elif isinstance(value, (int, float)):
                    if value > 0:
                        completed_count += 1
                    answer_details.append(f"• Пункт {key}: {value}")
                else:
                    if value and str(value).strip():
                        completed_count += 1
                    answer_details.append(f"• Пункт {key}: {value}")
        
        # Calculate completion rate
        completion_rate = (completed_count / total_items * 100) if total_items > 0 else 0
        
        # Get AI response based on answers
        from app.services.llm_service import llm_service
        
        # Build rich context for AI coach
        milestones_info = ""
        if milestones:
            pending = [m for m in milestones if not m.is_completed]
            completed = [m for m in milestones if m.is_completed]
            milestones_info = f"План: {len(completed)}/{len(milestones)} выполнено"
            if pending:
                milestones_info += f". Текущие задачи: {', '.join([m.title for m in pending[:3]])}"
        
        system_prompt = f"""Ты — персональный коуч и друг. Пользователь только что заполнил чеклист для цели "{goal.title}".

РЕЗУЛЬТАТЫ ЧЕКЛИСТА "{checklist_title}":
{chr(10).join(answer_details)}

Выполнено: {completed_count}/{total_items} ({completion_rate:.0f}%)
{milestones_info}

ТВОЯ ЗАДАЧА КАК КОУЧА:
1. Проанализируй результаты — что получилось хорошо, что можно улучшить
2. Дай эмоциональную обратную связь — порадуйся успехам или поддержи
3. Задай уточняющий вопрос — как ощущения? что было сложно? что помогло?
4. Если уместно — предложи конкретный следующий шаг

ТОНАЛЬНОСТЬ:
- Будь живым, эмоциональным
- Обращайся на "ты"
- Используй эмодзи уместно
- Не будь формальным — ты друг, не робот

ФОРМАТ ОТВЕТА — JSON:
{{"message": "твой текст", "actions": []}}

Язык: РУССКИЙ."""
        
        # Get chat history for context
        chat_history = crud.chat.get_messages(db, chat_id=chat_id, skip=0, limit=5)
        llm_messages = [{"role": "system", "content": system_prompt}]
        
        for msg in chat_history[-3:]:  # Last 3 messages for context
            role = "assistant" if msg.sender == "ai" else "user"
            llm_messages.append({"role": role, "content": msg.content})
        
        # Add a "user message" representing the checklist submission
        llm_messages.append({"role": "user", "content": f"[Заполнил чеклист: {', '.join(answer_details)}]"})
        
        # Get AI response
        ai_response = await llm_service.chat_completion(
            messages=llm_messages,
            temperature=0.8,  # Higher temperature for more natural responses
            max_tokens=1000
        )
        
        # Parse AI response
        parsed, _ = parse_ai_response(ai_response)
        if parsed and "message" in parsed:
            ai_message_text = parsed["message"]
        else:
            # Fallback - generate a warm response
            if completion_rate >= 80:
                ai_message_text = f"Отлично! 🎉 {completed_count} из {total_items} — это супер результат! Расскажи, как ощущения? Что было легче всего?"
            elif completion_rate >= 50:
                ai_message_text = f"Хороший прогресс! 💪 {completed_count} из {total_items} выполнено. Что помешало сделать остальное? Давай разберёмся вместе."
            else:
                ai_message_text = f"Спасибо за честность! 🤝 Не всегда получается всё сразу. Расскажи, что было сложнее всего? Может, нужно пересмотреть план?"
        
        # Don't add raw data - just the coach's response
        full_message = ai_message_text
        
        # Save AI response
        ai_message = schemas.MessageCreate(
            content=full_message,
            sender="ai",
            chat_id=chat_id
        )
        crud.chat.create_message(db=db, message=ai_message)
        
        return {"status": "success", "message": "Checklist submitted"}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error submitting checklist: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
