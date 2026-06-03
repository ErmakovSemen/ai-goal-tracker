"""
Coach voice — personality-aware proactive message banks.

Proactive reminders used to be a single cute "owl" tone for everyone, ignoring
the user's chosen trainer (strict / normal / gentle). This module provides
tone-specific template banks so a strict user gets pressure, a gentle user gets
warmth, and a normal user gets the balanced owl.

Pure templates (no LLM dependency) → deterministic and testable offline.
"""
import random
from typing import Optional

VALID_TONES = {"strict", "normal", "gentle"}
DEFAULT_TONE = "normal"


def resolve_tone(coach_trainer_id: Optional[str]) -> str:
    """Map a stored trainer id ('strict_male', 'gentle', ...) to a tone."""
    if isinstance(coach_trainer_id, str) and coach_trainer_id.strip():
        head = coach_trainer_id.strip().lower().split("_")[0]
        if head in VALID_TONES:
            return head
    return DEFAULT_TONE


# scenario -> tone -> list of templates.
# Placeholders: {desc} agreement text, {hours} hours left, {days} days missed, {goal} goal title.
VOICE = {
    "remind": {
        "strict": [
            "⛓️ Договорённость: {desc}\nСрок — {hours} ч. Без оправданий. Делай и отчитайся.",
            "🎯 {desc} — осталось {hours} ч.\nДисциплина решает. Где результат?",
        ],
        "normal": [
            "🦉 Эй! Не забыл? Ты обещал: {desc}\n\nОсталось {hours} ч. Как прогресс?",
            "⏰ Тик-так! {desc} — осталось {hours} ч.\n\nУспеваешь?",
        ],
        "gentle": [
            "🌿 Лёгкое напоминание: {desc}.\nЕщё {hours} ч. Ты справишься, я рядом 💛",
            "✨ Не торопись, но помни про {desc} — впереди {hours} ч.\nКак ты, всё ок?",
        ],
    },
    "remind_urgent": {
        "strict": [
            "🚨 {desc} — {hours} ч. до срока.\nХватит тянуть. Соберись и закрывай пункт.",
            "⛔ Время на исходе: {hours} ч. {desc}\nЭто проверка на дисциплину. Не сливай.",
        ],
        "normal": [
            "🦉 Внимание! {desc}\n\nОсталось всего {hours} ч.! Ты точно успеешь?",
            "⏰ {hours} ч. до дедлайна! {desc}\n\nВсё под контролем?",
        ],
        "gentle": [
            "💛 Остался финишный отрезок: {hours} ч. на {desc}.\nСделай сколько сможешь — это уже победа.",
            "🌸 Уже близко! {desc} — {hours} ч.\nЯ верю в тебя, давай мягко доведём до конца.",
        ],
    },
    "miss1": {
        "strict": [
            "📉 Вчера — ноль активности.\nДисциплина начинается там, где не хочется. Возвращайся в режим. Сегодня.",
        ],
        "normal": [
            "🦉 Эй, ты где? Я скучаю!\n\nВчера ты не заходил. Всё в порядке?",
        ],
        "gentle": [
            "🌿 Вчера тебя не было — и это нормально.\nДавай тихонько вернёмся к цели? Я рядом 💛",
        ],
    },
    "miss2": {
        "strict": [
            "📉 Два дня простоя подряд.\nТак цели не берут. Хватит откатываться — сегодня делаешь шаг. Обязательно.",
        ],
        "normal": [
            "🦉 Эй-эй! Ты пропустил уже 2 дня подряд!\n\nЯ начинаю волноваться... Всё ок?",
        ],
        "gentle": [
            "💛 Два дня паузы — бывает у каждого.\nНе вини себя. Один маленький шаг сегодня — и мы снова в потоке.",
        ],
    },
    "miss3": {
        "strict": [
            "🛑 Три дня. Это уже не пауза, а сдача позиций.\nСоберись. Возвращаемся к режиму прямо сейчас, без обсуждений.",
        ],
        "normal": [
            "🦉 ЭЙ! Ты пропустил 3 дня подряд! 😤\n\nМы же договаривались! Возвращайся!",
        ],
        "gentle": [
            "🌸 Три дня вдали от цели. Я не сужу — я волнуюсь за тебя.\nДавай вернёмся вместе, по-маленьку. Ты не один.",
        ],
    },
    "miss_week": {
        "strict": [
            "🛑 {days} дней простоя. Цель стоит на месте, а время уходит.\nЛибо сейчас пересобираем режим, либо она так и останется мечтой. Решай.",
        ],
        "normal": [
            "🦉 Ты пропустил уже {days} дней. Я очень скучаю...\n\nДавай вернёмся? Я верю, что у тебя всё получится!",
        ],
        "gentle": [
            "💛 {days} дней — это много, но дверь всегда открыта.\nНачать заново не стыдно. Сделаем первый маленький шаг сегодня?",
        ],
    },
    "morning": {
        "strict": [
            "🌅 Подъём. Новый день — новый результат.\nЦель: {goal}. Первый шаг — сейчас, пока не передумал.",
        ],
        "normal": [
            "🌅 Доброе утро! Готов к новому дню?\n\nОтличный день поработать над целью: {goal}",
        ],
        "gentle": [
            "☀️ Доброе утро 💛 Пусть день будет добрым.\nКогда будешь готов — маленький шаг к цели «{goal}».",
        ],
    },
    "morning_deadline": {
        "strict": [
            "🌅 Подъём. Сегодня срок: {desc}. Осталось {hours} ч.\nНикаких «потом». Закрывай.",
        ],
        "normal": [
            "🌅 Доброе утро! Сегодня дедлайн по «{desc}»!\n\nОсталось {hours} ч. Успеешь?",
        ],
        "gentle": [
            "☀️ Доброе утро 💛 Сегодня срок по «{desc}», ещё {hours} ч.\nСпокойно, по шагам — у тебя получится.",
        ],
    },
    "checklist_intro": {
        "strict": [
            "🎯 Срок. Отчёт по факту: {desc}.\nБез приукрашиваний — что сделано?",
        ],
        "normal": [
            "🦉 Та-дам! Время проверки!\n\nТы обещал: {desc}\n\nНу что, справился? Давай честно!",
        ],
        "gentle": [
            "🌿 Мягкая сверка по «{desc}».\nЧто получилось — то и хорошо. Расскажи честно, без давления 💛",
        ],
    },
    "missed_agreement": {
        "strict": [
            "📉 Срок по «{desc}» прошёл. Ответа нет.\nЭто и есть цена недисциплины. Признаём и пересобираем план. Что дальше?",
        ],
        "normal": [
            "🦉 Хм... Дедлайн по «{desc}» прошёл, а ответа я не получил...\n\nЧто случилось? 😔",
        ],
        "gentle": [
            "💛 Срок по «{desc}» прошёл — и это не конец света.\nБывает. Давай аккуратно вернёмся и попробуем снова?",
        ],
    },
}


def pick(scenario: str, tone: Optional[str], **ctx) -> str:
    """Pick a tone-appropriate template for a scenario and fill placeholders."""
    t = tone if tone in VALID_TONES else DEFAULT_TONE
    bank = VOICE.get(scenario, {})
    variants = bank.get(t) or bank.get(DEFAULT_TONE) or [""]
    template = random.choice(variants)
    try:
        return template.format(**ctx)
    except (KeyError, IndexError):
        return template
