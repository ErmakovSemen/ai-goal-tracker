# Бесплатные варианты LLM без карты

## 1. OpenRouter (Рекомендуется) ⭐

**Преимущества:**
- ✅ Не требует карту для бесплатного tier
- ✅ Доступ к множеству моделей (включая бесплатные)
- ✅ Простой API
- ✅ Хорошая документация

**Регистрация:**
1. Перейдите на https://openrouter.ai
2. Зарегистрируйтесь через GitHub/Google
3. Получите API ключ в настройках
4. **Не требует карту для бесплатного использования!**

**Бесплатные модели:**
- `meta-llama/llama-3.1-8b-instruct` (рекомендуется)
- `google/gemma-7b-it`
- `mistralai/mistral-7b-instruct`
- `qwen/qwen-2.5-7b-instruct`

**Настройка:**
```env
LLM_PROVIDER=openrouter
LLM_API_KEY=your_openrouter_key
LLM_MODEL=meta-llama/llama-3.1-8b-instruct
```

---

## 2. Hugging Face (исправленный API)

У вас уже есть токен! Попробуем исправить код для работы с новым API.

**Проблема:** Старый Inference API отключен, нужно использовать новый формат.

**Решение:** Используем модели, которые работают через Text Generation Inference (TGI).

**Модели, которые могут работать:**
- `google/flan-t5-base` (но это не chat модель)
- Модели через Hugging Face Spaces (требуют другой подход)

**Настройка:**
```env
LLM_PROVIDER=huggingface
LLM_API_KEY=your_huggingface_token_here
LLM_MODEL=google/flan-t5-base
```

---

## 3. Groq (если получится зарегистрироваться)

**Преимущества:**
- ✅ Бесплатный tier (14,400 запросов/день)
- ✅ Очень быстрый
- ✅ Не требует карту

**Проблема:** Могут быть проблемы со входом/регистрацией.

**Настройка:**
```env
LLM_PROVIDER=groq
LLM_API_KEY=your_groq_key
LLM_MODEL=llama-3.1-8b-instant
```

---

## Рекомендация

**Используйте OpenRouter** - это самый простой и надежный вариант без карты:
1. Регистрация через GitHub (без карты)
2. Много бесплатных моделей
3. Простой API
4. Хорошая документация

## Быстрый старт с OpenRouter

1. Зарегистрируйтесь на https://openrouter.ai
2. Получите API ключ
3. Обновите `backend/.env`:
```env
LLM_PROVIDER=openrouter
LLM_API_KEY=your_key_here
LLM_MODEL=meta-llama/llama-3.1-8b-instruct
```
4. Перезапустите бэкенд

