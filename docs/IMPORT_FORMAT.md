# Формат Dataset v1

Минимальная оболочка:

```json
{
  "schemaVersion": 1,
  "name": "Мой набор",
  "sources": [],
  "entries": [],
  "terms": [],
  "relations": []
}
```

Полный готовый пример: `data/examples/homebrew.json`. Zod-модель: `src/entities/content.ts`.

Каждый SourceBook содержит UUID, shortName, fullNameRu, fullNameOriginal, edition, publisher, releaseDate (YYYY-MM-DD либо null), contentType, licenseType. У уже существующего источника нельзя менять метаданные: используйте новый UUID для новой публикации.

Каждая запись entries — общие поля и `kind: "Spell"` с `spell: {...}` либо `kind: "Monster"` с `monster: {...}`. Русские тексты в полях *Ru; оригинал в *Original. Обязательны edition (`5e_2014` или `5e_2024`), sourceBookId, source, license, rulesVersion, translationStatus, contentOrigin, contentVersion >= 1, createdAt/updatedAt в UTC ISO 8601. Связанные источники должны существовать либо быть включены в этот набор.

Distance: канонические футы в rangeFeet и speed; UI при желании рассчитывает метры из исходного значения. Стоимость материального компонента хранится в materialCost (золотые монеты). Числа не извлекаются из локализованных описаний. Оригинал и перевод не должны менять игровые значения.

Пустые arrays, false и необязательные русские поля имеют нормализующие defaults. Неизвестные свойства, неизвестный enum, неверный UUID, неограниченный размер массива или слишком длинный текст отклоняются. Внутренние значения вроде Evocation/Dragon отображаются через русский словарь.

`classes`, `subclasses`, `conditions`, `environment` в Phase 1 — русские текстовые метки. При добавлении соответствующих сущностей в Phase 2 эти метки должны быть заменены на типизированные внешние ссылки через миграцию, без поиска соответствий только по названиям.

Политика публикации:

- Missing/MachineDraft/HumanReviewed/NotRequired могут храниться в рабочем наборе.
- Обычная библиотека показывает исключительно Approved.
- Approved должен пройти русскую проверку обязательных и вложенных текстов.
- Выставление Approved выполняет редактор подготовленного файла; автоматического одобрения машинного перевода нет.

Обновления:

- Идентичная запись пропускается без новой ревизии.
- Для изменённой пользовательской записи увеличьте contentVersion и updatedAt.
- UUID, kind, edition, contentOrigin, sourceBookId и createdAt неизменяемы.
- Каждая принятая версия сохраняется как ContentRevision вместе с ссылкой на ImportBatch.
- Официальная запись SRD/Licensed защищена. Для новой официальной редакции используйте новый UUID и явную ContentRelation. Для личного изменения создайте Homebrew-копию.

Термины: UUID, original, russian, category, edition, aliases, notes, createdAt, updatedAt. На один original/category/edition нельзя назначить два основных перевода.

Связи: UUID, sourceId, targetId, relationType. Все ссылки проверяются, self-reference запрещён; автоматического связывания по имени нет.

Ограничения транспорта: `.json`, MIME application/json (локальный файл также может иметь text/plain либо пустой MIME), максимум 32 МиБ и 10 000 записей. HTTP проверяет размер потока, а не только Content-Length. JSON не исполняется; нет распаковки архивов, путей, HTML-вставок или динамических выражений. CSV и ZIP `.dndpack` не поддерживаются текущим адаптером.


## Справочники (этап 2)

`kind: Reference` содержит `reference` с категорией Class, Subclass, SpeciesRace, Background, Feat, Weapon, Armor, Equipment, MagicItem, Condition или Rule. Общие поля Content, версия, происхождение и локализация обязательны. `parentId` подкласса указывает на класс той же редакции; `properties` содержит русские пары nameRu/valueRu, `progression` — уровни 1–20, бонус мастерства, особенности и ресурсы, `features` — описания способностей с уровнем получения. Полный текст и таблицы правил сохраняются в descriptionRu и descriptionOriginal. Эти модели предназначены для справочника; автоматический расчёт персонажа — этап 3.
