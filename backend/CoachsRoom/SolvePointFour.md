Пункт 4 — Структура БД под тренеров (итог)
Контекст:
Мы выделяем 3 отдельные сущности: тренер, гендер, ассеты.
Это позволяет:
менять стиль тренера отдельно от пола
хранить визуал отдельно от логики
в будущем заменить PNG на rig без ломки структуры

Таблица trainer_profiles (Тренеры)
Назначение:
Содержит весь “характер” и поведение тренера.
Поля:
id — PK, int, NOT NULL
code — строка (strict/normal/gentle), NOT NULL, UNIQUE
name — строка, NOT NULL
description — текст, NULL
is_active — bool, NOT NULL, default true
behavior_json — JSON, NOT NULL (tone, style_rules, must_use, stop_words, emoji_level)
phrases_json — JSON, NOT NULL (success_on_time, success_ahead, missed_deadline)
prompt_rules_json — JSON, NOT NULL (language, response_format, must/forbidden actions)
created_at, updated_at — datetime, NOT NULL
Ограничения:
code уникален
JSON‑поля обязательны, чтобы тренер был валидным

Таблица trainer_genders (Гендер)
Назначение:
Содержит местоимения и формы речи (муж/жен).
Поля:
id — PK, int, NOT NULL
code — строка (male/female), NOT NULL, UNIQUE
name — строка, NOT NULL
pronouns_json — JSON, NOT NULL
forms_json — JSON, NOT NULL
prompt_hint — текст, NULL
created_at, updated_at — datetime, NOT NULL
Ограничения:
code уникален
JSON‑поля обязательны (иначе нет формы речи)

Таблица trainer_assets (Изображения / Rig)
Назначение:
Хранит визуал, отдельно от поведения.
Поля:
id — PK, int, NOT NULL
trainer_id — FK → trainer_profiles, NOT NULL
gender_id — FK → trainer_genders, NOT NULL
asset_type — строка (image/rig), NOT NULL
format — строка (png/webp/spine/...), NOT NULL
url — текст, NOT NULL
meta_json — JSON, NULL (для rig)
is_active — bool, NOT NULL, default true
created_at, updated_at — datetime, NOT NULL
Ограничения:
asset обязан иметь trainer_id и gender_id
meta_json может быть пустым (для image)

