SolvePointEdits — Изменение концепции тренеров (итог)

Контекст:
После обсуждения UX и масштабирования мы упростили архитектуру тренеров.
Ранее пол рассматривался как отдельная сущность (trainer_genders), теперь для MVP принимаем более практичную модель:
каждый тренер хранится как готовый профиль с уже заданным полом.
Это уменьшает сложность:
- меньше связей в БД и меньше точек рассинхронизации,
- в UI нет отдельного переключателя пола,
- карточка тренера сразу отражает конкретную персону (имя + стиль + визуал).

Почему меняем подход:
1) Для мобильного интерфейса выбор через готовые карточки проще и быстрее.
2) Имя должно соответствовать полу; это неудобно при разделении тренера и пола.
3) Количество тренеров в MVP небольшое, поэтому сверхнормализация не обязательна.
4) Мы оставляем запас на пост-MVP через дополнительные поля и версионирование.

---

1) Что изменилось относительно предыдущей схемы

Было:
- trainer_profiles (стиль/поведение)
- trainer_genders (формы речи, prompt_hint)
- trainer_assets (визуал по trainer + gender)

Стало (MVP):
- Один профиль тренера уже включает:
  - стиль,
  - пол,
  - имя,
  - интенсивность,
  - текстовые правила,
  - визуальные ссылки.
- Переключатель пола в UI удаляется.
- Выбор производится по конкретной карточке тренера-персоны.

Важно:
Это осознанное упрощение MVP.
Если позже потребуется гибкая система “один стиль + много гендерных/визуальных вариантов”, можно вернуться к отдельной таблице вариантов без изменения пользовательского сценария выбора.

---

2) Новая модель данных (БД)

Таблица trainer_profiles
Назначение:
Хранит готовые профили тренеров-персон для выбора в интерфейсе.

Поля:
- id — PK, int, NOT NULL
- code — string, NOT NULL, UNIQUE
  Пример: gentle_female, strict_male
- style_code — string, NOT NULL
  Базовый архетип стиля: gentle / normal / strict
- gender — string, NOT NULL
  Допустимые значения: male / female
- display_name — string, NOT NULL
  Отображаемое имя тренера (человеческое)
- title — string, NOT NULL
  Тип карточки (например: “Лайтовый тренер”)
- description — text, NULL
  Короткое нейтральное описание без гендерных словоформ
- intensity — int, NOT NULL
  Условная сила стиля (например 1..100)
- is_active — bool, NOT NULL, default true

- behavior_json — JSON, NOT NULL
  Содержит тон, style_rules, stop_words, must_use, emoji_level
- prompt_rules_json — JSON, NOT NULL
  language, response_format, must_include_actions, forbidden_actions
- safety_rules_json — JSON, NOT NULL
  Ограничения безопасности, например allow_personal_insults=false
- placeholders_json — JSON, NOT NULL
  Список плейсхолдеров для шаблонов

- avatar_url — text, NULL
  Текущее изображение (для MVP)
- rig_url — text, NULL
  Резерв под post-MVP анимацию/rig

- created_at — datetime, NOT NULL
- updated_at — datetime, NOT NULL

Ограничения:
- code уникален.
- gender IN ('male', 'female').
- intensity BETWEEN 1 AND 100.
- Все JSON-поля обязательны для валидного профиля.

Индексы:
- idx_trainer_profiles_is_active
- idx_trainer_profiles_style_code
- idx_trainer_profiles_intensity

---

Таблица trainer_assets (опционально для расширения)
Назначение:
Если потребуется хранить несколько ассетов на один профиль (png/webp/rig), используем отдельную таблицу.

Поля:
- id — PK
- trainer_profile_id — FK -> trainer_profiles.id, NOT NULL
- asset_type — string, NOT NULL (image/rig/thumbnail)
- format — string, NOT NULL (png/webp/riv/...)
- url — text, NOT NULL
- is_active — bool, NOT NULL, default true
- meta_json — JSON, NULL
- created_at, updated_at

---

3) Изменения в связанных сущностях

Goal:
- было: trainer_id + trainer_gender
- станет: trainer_profile_id (FK -> trainer_profiles.id)
- plan_constraints сохраняется без изменений

User:
- было: default_trainer_id + default_trainer_gender
- станет: default_trainer_profile_id (FK -> trainer_profiles.id)
- остальные поля без изменений

Преимущество:
Цель и пользователь всегда ссылаются на конкретного тренера-персону, без дополнительной логики склейки style + gender.

---

4) Правила контента карточки тренера (MVP)

Обязательные поля карточки:
- display_name
- title
- intensity
- description
- avatar (изображение)

Описание:
- нейтральное по формулировке,
- без муж/жен словоформ,
- 1–2 строки для мобильного экрана.

---

5) JSON-шаблон нового тренера (добрый, женский)

Ниже шаблон одного профиля, где пол уже встроен.
Это заготовка для последующей загрузки в БД и фронтенд-каталог.

{
  "code": "gentle_female_template",
  "style_code": "gentle",
  "gender": "female",
  "display_name": "Лея",
  "title": "Лайтовый тренер",
  "description": "Поддерживающий стиль с мягкой мотивацией и бережным сопровождением прогресса.",
  "intensity": 22,
  "is_active": true,

  "behavior": {
    "tone": "gentle",
    "style_rules": [
      "Говори тепло и поддерживающе",
      "Фокусируйся на посильных шагах",
      "Подчёркивай прогресс и регулярность"
    ],
    "stop_words": [
      "наказание",
      "позор",
      "бездарность",
      "бесполезно",
      "никчемный"
    ],
    "must_use": [
      "поддержка",
      "шаг за шагом",
      "спокойный темп",
      "прогресс",
      "получится"
    ],
    "emoji_level": "high"
  },

  "prompt_rules": {
    "language": "ru",
    "response_format": "json",
    "must_include_actions": ["create_milestone", "suggestions"],
    "forbidden_actions": ["delete_goal"]
  },

  "safety_rules": {
    "allow_personal_insults": false
  },

  "placeholders": [
    "{now_mission}",
    "{next_mission}",
    "{ahead_day}",
    "{late_day}",
    "{remaining_count}"
  ],

  "assets": {
    "avatar_url": "/IMG/gentle_female.png",
    "rig_url": null
  },

  "meta": {
    "version": "1.0",
    "tags": ["supportive", "gentle", "mvp-template"]
  }
}

---

6) Примечание по миграции

Для совместимости с текущими данными:
1) Создать trainer_profiles с новой структурой.
2) Перенести существующие style+gender комбинации в отдельные profile records.
3) Заполнить Goal.trainer_profile_id и User.default_trainer_profile_id.
4) После успешного переноса удалить устаревшие поля trainer_id/trainer_gender.

7) Актуализация решения по хранению тренера (final override)

Контекст пересмотра:
После повторного обсуждения принято новое базовое правило MVP:
тренер хранится только на уровне профиля пользователя.
От хранения тренера на уровне отдельной цели/задачи отказываемся.

Ключевое правило:
- 1 пользователь = 1 активный trainer_profile.
- Goal/Milestone/Task не хранят trainer_id/trainer_profile_id/trainer_gender.
- При генерации плана и ответов всегда используется тренер из профиля пользователя.

Это решение переопределяет предыдущие черновые идеи о привязке тренера к Goal.

---

8) Изменения в моделях (обновлённый источник истины)

User:
- Добавляем/оставляем trainer_profile_id (FK -> trainer_profiles.id).
- Это единственная точка выбора тренера для пользователя.
- Поля default_trainer_id/default_trainer_gender считаются устаревшими (to remove).

Goal:
- НЕ храним trainer_id.
- НЕ храним trainer_gender.
- НЕ храним trainer_profile_id.
- Goal содержит только данные цели/плана/статуса без привязки к тренеру.

Milestone:
- Полей тренера нет.
- plan_version сохраняется по текущему процессу (если используется), без тренерских ссылок.

Task:
- Полей тренера нет.
- plan_version сохраняется по текущему процессу (если используется), без тренерских ссылок.

trainer_profiles:
- Остаётся основной таблицей профилей тренера.
- Профиль уже включает пол (gender), имя (display_name), интенсивность (intensity), стиль и JSON-правила.

trainer_assets:
- Если используется: связь только с trainer_profile_id.
- Любые связи через gender_id считаются устаревшими (to remove).

---

9) Что удаляем из схемы и документов (обязательно пометить)

Полностью убрать/пометить deprecated:
- таблицу trainer_genders;
- поле gender_id в trainer_assets (если оно было);
- любые FK/ссылки на trainer_genders;
- любые поля trainer_gender в Goal/User и связанных схемах;
- старую логику “style + gender склеиваются во время выполнения”.

Отдельно по текстам/документации:
- все упоминания "trainer_genders" пометить как DEPRECATED;
- добавить пометку, что пол теперь часть trainer_profile, а не отдельная сущность.

---

10) Обновлённая логика выбора и применения тренера

UI:
- Пользователь выбирает конкретный trainer_profile (в карточке уже есть пол).
- Переключатель пола не используется.

Backend:
- При построении системного промпта берётся trainer_profile из User.
- Для всех целей пользователя используется один и тот же профиль тренера, пока пользователь его не сменит.

Frontend:
- В состоянии приложения хранится active trainer_profile пользователя.
- При обновлении профиля пользователя меняется тренер глобально для его сессии/целей.

---

11) Преимущества и ограничения решения

Плюсы:
- меньше связей и миграционной сложности;
- меньше расхождений данных;
- проще мобильный UX (выбор готовой карточки без дополнительного gender-switch).

Ограничение:
- нельзя задавать разных тренеров на разные цели в рамках одного пользователя (осознанное ограничение MVP).

---

12) План миграции (минимальный безопасный)

1. Добавить/актуализировать User.trainer_profile_id.
2. Заполнить trainer_profile_id для существующих пользователей (mapping из старых полей, если есть).
3. Переключить backend-логику чтения тренера только с User.trainer_profile_id.
4. Удалить старые поля trainer_id/trainer_gender в Goal/User (после backfill).
5. Удалить trainer_genders и все зависимости от неё.
6. Обновить схемы/CRUD/API/документацию под новую модель.
