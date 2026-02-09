Контекст
Нужно описать, как профиль тренера влияет на system‑prompt, и как сохраняется устойчивость стиля ответа.
Сейчас логика чата уже есть, требуется расширение под trainer config.

Итоговая схема (MVP)
1) Сбор контекста
Goal + Milestones + Agreements
TrainerProfile (behavior, phrases, prompt_rules)
Gender JSON (forms + prompt_hint)
plan_constraints (JSON из Goal)
2) Формирование system‑prompt
Явные блоки ПЛАН и ТОН
Подсказка по полу (gender hint)
Жёсткое требование JSON‑ответа
3) Работа с LLM
history → system prompt → user message
получение JSON ответа
4) Устойчивость стиля
Stop‑words: если найдено — 1 ретрай
Must‑use: отсутствие не критично, ретрай не нужен
При повторном нарушении → fallback (принять ответ и логировать)
5) Смена тренера
новый system‑prompt применяется сразу
история чата сохраняется, стиль меняется с этого момента

Итог
Пункт закрыт: есть логика влияния config на промпт, и правило устойчивости стиля с ретраями.
