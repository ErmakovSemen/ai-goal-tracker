# Настройка Ollama (локальная модель)

## Что такое Ollama?

Ollama - это инструмент для запуска больших языковых моделей локально на вашем компьютере. **Полностью бесплатно, без API ключей, без интернета!**

## Установка Ollama

### macOS

```bash
# Установка через Homebrew
brew install ollama

# Или скачайте с официального сайта
# https://ollama.ai/download
```

### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows

Скачайте установщик с https://ollama.ai/download

## Запуск Ollama

```bash
# Запустите Ollama сервер
ollama serve
```

Оставьте этот терминал открытым - Ollama будет работать в фоне.

## Установка модели

В новом терминале:

```bash
# Установите модель (рекомендуется для начала)
ollama pull llama3.2

# Или другие модели:
# ollama pull mistral        # Mistral 7B
# ollama pull qwen2.5        # Qwen 2.5
# ollama pull gemma2         # Google Gemma 2
# ollama pull phi3           # Microsoft Phi-3
```

**Примечание:** Первая загрузка модели может занять время (несколько ГБ).

## Настройка проекта

Файл `backend/.env` уже настроен:

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434
```

## Тестирование

1. Убедитесь, что Ollama запущен: `ollama serve`
2. Убедитесь, что модель установлена: `ollama list`
3. Перезапустите бэкенд
4. Протестируйте:

```bash
cd backend
./test_api.sh chat
```

## Переключение на облачный провайдер

Когда появится доступ к карте, просто измените `backend/.env`:

```env
# Для Together AI
LLM_PROVIDER=together
LLM_API_KEY=your_together_key
LLM_MODEL=meta-llama/Llama-3-8b-chat-hf

# Или для OpenRouter
LLM_PROVIDER=openrouter
LLM_API_KEY=your_openrouter_key
LLM_MODEL=meta-llama/llama-3.1-8b-instruct
```

**Никаких изменений в коде не требуется!** Просто перезапустите бэкенд.

## Доступные модели Ollama

- `llama3.2` - Llama 3.2 (рекомендуется, ~2GB)
- `mistral` - Mistral 7B (~4GB)
- `qwen2.5` - Qwen 2.5 (~2GB)
- `gemma2` - Google Gemma 2 (~2GB)
- `phi3` - Microsoft Phi-3 (~2GB)
- `llama3.1` - Llama 3.1 8B (~4.7GB)
- `llama3.1:70b` - Llama 3.1 70B (требует много RAM)

## Преимущества Ollama

- ✅ Полностью бесплатно
- ✅ Работает офлайн
- ✅ Нет лимитов на запросы
- ✅ Приватность (данные не уходят в облако)
- ✅ Быстро (на локальной машине)
- ✅ Легко переключиться на облако позже

## Требования

- Минимум 8GB RAM (для llama3.2)
- 16GB+ RAM рекомендуется для больших моделей
- Свободное место на диске (2-5GB для модели)

## Устранение проблем

### Ollama не запускается

```bash
# Проверьте, что Ollama установлен
ollama --version

# Запустите вручную
ollama serve
```

### Модель не найдена

```bash
# Проверьте установленные модели
ollama list

# Установите модель
ollama pull llama3.2
```

### Ошибка подключения

Убедитесь, что:
1. Ollama запущен (`ollama serve`)
2. Порт 11434 не занят
3. В `.env` указан правильный `OLLAMA_URL`

