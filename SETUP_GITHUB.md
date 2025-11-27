# Команды для настройки GitHub репозитория

## Важно перед началом

1. **Имя репозитория на GitHub**: По умолчанию будет использовано `ai-goal-tracker`. Если хотите другое имя, замените `ai-goal-tracker` в командах ниже.

2. **GitHub CLI**: Если `gh` не установлен, сначала установите его:
   - macOS: `brew install gh`
   - Linux: следуйте инструкциям на https://cli.github.com/
   - Windows: `winget install GitHub.cli` или скачайте с сайта

## Шаг 1: Установка и настройка GitHub CLI (если не установлен)

```bash
# Установка GitHub CLI на macOS через Homebrew
brew install gh

# Авторизация в GitHub (откроется браузер для входа)
gh auth login
```

## Шаг 2: Добавление всех изменений в git

```bash
# Перейти в корень проекта (если еще не там)
cd /Users/semyonemakov/AI_goals/ai-goal-tracker

# Добавить все новые и измененные файлы
git add .

# Проверить, что будет закоммичено
git status

# Создать коммит со всеми изменениями
git commit -m "Setup CI/CD: Add GitHub Actions workflows, Dockerfiles, and deployment configs"
```

## Шаг 3: Создание репозитория на GitHub и привязка

### Вариант A: Используя GitHub CLI (рекомендуется)

```bash
# Создать приватный репозиторий на GitHub и привязать его
# Замените YOUR_USERNAME на ваш GitHub username
gh repo create ai-goal-tracker --public --source=. --remote=github --push

# Если репозиторий должен быть приватным, используйте:
# gh repo create ai-goal-tracker --private --source=. --remote=github --push
```

**Примечание**: Команда `gh repo create` с флагом `--source=.` автоматически:
- Создаст репозиторий на GitHub
- Добавит remote с именем `github`
- Запушит текущую ветку

### Вариант B: Вручную (если GitHub CLI не работает)

```bash
# 1. Создайте репозиторий на GitHub через веб-интерфейс:
#    https://github.com/new
#    Название: ai-goal-tracker
#    Не добавляйте README, .gitignore или лицензию (они уже есть)

# 2. Добавьте GitHub remote (замените YOUR_USERNAME на ваш GitHub username)
git remote add github https://github.com/YOUR_USERNAME/ai-goal-tracker.git

# 3. Запушьте код в GitHub
git push -u github main
```

### Вариант C: Заменить существующий remote (если хотите использовать только GitHub)

```bash
# Удалить текущий remote (SourceCraft)
git remote remove origin

# Добавить GitHub как origin
gh repo create ai-goal-tracker --public --source=. --remote=origin --push

# Или вручную:
# git remote add origin https://github.com/YOUR_USERNAME/ai-goal-tracker.git
# git push -u origin main
```

## Шаг 4: Проверка

```bash
# Проверить, что remote добавлен
git remote -v

# Проверить статус
git status
```

## Шаг 5: Запуск workflow вручную через GitHub

После того как код запушен в GitHub:

1. Откройте ваш репозиторий на GitHub: `https://github.com/YOUR_USERNAME/ai-goal-tracker`

2. Перейдите во вкладку **Actions** (в верхнем меню)

3. В левом сайдбаре найдите workflow **"Build Only (No Deploy)"**

4. Нажмите на workflow **"Build Only (No Deploy)"**

5. В правом верхнем углу нажмите кнопку **"Run workflow"**

6. Выберите ветку **`main`** в выпадающем списке

7. Нажмите зеленую кнопку **"Run workflow"**

8. Workflow начнет выполняться. Вы можете наблюдать за прогрессом в реальном времени

9. После завершения:
   - Зеленый значок ✓ означает успешную сборку
   - Красный значок ✗ означает ошибку (нажмите на job, чтобы увидеть логи)
   - Внизу страницы будут доступны артефакты для скачивания:
     - `android-apk` - собранный APK файл
     - `frontend-build` - собранный frontend
     - `backend-build-logs` - логи сборки backend (если есть)

## Альтернативный способ: Запуск через GitHub CLI

```bash
# Запустить workflow вручную через CLI
gh workflow run "Build Only (No Deploy).yml" --ref main

# Посмотреть статус запусков
gh run list --workflow="Build Only (No Deploy).yml"

# Посмотреть последний запуск
gh run view --web
```

## Устранение проблем

### Если `gh auth login` не работает:
- Убедитесь, что GitHub CLI установлен: `gh --version`
- Попробуйте: `gh auth login --web`

### Если репозиторий уже существует на GitHub:
- Используйте другое имя или удалите существующий репозиторий
- Или просто добавьте remote: `git remote add github https://github.com/YOUR_USERNAME/ai-goal-tracker.git`

### Если нужно изменить имя репозитория:
- Замените `ai-goal-tracker` на желаемое имя во всех командах выше

