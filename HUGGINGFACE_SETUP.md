# Настройка Hugging Face (проблемы и решения)

## Текущая проблема

Hugging Face изменил свой API:
- Старый endpoint `api-inference.huggingface.co` возвращает 410 Gone
- Новый endpoint `router.huggingface.co` требует другой формат

## Решения

### Вариант 1: Принять условия для Mistral (рекомендуется)

1. Перейдите на https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2
2. Нажмите "Accept" для принятия условий использования
3. Используйте модель `mistralai/Mistral-7B-Instruct-v0.2`

### Вариант 2: Использовать Together AI (проще)

Together AI проще в использовании и дает $25 бесплатных кредитов:
1. Зарегистрируйтесь на https://together.ai
2. Получите API ключ
3. Обновите `.env`:
```
LLM_PROVIDER=together
LLM_API_KEY=your_together_key
LLM_MODEL=meta-llama/Llama-3-8b-chat-hf
```

### Вариант 3: Использовать другую модель Hugging Face

Попробуйте модели, которые не требуют принятия условий:
- `microsoft/Phi-3-mini-4k-instruct` (но API endpoint устарел)
- `google/flan-t5-xxl` (но это не chat модель)

## Рекомендация

**Используйте Together AI** - это самый простой и надежный вариант для MVP.

