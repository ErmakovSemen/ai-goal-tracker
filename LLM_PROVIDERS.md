# Доступные LLM провайдеры и модели

## Поддерживаемые провайдеры

### 1. Groq (по умолчанию)
**Модели:**
- `llama-3.1-8b-instant` (быстрая, по умолчанию)
- `llama-3.1-70b-versatile` (более мощная)
- `mixtral-8x7b-32768` (хорошее качество)

**Настройка в `.env`:**
```
LLM_PROVIDER=groq
LLM_API_KEY=your_groq_key
LLM_MODEL=llama-3.1-8b-instant
```

---

### 2. Together AI (рекомендуется как альтернатива)
**Модели:**
- `meta-llama/Llama-3-8b-chat-hf` (по умолчанию)
- `meta-llama/Llama-3-70b-chat-hf` (более мощная)
- `mistralai/Mixtral-8x7B-Instruct-v0.1`
- `Qwen/Qwen2.5-7B-Instruct`

**Преимущества:**
- $25 бесплатных кредитов при регистрации
- Много моделей на выбор
- Хорошее качество ответов

**Настройка в `.env`:**
```
LLM_PROVIDER=together
LLM_API_KEY=your_together_key
LLM_MODEL=meta-llama/Llama-3-8b-chat-hf
```

**Регистрация:** https://together.ai

---

### 3. Hugging Face Inference API
**Модели:**
- `mistralai/Mistral-7B-Instruct-v0.2` (по умолчанию)
- `meta-llama/Llama-2-7b-chat-hf`
- `google/flan-t5-xxl`

**Преимущества:**
- Бесплатный tier
- Много моделей
- Простая регистрация

**Настройка в `.env`:**
```
LLM_PROVIDER=huggingface
LLM_API_KEY=your_hf_token
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

**Регистрация:** https://huggingface.co → Settings → Access Tokens

---

### 4. OpenAI
**Модели:**
- `gpt-3.5-turbo` (по умолчанию, дешевле)
- `gpt-4` (лучшее качество, дороже)
- `gpt-4-turbo`

**Настройка в `.env`:**
```
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_key
LLM_MODEL=gpt-3.5-turbo
```

---

## Как поменять провайдера

1. Откройте `backend/.env`
2. Измените `LLM_PROVIDER` на нужный
3. Добавьте соответствующий `LLM_API_KEY`
4. При необходимости измените `LLM_MODEL`
5. Перезапустите бэкенд

## Примеры конфигураций

### Together AI (рекомендуется)
```env
LLM_PROVIDER=together
LLM_API_KEY=your_together_api_key_here
LLM_MODEL=meta-llama/Llama-3-8b-chat-hf
```

### Hugging Face
```env
LLM_PROVIDER=huggingface
LLM_API_KEY=your_hf_token_here
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

### OpenAI
```env
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_key_here
LLM_MODEL=gpt-3.5-turbo
```

