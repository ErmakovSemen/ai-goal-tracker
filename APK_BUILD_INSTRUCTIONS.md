# Инструкция по созданию APK из React-приложения

## Обзор

Этот документ описывает процесс создания APK из вашего React-приложения с помощью Capacitor и SourceCraft CI/CD.

## Шаги для настройки

1. Переименуйте файл `.sourcecraft/ci-with-apk.yaml` в `.sourcecraft/ci.yaml`:
   ```bash
   mv .sourcecraft/ci-with-apk.yaml .sourcecraft/ci.yaml
   ```

2. Зафиксируйте изменения:
   ```bash
   git add .sourcecraft/ci.yaml
   git commit -m "Добавлен workflow для создания APK"
   git push origin main
   ```

## Как это работает

Новый workflow `build-apk` выполняет следующие шаги:

1. Собирает ваше React-приложение
2. Устанавливает Capacitor и необходимые зависимости
3. Создает нативный Android-проект с помощью Capacitor
4. Собирает APK с помощью Android Gradle
5. Публикует APK в RuStore через готовый кубик SourceCraft

## Конфигурация

В workflow используются следующие параметры:

- `PACKAGE_NAME`: Уникальный идентификатор вашего приложения (com.yourcompany.aigoaltracker)
- `VERSION`: Версия приложения (1.0.0)
- `STORE`: Целевой стор для публикации (RU_STORE)

## Получение APK

После выполнения workflow APK будет доступен как артефакт в кубике `build-apk`. Вы можете скачать его и использовать для тестирования на устройствах.

## Публикация в сторы

Для публикации в сторы необходимо настроить соответствующие API ключи в настройках репозитория:

1. Перейдите в Settings → Secrets
2. Добавьте следующие секреты:
   - `ruStoreKeyId` - ID API ключа RuStore
   - `ruStoreKey` - API ключ RuStore

## Тестирование

После первой сборки APK будет доступен для скачивания. Вы можете установить его на Android-устройство для тестирования.

## Дополнительная настройка

Для более детальной настройки приложения вы можете:

1. Настроить иконку приложения в `android/app/src/main/res/`
2. Добавить разрешения в `android/app/src/main/AndroidManifest.xml`
3. Настроить подпись APK для релизных сборок