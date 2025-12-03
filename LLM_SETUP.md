# Настройка LLM для AI Goal Tracker

## Рекомендуемые провайдеры для MVP

### 1. Groq (Рекомендуется) ⭐
**Почему:** Самый быстрый, бесплатный tier, простой API

**Регистрация:**
1. Перейдите на https://console.groq.com
2. Зарегистрируйтесь (бесплатно)
3. Создайте API ключ

**Бесплатный лимит:**
- 14,400 запросов в день
- Очень быстрая скорость (до 300 токенов/сек)
- Модели: Llama 3.1 8B, Mixtral 8x7B

**Настройка:**
```bash
export LLM_PROVIDER=groq
export LLM_API_KEY=your_groq_api_key_here
```

### 2. Hugging Face Inference API
**Почему:** Много бесплатных моделей, хорошее качество

**Регистрация:**
1. Перейдите на https://huggingface.co
2. Создайте аккаунт
3. Создайте Access Token в настройках

**Бесплатный лимит:**
- Зависит от модели
- Ограничения по скорости

**Настройка:**
```bash
export LLM_PROVIDER=huggingface
export LLM_API_KEY=your_hf_token_here
```

### 3. Together AI
**Почему:** $25 бесплатных кредитов, много моделей

**Регистрация:**
1. Перейдите на https://together.ai
2. Зарегистрируйтесь
3. Получите $25 бесплатных кредитов

**Настройка:**
```bash
export LLM_PROVIDER=together
export LLM_API_KEY=your_together_api_key_here
```

### 4. OpenAI (если есть кредиты)
**Настройка:**
```bash
export LLM_PROVIDER=openai
export LLM_API_KEY=your_openai_api_key_here
```

## Быстрый старт с Groq

1. Зарегистрируйтесь на https://console.groq.com
2. Создайте API ключ
3. Добавьте в `.env` файл:
```
LLM_PROVIDER=groq
LLM_API_KEY=gsk_your_key_here
```

4. Перезапустите бэкенд

## Тестирование

После настройки API ключа, LLM будет автоматически использоваться в чатах для:
- Создания целей
- Создания планов с milestones
- Ответов на вопросы пользователя
- Мотивации и советы

