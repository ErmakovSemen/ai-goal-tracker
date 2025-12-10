#!/usr/bin/env python3
"""
Тестовый скрипт для проверки DeepSeek API
Можно запустить на Render через SSH или локально с переменными окружения
"""
import asyncio
import os
import sys

# Добавляем путь к приложению
sys.path.insert(0, os.path.dirname(__file__))

async def test_deepseek():
    from app.services.llm_service import llm_service
    from app.core.config import settings
    
    print("=" * 60)
    print("🔍 Проверка конфигурации DeepSeek")
    print("=" * 60)
    print()
    
    # Проверка конфигурации
    print("📋 Конфигурация:")
    print(f"  LLM_PROVIDER: {settings.LLM_PROVIDER}")
    print(f"  LLM_MODEL: {settings.LLM_MODEL}")
    print(f"  LLM_API_KEY: {'✅ установлен' if settings.LLM_API_KEY else '❌ НЕ установлен'}")
    if settings.LLM_API_KEY:
        key_preview = settings.LLM_API_KEY[:10] + "..." + settings.LLM_API_KEY[-4:] if len(settings.LLM_API_KEY) > 14 else "***"
        print(f"  API Key preview: {key_preview}")
    print()
    
    # Проверка провайдера
    if llm_service.provider != 'deepseek':
        print(f"⚠️  ВНИМАНИЕ: Провайдер не DeepSeek, а '{llm_service.provider}'")
        print("   Установи LLM_PROVIDER=deepseek для использования DeepSeek")
        print()
        return False
    
    if not llm_service.api_key:
        print("❌ ОШИБКА: LLM_API_KEY не установлен!")
        print("   Установи LLM_API_KEY в переменных окружения")
        print()
        return False
    
    print("✅ Конфигурация правильная!")
    print()
    
    # Тестовый запрос
    print("=" * 60)
    print("📤 Тестовый запрос к DeepSeek API")
    print("=" * 60)
    print()
    
    try:
        messages = [
            {
                'role': 'system',
                'content': 'Ты помощник. Отвечай кратко на русском языке.'
            },
            {
                'role': 'user',
                'content': 'Привет! Скажи "Тест успешен" если ты работаешь правильно.'
            }
        ]
        
        print("Отправляю запрос...")
        response = await llm_service.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=100
        )
        
        print()
        print("✅ УСПЕХ! Ответ получен:")
        print("-" * 60)
        print(response)
        print("-" * 60)
        print()
        print(f"📊 Длина ответа: {len(response)} символов")
        print()
        
        # Тест JSON формата
        print("=" * 60)
        print("📤 Тест JSON формата (структурированный ответ)")
        print("=" * 60)
        print()
        
        json_messages = [
            {
                'role': 'system',
                'content': 'Ты помощник. Отвечай ТОЛЬКО в формате JSON: {"message": "твой ответ", "actions": []}'
            },
            {
                'role': 'user',
                'content': 'Скажи "Тест JSON успешен" в формате JSON'
            }
        ]
        
        print("Отправляю запрос с JSON форматом...")
        json_response = await llm_service.chat_completion(
            messages=json_messages,
            temperature=0.1,
            max_tokens=200
        )
        
        print()
        print("✅ Ответ получен:")
        print("-" * 60)
        print(json_response)
        print("-" * 60)
        print()
        
        # Попытка парсинга JSON
        import json
        try:
            parsed = json.loads(json_response.strip())
            print("✅ JSON успешно распарсен!")
            print(f"   message: {parsed.get('message', 'N/A')[:50]}...")
            print(f"   actions: {len(parsed.get('actions', []))} элементов")
        except json.JSONDecodeError as e:
            print(f"⚠️  JSON не распарсился: {e}")
            print("   (Это нормально, если модель не всегда возвращает валидный JSON)")
        
        print()
        print("=" * 60)
        print("✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print()
        print("❌ ОШИБКА при запросе к DeepSeek:")
        print("-" * 60)
        print(str(e))
        print("-" * 60)
        print()
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_deepseek())
    sys.exit(0 if success else 1)

