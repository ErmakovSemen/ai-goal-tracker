# 🎯 Настройка Cursor для Python 3.14

## 📍 Как указать путь к Python интерпретатору

### Способ 1: Через настройки Cursor (рекомендуется)

1. **Откройте настройки:**
   - Нажмите `Ctrl + ,` (Windows/Linux) или `Cmd + ,` (Mac)
   - Или: `File` → `Preferences` → `Settings`

2. **Найдите настройку Python:**
   - В поиске введите: `python.defaultInterpreterPath`
   - Или: `python.pythonPath` (старая версия)

3. **Укажите путь к Python 3.14:**
   ```
   C:\Python314\python.exe
   ```
   Или если используете через py launcher:
   ```
   py -3.14
   ```

### Способ 2: Через файл настроек проекта

Создайте файл `.vscode/settings.json` в корне проекта:

```json
{
    "python.defaultInterpreterPath": "C:\\Python314\\python.exe",
    "python.analysis.extraPaths": [
        "${workspaceFolder}/backend",
        "C:\\Python314\\Lib\\site-packages"
    ],
    "python.autoComplete.extraPaths": [
        "${workspaceFolder}/backend",
        "C:\\Python314\\Lib\\site-packages"
    ],
    "python.analysis.autoImportCompletions": true,
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": false,
    "python.linting.flake8Enabled": true
}
```

### Способ 3: Выбор интерпретатора через Command Palette

1. Нажмите `Ctrl + Shift + P` (Windows/Linux) или `Cmd + Shift + P` (Mac)
2. Введите: `Python: Select Interpreter`
3. Выберите Python 3.14 из списка или укажите путь вручную

---

## 📦 Как указать путь к установленным пакетам

### Вариант 1: Через PYTHONPATH в settings.json

```json
{
    "python.defaultInterpreterPath": "C:\\Python314\\python.exe",
    "python.analysis.extraPaths": [
        "${workspaceFolder}/backend",
        "C:\\Python314\\Lib\\site-packages",
        "C:\\Python314\\Scripts"
    ],
    "python.envFile": "${workspaceFolder}/.env",
    "terminal.integrated.env.windows": {
        "PYTHONPATH": "${workspaceFolder}/backend;C:\\Python314\\Lib\\site-packages"
    }
}
```

### Вариант 2: Через переменную окружения PYTHONPATH

**Windows PowerShell:**
```powershell
$env:PYTHONPATH = "D:\Python_Project\ai-goal-tracker\ai-goal-tracker\backend;C:\Python314\Lib\site-packages"
```

**Windows CMD:**
```cmd
set PYTHONPATH=D:\Python_Project\ai-goal-tracker\ai-goal-tracker\backend;C:\Python314\Lib\site-packages
```

**Добавить в системные переменные (постоянно):**
1. Откройте `Система` → `Дополнительные параметры системы`
2. Нажмите `Переменные среды`
3. Создайте новую переменную `PYTHONPATH` со значением:
   ```
   D:\Python_Project\ai-goal-tracker\ai-goal-tracker\backend;C:\Python314\Lib\site-packages
   ```

### Вариант 3: Использовать виртуальное окружение (рекомендуется)

```json
{
    "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/Scripts/python.exe",
    "python.analysis.extraPaths": [
        "${workspaceFolder}/backend",
        "${workspaceFolder}/backend/venv/Lib/site-packages"
    ]
}
```

---

## 🔍 Проверка установленных пакетов

Чтобы проверить, где установлены пакеты Python 3.14:

```bash
python -m site
```

Или:
```bash
python -c "import site; print(site.getsitepackages())"
```

---

## 🛠️ Рекомендуемые расширения для Python в Cursor

1. **Python** (Microsoft) - основное расширение
2. **Pylance** - языковой сервер для Python
3. **Python Debugger** - отладка
4. **autopep8** или **Black Formatter** - форматирование кода

Установка через Command Palette (`Ctrl + Shift + P`):
- `Extensions: Install Extensions`
- Найдите и установите нужные расширения

---

## ⚙️ Полный пример settings.json для проекта

Создайте файл `.vscode/settings.json`:

```json
{
    // Python интерпретатор
    "python.defaultInterpreterPath": "C:\\Python314\\python.exe",
    
    // Пути для анализа кода
    "python.analysis.extraPaths": [
        "${workspaceFolder}/backend",
        "${workspaceFolder}/backend/app",
        "C:\\Python314\\Lib\\site-packages"
    ],
    
    // Автодополнение
    "python.autoComplete.extraPaths": [
        "${workspaceFolder}/backend",
        "${workspaceFolder}/backend/app"
    ],
    
    // Анализ кода
    "python.analysis.autoImportCompletions": true,
    "python.analysis.typeCheckingMode": "basic",
    "python.analysis.diagnosticMode": "workspace",
    
    // Линтинг
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": false,
    "python.linting.flake8Enabled": true,
    "python.linting.flake8Args": [
        "--max-line-length=127",
        "--ignore=E501"
    ],
    
    // Форматирование
    "python.formatting.provider": "autopep8",
    "[python]": {
        "editor.defaultFormatter": "ms-python.autopep8",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.organizeImports": true
        }
    },
    
    // Терминал
    "terminal.integrated.env.windows": {
        "PYTHONPATH": "${workspaceFolder}/backend;${workspaceFolder}/backend/app"
    },
    
    // Файлы для игнорирования
    "files.exclude": {
        "**/__pycache__": true,
        "**/*.pyc": true,
        "**/venv": false
    },
    
    // Поиск
    "search.exclude": {
        "**/venv": true,
        "**/__pycache__": true,
        "**/*.pyc": true
    }
}
```

---

## 🐍 Проверка работы

После настройки проверьте:

1. **Откройте Python файл** (например, `backend/app/main.py`)
2. **Нажмите `Ctrl + Shift + P`** → `Python: Select Interpreter`
3. **Убедитесь, что выбран Python 3.14**
4. **Попробуйте автодополнение** - должно работать с установленными пакетами

---

## 📝 Примечание о Python 3.14

⚠️ **Важно:** На момент написания Python 3.14 еще не выпущен (последняя стабильная версия - 3.12). 

Если вы имели в виду:
- **Python 3.12** - используйте путь к Python 3.12
- **Python 3.11** - используйте путь к Python 3.11
- **Python 3.10** - используйте путь к Python 3.10

Или если у вас установлено несколько версий через `py` launcher:
```json
{
    "python.defaultInterpreterPath": "py -3.12"
}
```
