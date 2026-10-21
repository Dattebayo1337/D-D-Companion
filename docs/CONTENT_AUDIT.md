# Аудит наполнения справочников

Проверено 2929 записей. 2026-10-02T13:57:59.575Z.

Проверены реальные данные базы и функция, формирующая вкладку «Кратко». Наличие текста, статус Approved и открывающаяся подробная вкладка НЕ доказывают полноту правил. MetadataOnly — авторский обзор, даже при большой длине. SRD — происхождение, а не независимая сверка каждой механики с первоисточником. Короткие тексты и отсутствие структурированных умений — кандидаты ручной проверки: нужные сведения могут находиться в основном тексте.

| Категория | Редакция | Всего | Approved | Пустое кратко | Пустой текст | SRD | Обзоры MetadataOnly | Без подробностей | Текст <80 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Armor | 2014 | 13 | 13 | 0 | 0 | 13 | 0 | 1 | 0 |
| Armor | 2024 | 13 | 13 | 0 | 0 | 13 | 0 | 7 | 0 |
| Background | 2014 | 22 | 22 | 0 | 0 | 1 | 21 | 0 | 0 |
| Background | 2024 | 16 | 16 | 0 | 0 | 4 | 12 | 0 | 0 |
| Class | 2014 | 13 | 13 | 0 | 0 | 12 | 1 | 0 | 0 |
| Class | 2024 | 13 | 13 | 0 | 0 | 12 | 1 | 0 | 0 |
| Condition | 2014 | 15 | 15 | 0 | 0 | 15 | 0 | 6 | 1 |
| Condition | 2024 | 15 | 15 | 0 | 0 | 15 | 0 | 0 | 0 |
| Equipment | 2014 | 163 | 163 | 0 | 0 | 163 | 0 | 152 | 151 |
| Equipment | 2024 | 132 | 132 | 0 | 0 | 132 | 0 | 27 | 23 |
| Feat | 2014 | 46 | 46 | 0 | 0 | 1 | 45 | 2 | 5 |
| Feat | 2024 | 75 | 75 | 0 | 0 | 17 | 58 | 5 | 5 |
| MagicItem | 2014 | 243 | 243 | 0 | 0 | 240 | 3 | 0 | 1 |
| MagicItem | 2024 | 261 | 261 | 0 | 0 | 258 | 3 | 1 | 1 |
| Monster | 2014 | 318 | 318 | 0 | 0 | 317 | 0 | 0 | 0 |
| Monster | 2024 | 332 | 332 | 0 | 0 | 330 | 0 | 0 | 0 |
| Rule | 2014 | 29 | 29 | 0 | 0 | 29 | 0 | 0 | 0 |
| Rule | 2024 | 172 | 172 | 0 | 0 | 172 | 0 | 17 | 5 |
| SpeciesRace | 2014 | 84 | 84 | 0 | 0 | 9 | 75 | 12 | 0 |
| SpeciesRace | 2024 | 19 | 19 | 0 | 0 | 9 | 10 | 0 | 0 |
| Spell | 2014 | 325 | 325 | 0 | 0 | 319 | 4 | 0 | 0 |
| Spell | 2024 | 341 | 341 | 0 | 0 | 339 | 0 | 0 | 0 |
| Subclass | 2014 | 118 | 118 | 0 | 0 | 12 | 106 | 68 | 0 |
| Subclass | 2024 | 76 | 76 | 0 | 0 | 12 | 64 | 26 | 0 |
| Weapon | 2014 | 37 | 37 | 0 | 0 | 37 | 0 | 35 | 0 |
| Weapon | 2024 | 38 | 38 | 0 | 0 | 38 | 0 | 38 | 0 |

## Автоматические замечания

- missing-spell-classes: 4
- no-structured-actions-review-prose: 5
- no-structured-features-review-prose: 199
- summary-only: 397
- short-text-review: 192
- overview-not-full-rules: 403
- progression-not-20-structured-levels: 2

Проверка локализации: 0 замечаний; терминология и связи ContentRelation: 0.

## Как воспроизвести

`pnpm data:completeness:audit` — чтение текущей базы без изменения игровых данных. Полная ведомость каждой карточки: CONTENT_AUDIT.csv; машинный отчёт: data/dndsu/completeness-audit.json. Наличие описаний не заменяет количественную сверку с индексами: см. DNDSU_COVERAGE.md.

## Карточки без отдельного подробного режима

- Ослеплённый (2014, Condition) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/11_Conditions.md
- Очарованный (2014, Condition) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/11_Conditions.md
- Оглохший (2014, Condition) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/11_Conditions.md
- Испуганный (2014, Condition) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/11_Conditions.md
- Недееспособный (2014, Condition) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/11_Conditions.md
- Отравленный (2014, Condition) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/11_Conditions.md
- Щит (2014, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Дубинка (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кинжал (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Большая дубина (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Ручной топорик (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Копьё метательное (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Лёгкий молот (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Булава (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Боевой посох (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Серп (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Копьё (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Арбалет лёгкий (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Дротик (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Короткий лук (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Праща (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Боевой топор (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Цеп (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Глефа (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Секира (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Двуручный меч (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Алебарда (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Длинный меч (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кувалда (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Моргенштерн (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Протазан (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Рапира (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Ятаган (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Короткий меч (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Трезубец (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Боевая кирка (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Боевой молот (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кнут (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Духовая трубка (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Ручной арбалет (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Тяжёлый арбалет (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Длинный лук (2014, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Счёты (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кислота (флакон) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Алхимический огонь (фляжка) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Стрелы (20) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Иглы для духовой трубки (50) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Арбалетные болты (20) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Снаряды для пращи (20) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Противоядие (флакон) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Кристалл (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Сфера (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Жезл (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Посох (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Палочка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Рюкзак (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Металлические шарики (мешок, 1 000) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Бочка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Корзина (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Спальный мешок (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Колокольчик (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Одеяло (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Блок с лебёдкой (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Книга (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Бутылка стеклянная (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Ведро (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Свеча (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Футляр для арбалетных болтов (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Футляр для карт или свитков (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Цепь (10 футов) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Мел (1 кусок) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Сундук (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор скалолаза (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Одежда, обычная (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Одежда, костюм (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Одежда, хорошая (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Одежда, дорожная (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Мешочек с компонентами (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Лом (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Веточка омелы (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Тотем (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Деревянный посох (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Тисовая палочка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор для рыбной ловли (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Фляжка или кружка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Крюк-кошка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Молоток (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кувалда (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор целителя (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Амулет (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Эмблема (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Реликварий (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Святая вода (фляжка) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Песочные часы (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Охотничий капкан (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Чернила (бутылочка, 1 унция) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Перо для письма (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кувшин или графин (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Лестница (10 футов) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Лампа (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Фонарь направленный (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Фонарь закрытый (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Замок (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Увеличительное стекло (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кандалы (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Столовый набор (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Зеркало стальное (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Масло (фляжка) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Бумага (один лист) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Пергамент (один лист) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Духи (флакон) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Кирка шахтёрская (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Крюк (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Яд, простой (флакон) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Шест (10 футов) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Котелок чугунный (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Зелье лечения (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Мешочек (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Колчан (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Таран переносной (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Рационы (1 день) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Мантия (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Верёвка пеньковая (50 футов) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Верёвка шёлковая (50 футов) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Мешок (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Весы торговые (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Сургуч (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Лопата (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Сигнальный свисток (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Перстень-печатка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Мыло (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Книга заклинаний (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Шипы железные (10) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Подзорная труба (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Палатка двухместная (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Трутница (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Факел (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Флакон (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Точильный камень (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты алхимика (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты пивовара (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты каллиграфа (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты плотника (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты картографа (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты сапожника (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Поварская утварь (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты стеклодува (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты ювелира (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты кожевника (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты каменщика (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты художника (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты гончара (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты кузнеца (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты жестянщика (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты ткача (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Инструменты резчика по дереву (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор для грима (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор для подделки (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Набор костей (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Набор карт (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор травника (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Волынка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Барабан (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Цимбалы (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Флейта (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Лютня (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Лира (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Рожок (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Свирель (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Шалмей (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Виола (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Навигационные инструменты (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Набор отравителя (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Воровские инструменты (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Транспорт (наземный или водный) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Удила и уздечка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Карета (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Телега (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Колесница (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Корм (за день) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Экзотическое (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Военное (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Вьючное (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- ~ Верховое (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Перемётные сумки (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Сани (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Стойло (за день) (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Фургон (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Галера (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Шлюп (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Драккар (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Лодка (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Парусник (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Боевой корабль (2014, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.1/ru/09_Equipment.md
- Союзник (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Окровавленный (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Урон (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Отход [Действие] (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Враг (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Иммунитет (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Магический эффект (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Занятое пространство (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- В день (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Досягаемость (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Округление вниз (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Одновременные эффекты (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Заклинание (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Цель (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Незанятое пространство (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Использование [Действие] (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/08_RulesGlossary.md
- Кольцо телекинеза (2024, MagicItem) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/10_MagicItems.md
- Дубинка (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Кинжал (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Палица (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Ручной топор (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Метательное копьё (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Лёгкий молот (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Булава (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Боевой посох (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Серп (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Копьё (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Дротик (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Лёгкий арбалет (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Короткий лук (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Праща (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Боевой топор (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Цеп (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Глефа (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Секира (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Двуручный меч (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Алебарда (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Копьё для турнира (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Длинный меч (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Молот (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Моргенштерн (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Пика (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Рапира (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Скимитар (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Короткий меч (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Трезубец (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Боевой молот (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Боевая кирка (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Кнут (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Духовая трубка (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Ручной арбалет (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Тяжёлый арбалет (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Длинный лук (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Мушкет (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Пистолет (2024, Weapon) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Стёганый доспех (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Кожаный доспех (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Проклёпанный кожаный доспех (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Колечный доспех (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Кольчуга (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Наборный доспех (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Латы (2024, Armor) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Свиток заклинания (заговор) (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Свиток заклинания (1 уровень) (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Верблюд (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Слон (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Лошадь, тягловая (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Лошадь, верховая (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Мастиф (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Мул (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Пони (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Боевой конь (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Карета (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Телега (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Колесница (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Корм в день (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Седло, экзотическое (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Седло, военное (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Седло, верховое (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Сани (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Содержание в конюшне в день (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Повозка (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Дирижабль (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Галера (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Киль (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Драккар (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Шлюпка (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Парусник (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Военный корабль (2024, Equipment) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Снаряжение: Варка зелий лечения (2024, Rule) — https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-5.2/ru/06_Equipment.md
- Ремесленник (2024, Feat) — https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024
- Целитель (2024, Feat) — https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024
- Везунчик (2024, Feat) — https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024
- Музыкант (2024, Feat) — https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024
- Крепкий (2024, Feat) — https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024
- Мастер большого оружия (2014, Feat) — https://dnd.su/feats/120-great-weapon-master/
- Мастер древкового оружия (2014, Feat) — https://dnd.su/feats/121-polearm-master/
- Аасимар (2014, SpeciesRace) — https://dnd.su/race/161-aasimar/
- Гибрид Симиков (2014, SpeciesRace) — https://dnd.su/race/164-simic-hybrid/
- Гифф (2014, SpeciesRace) — https://dnd.su/multiverse/race/215-giff/
- Орк (2014, SpeciesRace) — https://dnd.su/race/187-orc/
- Юань-ти (2014, SpeciesRace) — https://dnd.su/race/189-yuan-ti-pureblood/
- Гитцерай · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/293-githzerai/
- Глубинный гном · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/286-deep-gnome/
- Голиаф · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/295-goliath/
- Дуэргар · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/287-duergar/
- Табакси · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/307-tabaxi/
- Шадар-кай · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/305-shadar-kai/
- Юань-ти · Мультивселенная монстров (2014, SpeciesRace) — https://dnd.su/multiverse/race/311-yuan-ti/
- Алхимик (2014, Subclass) — https://dnd.su/class/137-artificer/#specialist.alchemist
- Боевой кузнец (2014, Subclass) — https://dnd.su/class/137-artificer/#specialist.battlesmith
- Бронник (2014, Subclass) — https://dnd.su/class/137-artificer/#specialist.armorer
- Путь бушующего в бою (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.battlerager
- Путь буревестника (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.storm-herald
- Путь предка-хранителя (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.ancestral-guardian
- Путь фанатика (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.zealot
- Путь дикой магии (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.wild-magic
- Путь зверя (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.beast
- Путь великана (2014, Subclass) — https://dnd.su/class/87-barbarian/#primal.giant
- Домен смерти (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.death
- Домен магии (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.arcana
- Домен кузни (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.forge
- Домен упокоения (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.grave
- Домен мира (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.peace
- Домен порядка (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.order
- Домен сумерек (2014, Subclass) — https://dnd.su/class/89-cleric/#domain.twilight
- Круг пастыря (2014, Subclass) — https://dnd.su/class/90-druid/#circle.shepherd
- Круг снов (2014, Subclass) — https://dnd.su/class/90-druid/#circle.dreams
- Круг дикого огня (2014, Subclass) — https://dnd.su/class/90-druid/#circle.wildfire
- Круг спор (2014, Subclass) — https://dnd.su/class/90-druid/#circle.spores
- Рыцарь Пурпурного дракона (2014, Subclass) — https://dnd.su/class/91-fighter/#archetype.banneret
- Кавалерист (2014, Subclass) — https://dnd.su/class/91-fighter/#archetype.cavalier
- Мистический лучник (2014, Subclass) — https://dnd.su/class/91-fighter/#archetype.arcane-archer
- Самурай (2014, Subclass) — https://dnd.su/class/91-fighter/#archetype.samurai
- Рыцарь Эха (2014, Subclass) — https://dnd.su/class/91-fighter/#archetype.echo-knight
- Пси-воин (2014, Subclass) — https://dnd.su/class/91-fighter/#archetype.psi-warrior
- Путь долгой смерти (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.long-death
- Путь кэнсэя (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.kensei
- Путь пьяного мастера (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.drunken-master
- Путь солнечной души (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.sun-soul
- Путь астрального тела (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.astral-body
- Путь милосердия (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.mercy
- Путь восходящего дракона (2014, Subclass) — https://dnd.su/class/93-monk/#tradition.ascending-dragon
- Клятвопреступник (2014, Subclass) — https://dnd.su/class/94-paladin/#oath.oathbreaker
- Клятва короны (2014, Subclass) — https://dnd.su/class/94-paladin/#oath.crown
- Клятва искупления (2014, Subclass) — https://dnd.su/class/94-paladin/#oath.redemption
- Клятва покорения (2014, Subclass) — https://dnd.su/class/94-paladin/#oath.conquest
- Клятва славы (2014, Subclass) — https://dnd.su/class/94-paladin/#oath.glory
- Клятва смотрителей (2014, Subclass) — https://dnd.su/class/94-paladin/#oath.watchers
- Странник горизонта (2014, Subclass) — https://dnd.su/class/97-ranger/#archetype.horizon-walker
- Сумрачный охотник (2014, Subclass) — https://dnd.su/class/97-ranger/#archetype.gloom-stalker
- Убийца чудовищ (2014, Subclass) — https://dnd.su/class/97-ranger/#archetype.monster-slayer
- Странник фей (2014, Subclass) — https://dnd.su/class/97-ranger/#archetype.fey-wanderer
- Наездник на дрейке (2014, Subclass) — https://dnd.su/class/97-ranger/#archetype.drakewarden
- Дуэлянт (2014, Subclass) — https://dnd.su/class/99-rogue/#archetype.swashbuckler
- Комбинатор (2014, Subclass) — https://dnd.su/class/99-rogue/#archetype.mastermind
- Скаут (2014, Subclass) — https://dnd.su/class/99-rogue/#archetype.scout
- Сыщик (2014, Subclass) — https://dnd.su/class/99-rogue/#archetype.inquisitive
- Фантом (2014, Subclass) — https://dnd.su/class/99-rogue/#archetype.phantom
- Клинок души (2014, Subclass) — https://dnd.su/class/99-rogue/#archetype.soulknife
- Божественная душа (2014, Subclass) — https://dnd.su/class/101-sorcerer/#origin.divine-soul
- Теневая магия (2014, Subclass) — https://dnd.su/class/101-sorcerer/#origin.shadow
- Штормовое колдовство (2014, Subclass) — https://dnd.su/class/101-sorcerer/#origin.storm
- Аберрантный разум (2014, Subclass) — https://dnd.su/class/101-sorcerer/#origin.aberrant-mind
- Заводная душа (2014, Subclass) — https://dnd.su/class/101-sorcerer/#origin.clockwork-soul
- Лунное чародейство (2014, Subclass) — https://dnd.su/class/101-sorcerer/#origin.lunar-sorcery
- Бессмертный (2014, Subclass) — https://dnd.su/class/104-warlock/#patron.undying
- Ведьмовской клинок (2014, Subclass) — https://dnd.su/class/104-warlock/#patron.hexblade
- Небожитель (2014, Subclass) — https://dnd.su/class/104-warlock/#patron.celestial
- Бездонный (2014, Subclass) — https://dnd.su/class/104-warlock/#patron.fathomless
- Гений (2014, Subclass) — https://dnd.su/class/104-warlock/#patron.genie
- Нежить (2014, Subclass) — https://dnd.su/class/104-warlock/#patron.undead
- Военная магия (2014, Subclass) — https://dnd.su/class/105-wizard/#tradition.war-magic
- Магия хронургии (2014, Subclass) — https://dnd.su/class/105-wizard/#tradition.chronurgy
- Магия гравитургии (2014, Subclass) — https://dnd.su/class/105-wizard/#tradition.graviturgy
- Орден писцов (2014, Subclass) — https://dnd.su/class/105-wizard/#tradition.scribes
- Песнь клинка (2014, Subclass) — https://dnd.su/class/105-wizard/#tradition.bladesinging
- Алхимик (2024, Subclass) — https://next.dnd.su/class/artificer#subclass.alchemist
- Артиллерист (2024, Subclass) — https://next.dnd.su/class/artificer#subclass.artillerist
- Боевой кузнец (2024, Subclass) — https://next.dnd.su/class/artificer#subclass.battle-smith
- Бронник (2024, Subclass) — https://next.dnd.su/class/artificer#subclass.armorer
- Картограф (2024, Subclass) — https://next.dnd.su/class/artificer#subclass.сartographer
- Реаниматор (2024, Subclass) — https://next.dnd.su/class/artificer#subclass.reanimator
- Домен знаний (2024, Subclass) — https://next.dnd.su/class/cleric#subclass.knowledge-domain
- Домен упокоения (2024, Subclass) — https://next.dnd.su/class/cleric#subclass.grave-domain
- Домен магии (2024, Subclass) — https://next.dnd.su/class/cleric#subclass.arcana-domain
- Баннерет (2024, Subclass) — https://next.dnd.su/class/fighter#subclass.banneret
- Чародейный стрелок (2024, Subclass) — https://next.dnd.su/class/fighter#subclass.arcane-archer
- Мистический воин (2024, Subclass) — https://next.dnd.su/class/monk#subclass.warrior-of-the-mystic-arts
- Клятва благородных гениев (2024, Subclass) — https://next.dnd.su/class/paladin#subclass.oath-of-the-noble-genies
- Зимний ходок (2024, Subclass) — https://next.dnd.su/class/ranger#subclass.winter-walker
- Страж пустошей (2024, Subclass) — https://next.dnd.su/class/ranger#subclass.hollow-warden
- Наследник троицы (2024, Subclass) — https://next.dnd.su/class/rogue#subclass.scion-of-the-three
- Фантом (2024, Subclass) — https://next.dnd.su/class/rogue#subclass.phantom
- Чародейство чаропламени (2024, Subclass) — https://next.dnd.su/class/sorcerer#subclass.spellfire-sorcery
- Теневое чародейство (2024, Subclass) — https://next.dnd.su/class/sorcerer#subclass.shadow-sorcery
- Нежить (2024, Subclass) — https://next.dnd.su/class/warlock#subclass.undead
- Предтеча (2024, Subclass) — https://next.dnd.su/class/warlock#subclass.vestige-patron
- Некромант (2024, Subclass) — https://next.dnd.su/class/wizard#subclass.necromancer
- Очарователь (2024, Subclass) — https://next.dnd.su/class/wizard#subclass.enchanter
- Преобразователь (2024, Subclass) — https://next.dnd.su/class/wizard#subclass.transmuter
- Призыватель (2024, Subclass) — https://next.dnd.su/class/wizard#subclass.conjurer
- Певец клинка (2024, Subclass) — https://next.dnd.su/class/wizard#subclass.bladesinger
