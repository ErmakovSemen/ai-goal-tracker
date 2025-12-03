# Промпты и формат ответов бота

## Где находятся промпты

### 1. Основной промпт (используется в чатах) 
**Файл:** `backend/app/api/chats.py` (строки 77-86)

```python
system_msg = f"You are helping the user with their goal: '{goal.title}'"
if goal.description:
    system_msg += f"\nDescription: {goal.description}"
```

**Текущий промпт:** Очень простой, только название и описание цели.

---

### 2. Расширенный промпт (для AI endpoint)
**Файл:** `backend/app/api/ai.py` (строки 63-99)

```python
def _build_system_prompt(goal_id: int = None, context: dict = None, db: Session = None) -> str:
    prompt = """You are an AI assistant for goal tracking. You help users:
1. Create and define goals
2. Create plans with milestones
3. Track progress
4. Provide motivation and advice

You can understand user requests and help them manage their goals. Be helpful, friendly, and encouraging.

When user wants to:
- Create a goal: ask for title and description
- Create milestones: ask for specific steps
- Update progress: acknowledge and update milestones
- Get advice: provide helpful suggestions

Always be conversational and supportive."""
```

**Примечание:** Этот промпт более детальный, но **не используется** в основном чате! Он только для `/api/ai/chat` endpoint.

---

## Формат ответов

### Текущий формат
Бот отвечает **просто текстом** (строка). Нет структурированного формата.

**Пример ответа:**
```
"Great! Let's create a plan for your goal. What milestones would you like to set?"
```

### Парсинг действий
**Файл:** `backend/app/api/ai.py` (строки 101-114)

```python
def _parse_ai_response(response: str, goal_id: int = None, db: Session = None) -> tuple:
    """Parse AI response to detect actions"""
    response_lower = response.lower()
    
    # Detect action keywords (simple approach)
    if "create goal" in response_lower or "new goal" in response_lower:
        return "suggest_create_goal", {}
    elif "milestone" in response_lower and ("add" in response_lower or "create" in response_lower):
        return "suggest_create_milestone", {}
    
    return None, None
```

**Проблема:** Парсинг очень простой, основан на ключевых словах. Не используется в основном чате.

---

## Где обрабатываются действия

### Фронтенд
**Файл:** `frontend/src/pages/CreateGoal.tsx` (строки 166-233)

Обрабатывает действия типа `create_subgoal` с кнопками "Подтвердить" / "Отменить".

**Пример:**
```typescript
if (action === 'create_subgoal' && data?.title) {
  // Create sub-goal
}
```

---

## Рекомендации по улучшению

### 1. Улучшить основной промпт в `chats.py`

Текущий промпт слишком простой. Можно добавить:

```python
system_msg = f"""You are an AI assistant helping the user achieve their goal: '{goal.title}'

Goal description: {goal.description if goal.description else 'No description provided'}

Your role:
- Help break down the goal into actionable steps
- Suggest milestones and sub-goals
- Provide motivation and encouragement
- Answer questions about the goal
- When user mentions a milestone, suggest creating a sub-goal with buttons "Confirm" and "Cancel"

Be friendly, supportive, and conversational. Always respond in the same language as the user."""
```

### 2. Добавить структурированный формат ответов

Можно использовать JSON для структурированных ответов:

```json
{
  "message": "Text response",
  "actions": [
    {
      "type": "create_subgoal",
      "label": "Подтвердить",
      "data": {"title": "Milestone name"}
    }
  ]
}
```

### 3. Использовать расширенный промпт в основном чате

Сейчас используется простой промпт из `chats.py`, но можно использовать более детальный из `ai.py`.

---

## Текущая архитектура

```
User sends message
    ↓
chats.py:create_message()
    ↓
Simple system prompt (goal title + description)
    ↓
LLM Service (groq/together/etc)
    ↓
Plain text response
    ↓
Saved to database
    ↓
Frontend polls and displays
```

**Проблема:** Нет структурированных ответов, нет автоматических действий, простой промпт.

