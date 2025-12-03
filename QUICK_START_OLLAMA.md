# Быстрый старт с Ollama

## Что сделано

✅ Код для Ollama добавлен в проект  
✅ Конфигурация настроена на Ollama  
✅ Легкое переключение на облачные провайдеры предусмотрено  

## Установка Ollama (macOS)

```bash
# Вариант 1: Через Homebrew (рекомендуется)
brew install ollama

# Вариант 2: Используйте скрипт
./INSTALL_OLLAMA.sh

# Вариант 3: Скачайте с сайта
# https://ollama.ai/download
```

## Запуск Ollama

```bash
# Запустите Ollama сервер (оставьте терминал открытым)
ollama serve
```

## Установка модели

В **новом терминале**:

```bash
# Установите модель (рекомендуется для начала)
ollama pull llama3.2

# Это займет несколько минут и ~2GB места
```

## Проверка

```bash
# Проверьте, что Ollama работает
curl http://localhost:11434/api/tags

# Проверьте установленные модели
ollama list
```

## Запуск приложения

1. Убедитесь, что Ollama запущен: `ollama serve`
2. Убедитесь, что модель установлена: `ollama list`
3. Перезапустите бэкенд (если еще не перезапущен)
4. Протестируйте:

```bash
cd backend
./test_api.sh chat
```

## Переключение на облачный провайдер (когда появится карта)

Просто измените `backend/.env`:

```env
# Для Together AI
LLM_PROVIDER=together
LLM_API_KEY=your_together_key
LLM_MODEL=meta-llama/Llama-3-8b-chat-hf
```

**Никаких изменений в коде не требуется!** Просто перезапустите бэкенд.

## Текущая конфигурация

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434
```

## Проблемы?

- **Ollama не запускается**: Проверьте установку `ollama --version`
- **Модель не найдена**: Установите модель `ollama pull llama3.2`
- **Ошибка подключения**: Убедитесь, что `ollama serve` запущен

Подробная документация: `OLLAMA_SETUP.md`

