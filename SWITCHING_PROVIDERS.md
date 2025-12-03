# Переключение между провайдерами LLM

## Текущая конфигурация: Ollama (локально)

Сейчас используется Ollama для локальной работы без API ключей.

## Как переключиться на облачный провайдер

Просто измените файл `backend/.env` - **никаких изменений в коде не требуется!**

### Вариант 1: Together AI (рекомендуется для облака)

```env
LLM_PROVIDER=together
LLM_API_KEY=your_together_api_key
LLM_MODEL=meta-llama/Llama-3-8b-chat-hf
```

**Регистрация:** https://together.ai  
**Преимущества:** $25 бесплатных кредитов, много моделей

### Вариант 2: OpenRouter

```env
LLM_PROVIDER=openrouter
LLM_API_KEY=your_openrouter_key
LLM_MODEL=meta-llama/llama-3.1-8b-instruct
```

**Регистрация:** https://openrouter.ai  
**Преимущества:** Много моделей, бесплатный tier

### Вариант 3: Groq

```env
LLM_PROVIDER=groq
LLM_API_KEY=your_groq_key
LLM_MODEL=llama-3.1-8b-instant
```

**Регистрация:** https://console.groq.com  
**Преимущества:** Очень быстрый, бесплатный tier

### Вариант 4: OpenAI

```env
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_key
LLM_MODEL=gpt-3.5-turbo
```

**Регистрация:** https://platform.openai.com  
**Преимущества:** Лучшее качество, но платно

## После изменения .env

1. Сохраните файл `.env`
2. Перезапустите бэкенд:
   ```bash
   cd backend
   # Остановите текущий процесс (Ctrl+C)
   source venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. Готово! Бот будет использовать новый провайдер

## Текущая конфигурация (Ollama)

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434
```

## Поддерживаемые провайдеры

Код поддерживает все эти провайдеры из коробки:
- ✅ `ollama` - локальный (текущий)
- ✅ `together` - облачный
- ✅ `openrouter` - облачный
- ✅ `groq` - облачный
- ✅ `openai` - облачный
- ✅ `huggingface` - облачный
- ✅ `github` - облачный (экспериментально)

## Проверка работы

После переключения протестируйте:

```bash
cd backend
./test_api.sh chat
```

Бот должен отвечать через выбранный провайдер!

