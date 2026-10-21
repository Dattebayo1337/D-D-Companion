# D&D COMPANION — MASTER PROMPT

Ты — ведущий full-stack разработчик, software architect, database architect, UX/UI-дизайнер и специалист по разработке приложений для настольных ролевых игр.

Твоя задача — спроектировать и реализовать полноценное приложение-компаньон для **Dungeons & Dragons 5-й редакции**, ориентированное в первую очередь на русскоязычных игроков и мастеров.

Рабочее название проекта:

# D&D Companion

Приложение должно представлять собой не простой справочник, а полноценную платформу для игроков и Dungeon Master.

---

# 1. ПОДДЕРЖИВАЕМЫЕ РЕДАКЦИИ

Приложение должно одновременно поддерживать:

### D&D 5e — правила 2014 года

и

### D&D 5e Revised / 2024 — обновлённые правила 2024 года

Внутренние идентификаторы:

```text
5e_2014
5e_2024
```

Пользователь должен иметь возможность:

* использовать только правила 2014;
* использовать только правила 2024;
* видеть обе версии;
* сравнивать версии;
* создавать кампании со смешанными правилами;
* выбирать конкретную версию отдельного правила;
* использовать Homebrew совместно с любой редакцией.

---

# 2. ГЛАВНЫЙ ПРИНЦИП ПРОЕКТА

Это должна быть:

**платформа, а не статический справочник.**

Архитектура должна позволять позже подключать:

* новые официальные книги;
* новые ревизии правил;
* новые SRD;
* Homebrew-пакеты;
* пользовательские книги;
* пользовательские базы данных;
* дополнительные модули;
* облачную синхронизацию;
* совместные кампании.

Без переписывания основной архитектуры.

---

# 3. РУССКИЙ ЯЗЫК — ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ

Русский язык является основным языком приложения.

Пользователь должен иметь возможность полностью пользоваться программой, даже если он вообще не знает английский язык.

Это относится не только к интерфейсу.

## ВСЕ игровые данные должны отображаться на русском языке.

На русском должны быть:

* заклинания;
* описания заклинаний;
* монстры;
* способности монстров;
* действия;
* реакции;
* легендарные действия;
* классы;
* подклассы;
* классовые способности;
* расы;
* виды;
* предыстории;
* черты;
* оружие;
* свойства оружия;
* доспехи;
* предметы;
* магические предметы;
* состояния;
* игровые действия;
* правила;
* таблицы;
* подсказки;
* системные сообщения;
* фильтры;
* меню;
* интерфейс персонажа;
* интерфейс Dungeon Master;
* Encounter Builder;
* журнал боя.

Никакая игровая сущность не должна отображаться пользователю исключительно на английском.

---

# 4. ОРИГИНАЛЬНЫЕ НАЗВАНИЯ

Английские названия необходимо сохранять в базе как технический слой.

Например:

```text
nameRu = "Огненный шар"
nameOriginal = "Fireball"
```

В обычном интерфейсе отображается:

```text
Огненный шар
```

Опциональная настройка пользователя:

```text
Огненный шар
Fireball
```

По умолчанию:

**только русский язык.**

---

# 5. РУССКИЕ ОПИСАНИЯ

Основное поле:

```text
descriptionRu
```

Дополнительное техническое поле:

```text
descriptionOriginal
```

Английский текст не должен быть необходим для нормального использования приложения.

---

# 6. СИСТЕМА КОНТРОЛЯ ПЕРЕВОДА

Каждая локализуемая сущность должна иметь:

```text
translationStatus
```

Допустимые значения:

```text
NotRequired
Missing
MachineDraft
HumanReviewed
Approved
```

Если русская локализация отсутствует:

```text
translationStatus = Missing
```

Приложение не должно автоматически подменять отсутствующий русский текст английским.

В Data Manager должна появляться ошибка:

```text
Отсутствует русская локализация.
```

---

# 7. ПРОВЕРКА РУССКОЙ БАЗЫ

Создать команду:

```text
Validate Russian Localization
```

Она должна находить:

* отсутствующие русские названия;
* отсутствующие русские описания;
* непереведённые enum;
* непереведённые свойства;
* непереведённые правила;
* конфликтующие переводы;
* необработанные placeholder;
* английский текст в обязательных русских полях.

---

# 8. ТЕРМИНОЛОГИЧЕСКИЙ СЛОВАРЬ

Создать сущность:

```text
TerminologyDictionary
```

или:

```text
TermTranslation
```

Поля:

```text
id
original
russian
category
edition
aliases
notes
createdAt
updatedAt
```

Категории:

```text
Ability
Skill
Condition
DamageType
School
CreatureType
Action
Rule
WeaponProperty
ArmorProperty
SpellTerm
ClassTerm
General
```

Один термин должен иметь единый основной перевод.

---

# 9. АЛЬТЕРНАТИВНЫЕ ПЕРЕВОДЫ

Поддерживать:

```text
aliases[]
```

Например поиск должен понимать:

* русский основной термин;
* другой распространённый русский перевод;
* английское название;
* транслитерацию.

Однако результат всегда показывается с основным русским названием.

---

# 10. ПОИСК НА РУССКОМ

Полнотекстовый поиск должен корректно работать с русским языком.

Учитывать:

* падежи;
* окончания;
* формы слов;
* частичные совпадения;
* опечатки;
* Е / Ё;
* английские названия;
* aliases.

Например:

```text
дракон
дракона
драконы
```

должны давать релевантные результаты.

---

# 11. РУССКИЕ ENUM

Внутренний код может использовать:

```text
DamageType.FIRE
CreatureSize.LARGE
CastingTime.BONUS_ACTION
```

Пользователь должен видеть:

```text
Огонь
Большой
Бонусное действие
```

Никогда не выводить технические enum напрямую.

---

# 12. ИСТОЧНИКИ ДАННЫХ

Встроенный официальный контент должен использовать только данные, которые разрешено распространять.

Поддерживать импорт разрешённых SRD-данных для соответствующих редакций.

Приложение не должно:

* обходить DRM;
* обходить paywall;
* обходить авторизацию;
* скрейпить закрытый контент;
* автоматически копировать защищённые книги;
* распространять нелицензированный текст.

Архитектура при этом должна позволять пользователю хранить собственный законно полученный контент.

---

# 13. ПРОИСХОЖДЕНИЕ КОНТЕНТА

Каждая сущность должна иметь:

```text
contentOrigin
```

Значения:

```text
SRD
Licensed
UserImported
Homebrew
MetadataOnly
```

Дополнительно:

```text
license
source
sourceBook
sourcePage
edition
rulesVersion
```

---

# 14. SOURCE BOOK

Создать сущность:

```text
SourceBook
```

Поля:

```text
id
shortName
fullNameRu
fullNameOriginal
edition
publisher
releaseDate
contentType
licenseType
```

Не зашивать список книг прямо в код.

---

# 15. ГЛАВНОЕ МЕНЮ

Создать следующие разделы:

* Главная
* Персонажи
* Заклинания
* Бестиарий
* Классы
* Подклассы
* Расы / Виды
* Предыстории
* Черты
* Предметы
* Оружие
* Доспехи
* Магические предметы
* Снаряжение
* Правила
* Состояния
* Кампании
* Бои
* NPC
* Задания
* Homebrew
* Источники
* Коллекции
* Настройки

---

# 16. ГЛОБАЛЬНЫЙ ПОИСК

Строка глобального поиска должна искать одновременно по:

* заклинаниям;
* монстрам;
* предметам;
* магическим предметам;
* правилам;
* состояниям;
* классам;
* подклассам;
* расам / видам;
* чертам;
* предысториям.

Результаты группировать по категориям.

---

# 17. ЗАКЛИНАНИЯ

Создать сущность:

```text
Spell
```

Поля:

```text
id

nameRu
nameOriginal

descriptionRu
descriptionOriginal

edition
source
sourceBook
sourcePage

level
school

castingTime
ritual

range
target

components
materialComponentRu
materialComponentOriginal
materialCost
materialConsumed

duration
concentration

higherLevelsRu
higherLevelsOriginal

classes
subclasses

damage
damageType

healing

savingThrow
attackType

conditions

tags

translationStatus
contentOrigin

createdAt
updatedAt
contentVersion
errataVersion
```

---

# 18. ФИЛЬТРЫ ЗАКЛИНАНИЙ

Добавить:

* название;
* редакция;
* уровень;
* школа;
* класс;
* подкласс;
* ритуал;
* концентрация;
* время накладывания;
* дальность;
* тип урона;
* спасбросок;
* атака заклинанием;
* источник.

---

# 19. КНИГА ЗАКЛИНАНИЙ

Персонаж может помечать заклинание:

```text
Известно
Подготовлено
Всегда подготовлено
Получено от класса
Получено от подкласса
Получено от вида / расы
Получено от черты
Получено от предмета
```

---

# 20. БЕСТИАРИЙ

Создать:

```text
Monster
```

Поля:

```text
id

nameRu
nameOriginal

edition
source
sourceBook

size
type
subtype
alignment

armorClass
armorType

hitPoints
hitDice

speed

STR
DEX
CON
INT
WIS
CHA

savingThrows
skills

resistances
immunities
vulnerabilities
conditionImmunities

senses
languages

challengeRating
xp
proficiencyBonus

traits
actions
bonusActions
reactions
legendaryActions
lairActions
regionalEffects

spellcasting

environment

tags

translationStatus
contentOrigin
```

---

# 21. КАРТОЧКА МОНСТРА

Stat Block должен быть полностью на русском.

Показывать:

```text
Название

Размер • Тип • Мировоззрение

Класс Доспеха
Хиты
Скорость

СИЛ
ЛОВ
ТЕЛ
ИНТ
МДР
ХАР

Спасброски
Навыки

Сопротивления урону
Иммунитеты к урону
Уязвимости
Иммунитеты к состояниям

Чувства
Языки
Опасность
Бонус мастерства

Особенности

Действия

Бонусные действия

Реакции

Легендарные действия
```

---

# 22. ФИЛЬТРЫ БЕСТИАРИЯ

Поддерживать:

* уровень опасности;
* тип;
* размер;
* окружение;
* редакцию;
* источник;
* сопротивления;
* иммунитеты;
* чувства;
* скорость;
* тип перемещения;
* заклинателя;
* легендарное существо.

---

# 23. ENCOUNTER BUILDER

Создать полноценный конструктор столкновений.

Сущность:

```text
Encounter
```

Поля:

```text
id
name
campaignId

participants
monsters
NPCs
playerCharacters

initiative

round
turn

conditions

notes
```

---

# 24. БОЕВОЙ ТРЕКЕР

Для каждого участника хранить:

```text
HP
Max HP
Temporary HP
AC

Conditions

Concentration

Initiative

DeathState
```

Кнопки:

```text
Урон
Лечение
Временные хиты
Состояние
Концентрация
Следующий ход
Предыдущий ход
Следующий раунд
```

---

# 25. DICE ROLLER

Поддерживать:

```text
d4
d6
d8
d10
d12
d20
d100
```

Формулы:

```text
1d20+5
2d6+3
8d6
2d20kh1
2d20kl1
```

Добавить:

* Преимущество;
* Помеха;
* Критический удар;
* историю бросков;
* имя персонажа;
* источник броска.

---

# 26. КЛАССЫ

Сущность:

```text
Class
```

Поля:

```text
id

nameRu
nameOriginal

edition

hitDie

primaryAbilities

savingThrows

armorProficiencies
weaponProficiencies
toolProficiencies

skills

startingEquipment

features

spellcasting

subclasses
```

---

# 27. ПРОГРЕССИЯ КЛАССА

Создать:

```text
ClassLevelProgression
```

Поля:

```text
classId
level

proficiencyBonus

features

resources

spellSlots
```

Отображать уровни:

```text
1–20
```

---

# 28. ПОДКЛАССЫ

Создать:

```text
Subclass
```

Поля:

```text
id
classId

nameRu
nameOriginal

edition

source

features

spellList
```

Не предполагать одинаковые уровни получения способностей в редакциях 2014 и 2024.

---

# 29. РАСЫ / ВИДЫ

Для 2014 поддерживать термин:

```text
Раса
```

Для новой редакции:

```text
Вид
```

Внутренняя сущность:

```text
SpeciesRace
```

Поля:

```text
nameRu
nameOriginal

edition

size
speed

languages

traits

darkvision

resistances

spells

features
```

---

# 30. ПРЕДЫСТОРИИ

Создать:

```text
Background
```

Поля:

```text
nameRu
nameOriginal

edition

abilityScores

skillProficiencies

toolProficiencies

languages

equipment

feat

feature
```

Структуры 2014 и 2024 не должны считаться идентичными.

---

# 31. ЧЕРТЫ

Создать:

```text
Feat
```

Поля:

```text
nameRu
nameOriginal

edition

category

prerequisites

levelRequirement

abilityIncrease

features

repeatable

source
```

---

# 32. СНАРЯЖЕНИЕ

Базовая сущность:

```text
Equipment
```

Подтипы:

```text
Weapon
Armor
AdventuringGear
Tool
Mount
Vehicle
MagicItem
```

---

# 33. ОРУЖИЕ

```text
Weapon
```

Поля:

```text
nameRu
nameOriginal

edition

category

damage

damageType

properties

range

weight

cost

masteryProperty
```

Для правил 2024 поддерживать Weapon Mastery.

Список Mastery не должен быть жёстко зашит в UI.

---

# 34. ДОСПЕХИ

Создать:

```text
Armor
```

Поля:

```text
nameRu
nameOriginal

edition

category

baseAC

dexterityModifier

maxDexterityModifier

strengthRequirement

stealthDisadvantage

weight

cost

properties
```

---

# 35. МАГИЧЕСКИЕ ПРЕДМЕТЫ

Создать:

```text
MagicItem
```

Поля:

```text
nameRu
nameOriginal

edition

rarity

type

requiresAttunement

attunementRequirements

charges

recharge

properties

descriptionRu
descriptionOriginal

source
```

---

# 36. СОСТОЯНИЯ

Создать:

```text
Condition
```

Поля:

```text
nameRu
nameOriginal

edition

descriptionRu
descriptionOriginal

duration

source

relatedConditions
```

---

# 37. RULES COMPENDIUM

Создать полноценный русскоязычный справочник правил.

Категории:

* Действия;
* Бонусные действия;
* Реакции;
* Передвижение;
* Укрытие;
* Зрение;
* Отдых;
* Истощение;
* Смерть;
* Концентрация;
* Захват;
* Скрытность;
* Застигнут врасплох;
* Инициатива;
* Состояния;
* Заклинания;
* Снаряжение;
* Путешествия;
* Исследование.

Каждая статья должна иметь:

```text
edition
```

---

# 38. СОЗДАНИЕ ПЕРСОНАЖА

Создать Character Builder.

Шаги:

```text
1. Выбор редакции
2. Вид / Раса
3. Предыстория
4. Класс
5. Характеристики
6. Навыки
7. Снаряжение
8. Заклинания
9. Черты
10. Проверка персонажа
```

---

# 39. ХАРАКТЕРИСТИКИ

Поддерживать способы:

```text
Standard Array
Point Buy
Manual
Dice Roll
```

Названия интерфейса должны быть на русском.

---

# 40. ЛИСТ ПЕРСОНАЖА

Создать сущность:

```text
Character
```

Поля:

```text
id
name

edition

level

class
subclass

speciesRace
background

alignment

experience

STR
DEX
CON
INT
WIS
CHA

HP
MaxHP
TempHP

HitDice

AC

Initiative

Speed

ProficiencyBonus

SavingThrows

Skills

Proficiencies

Languages

Traits

Features

Feats

Weapons

Inventory

Equipment

MagicItems

Spells

Currency

Notes
```

---

# 41. ВАЛЮТА

Поддерживать:

```text
CP
SP
EP
GP
PP
```

Интерфейс — русский.

---

# 42. ОТДЫХ

Кнопки:

```text
Короткий отдых
Долгий отдых
```

Rule Engine должен автоматически определять, какие ресурсы восстанавливаются.

---

# 43. MULTICLASS

Создать:

```text
CharacterClass
```

Поля:

```text
characterId
classId
level
```

Автоматически рассчитывать:

* общий уровень;
* бонус мастерства;
* ячейки заклинаний;
* кости хитов;
* классовые ресурсы.

---

# 44. ПОВЫШЕНИЕ УРОВНЯ

Создать режим:

```text
Повысить уровень
```

Он должен:

* предложить класс;
* показать новые способности;
* изменить максимальные HP;
* обновить бонус мастерства;
* открыть новые заклинания;
* открыть новые ресурсы;
* учитывать multiclass.

---

# 45. CAMPAIGN MANAGER

Создать:

```text
Campaign
```

Поля:

```text
name

editionMode

description

DM

players

characters

NPCs

locations

quests

encounters

notes

calendar
```

---

# 46. РЕЖИМ РЕДАКЦИИ КАМПАНИИ

```text
2014
2024
Mixed
```

---

# 47. NPC MANAGER

Создать:

```text
NPC
```

Поля:

```text
name

speciesRace

age

occupation

faction

location

appearance

personality

goals

secrets

relationship

notes

statBlock

tags
```

---

# 48. QUEST MANAGER

Создать:

```text
Quest
```

Поля:

```text
title
description

status

giver

objectives

rewards

locations

NPCs

notes
```

Статусы:

```text
Запланировано
Активно
Выполнено
Провалено
Скрыто
```

---

# 49. ЛОКАЦИИ

Создать:

```text
Location
```

Поля:

```text
name
type
description
parentLocation
NPCs
quests
encounters
notes
tags
```

Поддержать иерархию:

```text
Мир
→ Континент
→ Королевство
→ Регион
→ Город
→ Район
→ Здание
→ Комната
```

---

# 50. JOURNAL / SESSION NOTES

Создать журнал кампании.

```text
Session
```

Поля:

```text
number
title
date
summary
characters
NPCs
locations
quests
encounters
notes
```

---

# 51. HOMEBREW

Пользователь должен создавать собственные:

* заклинания;
* монстров;
* классы;
* подклассы;
* виды;
* расы;
* предыстории;
* черты;
* оружие;
* доспехи;
* предметы;
* магические предметы;
* состояния;
* правила.

---

# 52. CLONE → EDIT

Нельзя изменять встроенный официальный объект.

Для модификации:

```text
Клонировать
↓
Создать Homebrew
↓
Редактировать
```

---

# 53. HOMEBREW PACK

Создать собственный формат:

```text
.dndpack
```

Это ZIP-контейнер.

Структура:

```text
manifest.json

data/

assets/
```

Manifest:

```text
name
author
version
description
edition
dependencies
```

---

# 54. IMPORT / EXPORT

Поддерживать:

```text
JSON
CSV
.dndpack
```

---

# 55. MY SOURCES

Создать раздел:

```text
Мои источники
```

Пользователь может импортировать принадлежащие ему структурированные данные.

Например:

```text
JSON
CSV
```

Архитектура должна позволять позже добавлять новые import adapters.

---

# 56. НЕ ОБХОДИТЬ ЗАЩИТУ

Никогда не реализовывать:

* обход DRM;
* обход платных страниц;
* автоматический сбор закрытого контента;
* получение данных без разрешения;
* обход авторизации сайтов.

---

# 57. СРАВНЕНИЕ РЕДАКЦИЙ

Одна из ключевых функций приложения.

Для связанных сущностей показывать:

```text
2014 | 2024
```

Подсвечивать отличия.

Например:

* название;
* уровень;
* цифры;
* механика;
* описание;
* доступность;
* свойства;
* способности.

---

# 58. CONTENT RELATION

Создать:

```text
ContentRelation
```

Поля:

```text
sourceId
targetId

relationType
```

Типы:

```text
RevisedVersion
LegacyVersion
Equivalent
Replacement
Related
```

Никогда не определять соответствие только по совпадению названий.

---

# 59. КНОПКА «СРАВНИТЬ ВЕРСИИ»

Показывать diff.

Например для заклинания:

```text
Уровень
Школа
Время накладывания
Дальность
Компоненты
Длительность
Концентрация
Урон
Масштабирование
Описание
Классы
```

Изменения визуально выделять.

---

# 60. ИЗБРАННОЕ

Любую сущность можно:

```text
Добавить в избранное
Добавить в коллекцию
```

---

# 61. КОЛЛЕКЦИИ

Примеры:

```text
Заклинания моего волшебника

Монстры для Подземья

Любимые артефакты

Будущие боссы

NPC столицы
```

---

# 62. RULE ENGINE

Создать отдельный модуль:

```text
Rule Engine
```

Он не должен зависеть от React/UI.

---

# 63. RULE ENGINE FUNCTIONS

Например:

```text
calculateAbilityModifier()

calculateProficiencyBonus()

calculateSavingThrow()

calculateSkillModifier()

calculateSpellSaveDC()

calculateSpellAttackBonus()

calculateArmorClass()

calculateInitiative()

calculatePassivePerception()

calculateMulticlassSpellSlots()

calculateHitPoints()

calculateCarryingCapacity()
```

---

# 64. РЕДАКЦИИ В RULE ENGINE

Правила должны выбираться по:

```text
edition
```

При необходимости использовать:

```text
rules/2014/
rules/2024/
```

---

# 65. НИКОГДА НЕ ЗАШИВАТЬ МЕХАНИКУ В UI

React-компоненты только отображают данные.

Игровая механика должна находиться в domain/rules.

---

# 66. АВТОМАТИЧЕСКИЙ РАСЧЁТ ПЕРСОНАЖА

Автоматически рассчитывать:

* модификаторы характеристик;
* бонус мастерства;
* спасброски;
* навыки;
* пассивное восприятие;
* КД;
* инициативу;
* DC заклинаний;
* бонус атаки заклинаниями;
* ячейки заклинаний;
* ресурсы.

---

# 67. ИСТОЧНИКИ СПОСОБНОСТЕЙ

Каждый модификатор должен знать источник.

Например:

```text
Source:
Class
Subclass
Species
Background
Feat
Item
Spell
Condition
Homebrew
```

Это позволит Rule Engine корректно объединять эффекты.

---

# 68. EFFECT SYSTEM

Желательно создать универсальную систему:

```text
Effect
```

Например:

```text
Modifier
Resistance
Immunity
Advantage
Disadvantage
Resource
Bonus
Override
```

Это позволит позже автоматизировать огромное количество механик.

---

# 69. РЕЖИМ ИГРОВОЙ СЕССИИ

Создать:

```text
Session Mode
```

На одном экране мастер видит:

* участников;
* инициативу;
* HP;
* AC;
* состояния;
* концентрацию;
* раунд;
* активный ход;
* заметки;
* быстрые броски;
* быстрый поиск;
* правила.

---

# 70. DM SCREEN

Создать цифровой экран мастера.

Панели:

```text
Инициатива
Персонажи
Монстры
NPC
Правила
Состояния
Заметки
Кубы
```

Панели можно переставлять.

---

# 71. CHARACTER DASHBOARD

На главном экране персонажа:

* портрет;
* имя;
* класс;
* уровень;
* HP;
* AC;
* характеристики;
* навыки;
* оружие;
* ресурсы;
* заклинания;
* состояния.

---

# 72. ДИЗАЙН

Не копировать визуальный дизайн D&D Beyond.

Создать оригинальный современный RPG-интерфейс.

Поддерживать:

```text
Светлая тема
Тёмная тема
```

---

# 73. DESKTOP

Desktop layout:

```text
Sidebar слева
Top Search
Content Area
Context Panel
```

---

# 74. MOBILE

Mobile:

```text
Bottom Navigation
```

Интерфейс должен быть адаптивным.

---

# 75. TECH STACK

Предпочтительный стек:

```text
TypeScript
React
Next.js
Tailwind CSS
```

---

# 76. DATABASE

Основная БД:

```text
PostgreSQL
```

Для локальной разработки:

```text
SQLite
```

если архитектура ORM это позволяет.

---

# 77. ORM

Использовать:

```text
Prisma
```

или равноценный type-safe ORM.

---

# 78. VALIDATION

Использовать:

```text
Zod
```

или эквивалент.

---

# 79. TYPESCRIPT

Обязательно:

```text
strict = true
```

Не использовать `any`, если этого можно избежать.

---

# 80. SEARCH ENGINE

Для первой версии:

```text
PostgreSQL Full Text Search
```

Создать abstraction layer, чтобы в будущем можно было заменить его специализированным search engine.

---

# 81. LOCAL-FIRST

Основные возможности должны работать без интернета.

Офлайн пользователь должен иметь возможность:

* читать Compendium;
* использовать персонажей;
* создавать персонажей;
* использовать заклинания;
* пользоваться бестиарием;
* вести кампанию;
* проводить бой;
* пользоваться кубами;
* редактировать Homebrew.

---

# 82. CLOUD READY

Архитектура должна предусматривать:

```text
User
Account
Cloud Sync
Campaign Sharing
```

Но первая локальная версия может работать без регистрации.

---

# 83. БАЗА ДАННЫХ РЕДАКЦИЙ

Не создавать полностью отдельные БД 2014 и 2024.

Использовать общую архитектуру:

```text
Spell
Monster
Class
Feat
Item
...
      ↓
Edition
      ↓
SourceBook
```

---

# 84. ID

Использовать стабильные:

```text
UUID
```

Никогда не использовать название сущности как Primary Key.

---

# 85. ВЕРСИОНИРОВАНИЕ ДАННЫХ

Каждая запись:

```text
createdAt
updatedAt
contentVersion
errataVersion
```

---

# 86. ERRATA

При изменении официальной записи:

не удалять старую версию.

Хранить историю.

---

# 87. DATA REVISION

Создать:

```text
ContentRevision
```

Она должна позволять посмотреть:

```text
что изменилось
когда
из какого источника
```

---

# 88. SRD IMPORT PIPELINE

Не вводить тысячи записей вручную в код.

Использовать:

```text
data/raw/
```

Например:

```text
data/
  raw/
    srd-2014/
    srd-2024/
```

---

# 89. PIPELINE

```text
Source
↓
Parser
↓
Normalizer
↓
Localization Layer
↓
Validator
↓
Database Import
↓
Search Index
```

---

# 90. ЛОКАЛИЗАЦИЯ ПРИ ИМПОРТЕ

Русский перевод не должен происходить каждый раз в runtime.

Переведённые данные должны храниться непосредственно в БД.

---

# 91. ADMIN DATA MANAGER

Создать внутренний инструмент:

```text
Data Manager
```

Функции:

```text
Import Dataset

Validate Dataset

Validate Russian Localization

Check Duplicate IDs

Check Broken References

Compare Editions

Validate Terminology

Generate Search Index

Find Missing Translations

Find Conflicting Translations
```

---

# 92. ПОЛЬЗОВАТЕЛЬСКИЕ ПЕРЕВОДЫ

Создать:

```text
LocalizationOverride
```

Поля:

```text
entityId
field
originalValue
customValue
userId
```

Пользователь может использовать собственный вариант перевода без изменения оригинальных данных.

---

# 93. ЕДИНИЦЫ ИЗМЕРЕНИЯ

Добавить настройку:

```text
Оригинальные единицы
Метрические единицы
```

Внутренняя БД должна хранить каноническое значение.

Не допускать накопления ошибок округления.

---

# 94. BACKUP

Создать:

```text
Экспорт резервной копии
Импорт резервной копии
```

Резервная копия включает:

* персонажей;
* кампании;
* NPC;
* задания;
* Homebrew;
* настройки;
* коллекции;
* заметки;
* пользовательские переводы.

---

# 95. БЕЗОПАСНОСТЬ ИМПОРТА

Не выполнять код из Homebrew-пакетов.

Проверять:

```text
file size
file type
JSON schema
IDs
references
MIME
paths
```

Защищаться от:

```text
path traversal
malformed JSON
duplicate IDs
broken references
```

---

# 96. PERFORMANCE

Compendium может содержать тысячи или десятки тысяч объектов.

Использовать:

* pagination;
* lazy loading;
* virtual scrolling;
* indexes;
* server filtering;
* cached search;
* incremental loading.

---

# 97. АРХИТЕКТУРА ПРОЕКТА

Использовать feature-based architecture.

Пример:

```text
src/

  app/

  features/
    characters/
    spells/
    monsters/
    classes/
    subclasses/
    species/
    backgrounds/
    feats/
    items/
    encounters/
    campaigns/
    quests/
    npcs/
    homebrew/
    rules/
    compendium/
    search/

  entities/

  domain/
    rules/
      2014/
      2024/

  shared/

  database/

  services/

  localization/

  imports/

  tests/
```

---

# 98. НЕ СОЗДАВАТЬ MONOLITH COMPONENTS

Не помещать всю логику в:

```text
App.tsx
```

или один огромный файл.

Разделять:

UI
domain
database
services
validation
business logic.

---

# 99. API

Создать внутренний API.

Например:

```text
/api/spells
/api/monsters
/api/classes
/api/items
/api/characters
/api/campaigns
/api/encounters
```

---

# 100. READ-ONLY ОФИЦИАЛЬНЫЕ ДАННЫЕ

Встроенные SRD-данные:

```text
read-only
```

Homebrew:

```text
editable
```

---

# 101. ТЕСТЫ

Создать:

```text
Unit Tests
Integration Tests
Database Tests
```

---

# 102. ОСОБЕННО ВАЖНЫЕ ТЕСТЫ

Проверять:

* модификаторы характеристик;
* бонус мастерства;
* спасброски;
* навыки;
* AC;
* spell save DC;
* spell attack bonus;
* spell slots;
* multiclass;
* HP;
* leveling;
* short rest;
* long rest;
* encounter state;
* initiative;
* edition differences;
* русский поиск;
* aliases;
* validation русской локализации.

---

# 103. UI НА РУССКОМ

Не использовать:

```text
Save
Cancel
Delete
Edit
Search
Settings
Filter
```

Показывать:

```text
Сохранить
Отмена
Удалить
Изменить
Поиск
Настройки
Фильтры
```

---

# 104. ТЕХНИЧЕСКИЙ КОД

Классы, функции и интерфейсы можно именовать на английском:

```text
Spell
Monster
Character
calculateArmorClass()
```

Это предпочтительно.

Но пользовательский интерфейс — полностью русский.

---

# 105. README

Создать полноценный:

```text
README.md
```

Он должен содержать:

* назначение проекта;
* архитектуру;
* требования;
* установку;
* запуск;
* build;
* dev mode;
* структуру каталогов;
* БД;
* миграции;
* импорт данных;
* импорт SRD;
* локализацию;
* Homebrew;
* backup;
* тестирование.

---

# 106. ЛИЦЕНЗИИ

Создать:

```text
THIRD_PARTY_LICENSES.md
```

Отдельно разделить:

```text
Application Code

SRD Content

Licensed Content

User Imported Content

Homebrew
```

---

# 107. ПЕРВЫЕ ЭТАПЫ РАЗРАБОТКИ

## PHASE 1 — FOUNDATION

Реализовать:

* проект;
* UI shell;
* БД;
* Edition;
* SourceBook;
* Spell;
* Monster;
* русский интерфейс;
* русский поиск;
* import pipeline;
* Data Manager.

---

# 108. PHASE 2 — COMPENDIUM

Добавить:

* Classes;
* Subclasses;
* Species/Races;
* Backgrounds;
* Feats;
* Equipment;
* Weapons;
* Armor;
* Magic Items;
* Conditions;
* Rules.

---

# 109. PHASE 3 — CHARACTER SYSTEM

Добавить:

* Character Builder;
* Character Sheet;
* Level Up;
* Multiclass;
* Inventory;
* Spellbook;
* Resources;
* Rest.

---

# 110. PHASE 4 — DM TOOLS

Добавить:

* Campaign Manager;
* NPC Manager;
* Quest Manager;
* Locations;
* Encounter Builder;
* Initiative Tracker;
* Session Mode;
* DM Screen.

---

# 111. PHASE 5 — HOMEBREW

Добавить:

* editors;
* Clone → Edit;
* packages;
* import;
* export;
* Collections.

---

# 112. PHASE 6 — ADVANCED

Добавить:

* сравнение редакций;
* расширенный Rule Engine;
* Effect System;
* advanced search;
* cloud-ready architecture;
* campaign sharing architecture.

---

# 113. ПОРЯДОК НАЧАЛА РАБОТЫ

Сначала выполни:

```text
1. Анализ требований.
2. Architecture Overview.
3. ER Diagram.
4. Database Design.
5. TypeScript Domain Models.
6. Структуру каталогов.
7. Database Schema.
8. Migration Strategy.
9. Import Architecture.
10. Localization Architecture.
11. Rule Engine Architecture.
12. План Phase 1.
```

После этого:

**сразу переходи к реализации.**

Не останавливайся только после проектирования.

---

# 114. РЕАЛЬНЫЙ КОД

Создавай реальные:

* файлы;
* компоненты;
* схемы;
* миграции;
* API;
* сервисы;
* тесты;
* документацию.

Не заменяй рабочую реализацию псевдокодом.

---

# 115. ПОСЛЕ КАЖДОГО КРУПНОГО ЭТАПА

Запускай:

```text
typecheck
lint
tests
build
```

Исправляй обнаруженные ошибки перед продолжением.

---

# 116. НЕ ПРИДУМЫВАТЬ НЕСУЩЕСТВУЮЩИЕ ДАННЫЕ

Если официальные игровые данные не были предоставлены или не входят в разрешённый dataset:

не выдумывать их.

Создать структуру и placeholder/import mechanism.

---

# 117. ПРИОРИТЕТ ТОЧНОСТИ

Игровые цифры и правила не должны изменяться при локализации.

Перевод не должен менять механику.

---

# 118. РУССКАЯ БАЗА ЯВЛЯЕТСЯ ОСНОВНОЙ ПОЛЬЗОВАТЕЛЬСКОЙ БАЗОЙ

Английский — технический слой.

Русский — продуктовый слой.

Архитектура должна отражать этот принцип на всех уровнях:

```text
Database
Search
UI
Filters
Compendium
Character Sheet
DM Tools
Homebrew
```

---

# 119. ГОТОВНОСТЬ К ПУБЛИКАЦИИ

Игровая сущность не считается готовой для пользовательской базы, если:

```text
translationStatus != Approved
```

Для dev-mode допускаются другие статусы.

---

# 120. ФИНАЛЬНОЕ ТРЕБОВАНИЕ

Конечный результат должен быть полноценным русскоязычным приложением уровня:

```text
D&D Compendium
+
Character Builder
+
Character Sheet
+
Spellbook
+
Bestiary
+
Encounter Builder
+
Initiative Tracker
+
Campaign Manager
+
DM Screen
+
Homebrew Manager
+
Rules Reference
+
2014/2024 Edition Comparison
```

Всё это должно работать как единая система.

Главные принципы проекта:

```text
Русский язык прежде всего.

Точная игровая механика.

Поддержка 2014 и 2024 одновременно.

Модульность.

Офлайн-работа.

Безопасный импорт.

Homebrew.

Удобство для игрока.

Удобство для мастера.

Расширяемость.

Чёткое разделение официального, лицензированного, пользовательского и Homebrew-контента.
```

# НАЧИНАЙ РАЗРАБОТКУ

Не ограничивайся ответом с рекомендациями.

После архитектурного анализа создай структуру реального проекта и приступай к реализации **Phase 1**.

При каждом техническом решении отдавай предпочтение:

1. расширяемости;
2. строгой типизации;
3. поддерживаемости;
4. корректности правил;
5. русской локализации;
6. возможности дальнейшего расширения базы.

Если требуется выбрать между быстрым временным решением и правильной расширяемой архитектурой, выбирай расширяемую архитектуру, если это не делает проект неоправданно сложным.
