# Настройка GitHub Models (бесплатно, без карты!)

## Что такое GitHub Models?

GitHub Models - это новая платформа от GitHub для работы с AI моделями. **Не требует кредитную карту!**

## Быстрый старт

### 1. Получите GitHub Personal Access Token

1. Перейдите на https://github.com/settings/tokens
2. Нажмите "Generate new token" → "Generate new token (classic)"
3. Дайте токену имя (например, "AI Goal Tracker")
4. Выберите scope: `models` (если доступно) или `repo` (для доступа к моделям)
5. Нажмите "Generate token"
6. **Скопируйте токен сразу** (он показывается только один раз!)

### 2. Настройка в проекте

Откройте файл `backend/.env` и добавьте ваш токен:

```env
LLM_PROVIDER=github
LLM_API_KEY=your_github_token_here
LLM_MODEL=meta-llama/llama-3.1-8b-instruct
```

### 3. Перезапустите бэкенд

После добавления токена перезапустите бэкенд.

## Доступные модели

GitHub Models поддерживает:
- `meta-llama/llama-3.1-8b-instruct`
- `meta-llama/llama-3.1-70b-instruct`
- `mistralai/mistral-large-2`
- `microsoft/phi-3`
- И другие

## Альтернатива: OpenRouter

Если GitHub Models не работает, используйте OpenRouter:

1. Зарегистрируйтесь на https://openrouter.ai (через GitHub)
2. Получите API ключ
3. Обновите `.env`:
```env
LLM_PROVIDER=openrouter
LLM_API_KEY=your_openrouter_key
LLM_MODEL=meta-llama/llama-3.1-8b-instruct
```

## Преимущества GitHub Models

- ✅ Бесплатно
- ✅ Не требует кредитную карту
- ✅ Интеграция с GitHub
- ✅ Простой API
- ✅ Много моделей на выбор

## Тестирование

После настройки протестируйте:

```bash
cd backend
./test_api.sh chat
```

Бот должен отвечать через GitHub Models!

