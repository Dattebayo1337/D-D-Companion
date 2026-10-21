# Бестиарий и справочники — 17 сентября 2026

49 тестов пройдены; TypeScript, ESLint и production build успешны. Проверены 130 контрольных сумм исходников, полный состав индексов бестиария и магических предметов, все 24 таблицы классов 1–20, связи 24 подклассов, фильтры бестиария с пагинацией, повторный импорт и поиск. Аудит рабочей базы: 2526 записей, ошибок нет. Повторный импорт пропускает все 2519 записей SRD. HP и AC всех 647 существ совпадают между английскими структурированными данными и русским текстом.

В браузере проверены открытие справочника классов, карточка варвара 2024 с таблицей 1–20, переход к пути берсерка, поиск аболета и полный русский блок характеристик. На ширине 639 пикселей горизонтального переполнения страницы нет.

# Проверка расширения SRD — 17 сентября 2026

42 теста пройдены; TypeScript, ESLint и production build успешны. Проверены контрольные суммы 16 исходников, соответствие обоим каталогам, все уровни 0–9, разные правила редакций, дистанции, компоненты, ритуалы и концентрация. Повторная сборка и импорт: 319 + 339 записей пропущены как идентичные, дублей нет. Проверка рабочей базы: 665 записей, без ошибок локализации (658 SRD + 7 Homebrew). API-пагинация вернула ровно 319 и 339 уникальных записей соответствующих источников. В браузере проверены поиск «Лечение ран», карточка 2024 с 2d8 и касанием, полное описание и таблица «Телепорта».

## Предыдущая проверка основы приложения

# Проверка Phase 1

Результат: 37 тестов пройдено; typecheck, lint, production build и HTTP smoke — успешно.

Дата: 17 сентября 2026. Среда: Windows, Node 24.19, Next.js 16.3.5, Prisma 6.19, SQLite.

## Автоматические проверки

- TypeScript strict: `node node_modules/typescript/bin/tsc --noEmit`.
- ESLint: `node node_modules/eslint/bin/eslint.js .`.
- Unit/integration/database: `pnpm test`, отдельная временная БД, реальная SQL-миграция.
- Production: `node node_modules/next/dist/bin/next build --webpack`.
- HTTP: `node scripts/smoke.mjs` при работающем локальном сервере.
- Локализация учебного набора: `pnpm validate:ru`, без замечаний.

Тесты включают повторный импорт без дубликатов, сохранение старого снимка, запрет понижения версии, read-only официальных записей, FK, ранний и поздний rollback, видимость только Approved, поиск по русским формам/aliases/английскому/транслитерации/опечатке, enum/JSON/size validation, Origin/MIME, экспорт и переиндексацию.

## Проверка браузера

Проверены: загрузка главной и реальных счётчиков из БД, список заклинаний, фильтры 2014 + ритуал, карточка заклинания, глобальный запрос «дракона» → «Чернильный дракончик», русский stat block, выбор JSON-файла в менеджере. UI-проверка выявила несовпадение внутреннего localhost и исходного 127.0.0.1 в проверке Origin: исправлено сопоставлением Origin с фактическим Host, добавлены unit и HTTP regression tests.

Проверка мобильной ширины 390 выявила доступность скрытой боковой панели для фокуса; закрытая панель теперь имеет visibility:hidden. Повторная проверка подтвердила отсутствие горизонтального переполнения, скрытие бокового меню и работу нижней навигации. Мобильное меню и тёмная тема проверены визуально. После исправления Origin операция переиндексации через браузер успешно обработала 7 записей.

## Особенности окружения

В этой сессии Node не может создавать дочерние процессы с pipe stdio (EPERM), хотя запуск с inherited stdio разрешён. Поэтому Prisma SQL diff и применение миграций выполнялись через штатный schema-engine JSON-RPC из PowerShell; SQL сгенерирован из схем, не написан вручную. В SQLite есть штатная таблица `_prisma_migrations` с успешной миграцией. Дополнительные адаптеры запуска из рабочего каталога `work/` не нужны пользователю в обычном терминале и не входят в исходный архив.

Next.js настроен на использование TypeScript API и worker threads, без отключения проверки типов. Тестовый runner не требует esbuild subprocess.

## Ограничения проверки

PostgreSQL-схема и миграции сгенерированы, поисковый адаптер реализован, но live PostgreSQL недоступен и не был проверен. Большие нагрузки, точность сторонних переводов, cloud sync и игровые механики будущих этапов не сертифицированы этим прогоном. UI не выдаёт учебный Homebrew за официальный контент.

Полный экспорт: 12 735 038 байт, 2526 записей. HTTP-проверка обратного импорта прошла успешно. Совмещённый фильтр «2024 + полёт + иммунитет к огню + легендарные действия» вернул 6 существ. Поиск «Варвар» ставит совпадение названия первым.

Переключение редакций: кнопки 2014/2024 в верхней панели, одна редакция за раз, по умолчанию 2024. Проверено в браузере: запрос «Лечение ран» сохраняется при смене редакции; после перезагрузки сохраняется 2014; справочник показывает 12 классов выбранной редакции без карточек другой. TypeScript, ESLint и production build пройдены.

## Этап 3 — текущая проверка

58 тестов пройдены; строгая проверка TypeScript, ESLint без предупреждений и production-сборка успешны. Дополнительно проверены все 24 класса на уровнях 1–20, прирост хитов и Телосложение, округление мультиклассовых ячеек, разница отдыха 2014/2024, магия договора, расход ячеек и концентрация, одновременная запись по версии и архив/восстановление. Изолированная тестовая БД применяет все три SQL-миграции.

В браузере: создание мага 2024, подготовка «Щита», применение с расходом ячейки, получение урона, повышение до второго уровня и длительный отдых. Проверен мобильный лист. Карточка остаётся открытой при нажатии на её заголовок и закрывается по нажатию на фон либо Escape.

Подробные границы автоматизации и состав реализованного этапа — `PHASE3.md`. PostgreSQL-схема и миграция подготовлены; проверка на работающем PostgreSQL не выполнялась.

Финальная сборка после перезапуска: сохранены уровень 2, 12/12 хитов и 3/3 ячейки первого круга проверочного мага. Карточка «Щит» открывается из его книги. Консоль браузера без ошибок и предупреждений. Созданная агентом проверочная запись удалена по точному UUID и версии; пользовательские данные не затронуты.

## Дополнение предысторий обеих «Книг игрока»

63 теста пройдены; TypeScript, ESLint и production build успешны. В справочнике 2014 — 13 основных предысторий и 5 вариантов, в 2024 — 16 предысторий. Добавлено 29 предысторий и 6 кратких сводок черт происхождения. Полные записи SRD сохранены; новые записи помечены как справочные сводки и содержат ссылки на источники.

Повторный импорт пропускает все 35 записей без дублей. Проверены полнота списков, разделение редакций, выбор новой предыстории при создании персонажа и отклонение предыстории другой редакции.

В браузере production-сборки проверены счётчики 18/16 при переключении редакции, содержимое карточек «Фермер» (2024) и «Рыцарь» (2014), ссылки на источники и закрытие Escape. Приложение перезапущено на http://127.0.0.1:3000/.

## Дополнение по ДнД.су

Добавлено 30 карточек в пяти категориях: 23 для 2014, 7 для 2024. Итог локальной базы: 2591 запись, включая 7 учебных; 666 заклинаний, 650 существ и 1275 справочных записей. Это выбранное дополнение, не полный импорт сайта.

Все 66 тестов, TypeScript и ESLint прошли. Проверены отсутствие дублей с SRD/PHB, точные ссылки на источники, различия редакций, структурированные параметры заклинаний, поиск и доступность новых записей в каталоге мастера персонажа. Повторный импорт: 0 новых, 30 пропущенных, ошибок русской локализации нет.

В работающей production-версии браузером проверены поиск «Преследуемый», 22 предыстории 2014, новые книги в фильтре источников и карточка «Боевой заклинатель» обеих редакций. Поиск 2024 возвращает одну соответствующую карточку. После обновления страницы названия новых источников и ссылки отображаются корректно. Код приложения и схема БД не изменялись; дополнены данные, скрипты и проверки.

## Подклассы PHB и выбор класса

Добавлены 64 записи: 28 для 2014, 36 для 2024. Вместе с SRD: 40 и 48 подклассов. Итог локальной базы — 2655 записей, включая 7 учебных; 1339 справочных записей. Новые карточки — самостоятельные краткие обзоры по ДнД.су со ссылками на источник, не полный текст книги.

68 тестов прошли; TypeScript, ESLint и production-сборка успешны. Проверены распределение подклассов по всем 12 классам каждой редакции, отсутствие дублей, повторный импорт, фильтрация по родителю и редакции, доступность в каталоге персонажа. В локальную базу импортировано 64 записи без ошибок локализации.

В браузере production-версии проверены выбор класса, четыре подкласса воина 2024, переключение редакции с возвратом к классам, восемь школ волшебника 2014, карточка некроманта со ссылкой на источник и возврат с сохранением поиска и фокуса. Приложение перезапущено на порту 3000.

## Содержательные описания подклассов

64 записи обновлены до contentVersion 2 с сохранением UUID и связей персонажей. Для каждой заполнены «Как играется» и reference.features со всеми уровнями, указанными в свойствах. Карточка отображает эти особенности отдельным блоком, превью — суть подкласса. Исправлена особенность Мистического ловкача 2024 на уровне 13: дополнительная цель Подсечки рядом с Волшебной рукой.

68 тестов прошли, включая обновление имитированной версии 1, проверку сохранённого текста и особенностей, полноту ступеней и повторный импорт. TypeScript, ESLint и production-сборка прошли. В браузере проверены суть в списке школ, полный новый обзор некромантии 2014 и блок уровней Мистического ловкача 2024. В локальную базу обновлены 28 + 36 записей без ошибок локализации.

Механические обзоры сверены с указанными в карточках страницами ДнД.су и для 2014 дополнительно с отдельными страницами подклассов DND 5th Edition Wikidot (например, https://dnd5e.wikidot.com/wizard:necromancy и https://dnd5e.wikidot.com/fighter:eldritch-knight). Тексты написаны самостоятельно, рекомендации по стилю игры явно отделены от обзора правил.

## Инструменты мастера — 24 сентября 2026

75 тестов прошли; TypeScript, ESLint и production build успешны. Новые проверки охватывают пороги и множители 2014, бюджеты 2024, смешанные уровни, разделение редакций, воспроизводимость добычи, фильтрацию редкости и источников, отсутствие повторов и сохранение стоимости монет.

В браузере проверены добавление противников, изменение количества и множителя, открытие карточек, раздельные черновики редакций и восстановление добычи после перезагрузки. Контрольный бой 2014: четыре гоблина дают 200 исходного и 400 скорректированного опыта. Контрольный бой 2024: три адские гончие дают 2100 опыта без множителя. Генерация клада с зерном 42 открывает карточки полученных предметов. Консоль браузера без ошибок. Приложение перезапущено на порту 3000.

## Кампании и краткие карточки — 24 сентября 2026

82 теста прошли; TypeScript, ESLint и production build успешны. Проверены циклы локаций, недействительные и повторные ссылки, разрешённые поля, создание/сохранение, конфликт версий, архив/восстановление, импорт копии кампании, ссылки персонажей и смешанные редакции, JSON и защита origin. Краткие описания проверены на всех записях SRD, PHB и дополнения ДнД.су обеих редакций; отдельно — выделение приёмов монстра и отсутствие подмены описаний Homebrew.

В браузере создана смешанная проверочная кампания с локацией, связанным NPC, активным заданием и сессией. Сохранение, отображение активного задания в режиме сессии и восстановление четырёх записей после перезагрузки прошли. Проверен мобильный интерфейс шириной 390 пикселей; исправлено сжатие поиска в панели записей. В карточках «Благословение» и «Волшебник» проверены иконки, блок «Кратко» и ключевые параметры; полный текст сохранён. Консоль браузера без ошибок.

Миграция 0004 применена к рабочей SQLite. PostgreSQL-миграция подготовлена, без проверки на работающем сервере PostgreSQL. Проверочная кампания агента удалена по точному UUID и версии; пользовательские записи не изменялись. Итоговая production-сборка запущена на порту 3000. Первый блок этапа 4 описан в PHASE4.md; боевой трекер и отдельный экран мастера остаются дальнейшими блоками.

## Сохранённые бои и экран мастера — 24 сентября 2026

91 тест прошёл; TypeScript, ESLint и production-сборка успешны. Проверены порядок ходов, инициатива, временные хиты, концентрация обеих редакций, спасброски от смерти, стабилизация, архив, конфликты версий, смешанные кампании, снимки героев без изменений исходных листов, ограничения API и формулы кубов. Краткие описания состояний показывают эффекты вместо вводной фразы.

В браузере проверен бой с двумя адскими гончими и ручным героем: инициатива, начало боя, временные хиты, урон, концентрация, состояние, спасбросок, стабилизация и второй раунд. Перезагрузка восстановила бой. Проверены мобильный трекер, закрепления экрана мастера и история кубов после перезагрузки; преимущество и критический урон дают корректные суммы. Миграция 0005 применена к рабочей SQLite; проверочная запись агента удалена по точному UUID и версии. PostgreSQL не запускался.

## Мастерская, коллекции, тёмная тема и аудит ДнД.су — 24 сентября 2026

97 тестов прошли; TypeScript, ESLint и production-сборка успешны. Новые проверки покрывают шаблоны всех типов, защиту оригиналов, публикацию и русскую локализацию, отсутствие родительского класса, конфликт параллельных версий, порядок и архив коллекций, дубли и недействительные ссылки. ZIP/CSV проверены на сохранение вложенной структуры, кавычек и переносов, повторный импорт, контрольные суммы, небезопасные пути, неподдерживаемые вложения, редакцию, зависимости и чужой origin.

В production-браузере создано правило, сохранено черновиком, опубликовано и добавлено в коллекцию. Коллекция сохранилась после перезагрузки. Экспортированный .dndpack загружен через выбор файла: проверка успешна, повторный импорт — 0 новых / 1 без изменений. Создана авторская копия «Благословения», проверены параметры, предпросмотр и закрытие нажатием снаружи. Две проверочные карточки и одна коллекция удалены по точным UUID и версиям; остальные записи сохранены.

Проверена графитовая тема в мастерской и диалоге карточки, мобильный вид 390 × 844, отсутствие горизонтального переполнения страницы, таблица покрытия в менеджере данных и загрузка её 14 строк. Ошибок в консоли браузера нет. Временный размер окна сброшен.

Миграция 0006 применена к рабочей SQLite. PostgreSQL-схема и миграция подготовлены, живой PostgreSQL не тестировался. Сверены 14 открытых индексов dnd.su / next.dnd.su: база частично покрывает сайт; подробные списки кандидатов сохранены в data/dndsu/coverage-report.json. Для 2648 неавторских карточек проверка локализации не выявила замечаний. Подклассы и сгруппированные правила не объявляются полностью сверенными с дополнительными книгами сайта.

## Дополнение черт — 24 сентября 2026

Добавлены 86 черт; импорт 37 + 49 без ошибок локализации. Все 100 тестов прошли, ESLint и production-сборка завершились успешно. В браузере проверены список из 75 черт редакции 2024 и карточка Актёра: русское описание, требования, категория и ссылка на источник. Полнота PHB 42/75 и отсутствие дублей проверены тестами по снимку каталогов.


## Расы и подклассы дополнений — 1 октября 2026

Импортированы 188 записей. Покрытие проверенного индекса: расы/виды 84/84 и 19/19, подклассы 118/118 и 76/76. Русская локализация без замечаний. Пройдены 104 теста, проверка TypeScript и production-сборка. Пакеты содержат краткие обзоры; вложенные подрасы и полная автоматизация механики остаются за рамками этого наполнения.


UI-проверка 2026-10-01: в редакции 2014 доступен выбор из 13 классов; у Изобретателя показаны 4 подкласса. В редакции 2024 у Артефактора проверены 6 подклассов. В карточке Алхимика подтверждены класс, книга, уровни развития, ссылка на источник и пометка краткого обзора. Production-сборка обновлена и запущена на порту 3000.

Карточки чтения расширены: классы, подклассы, правила и существа — 1040 px, остальные окна — 760 px. Проверено в браузере: Бард при viewport 1280 px — ширина 1040 px, текст 16 px; при 390 px — ширина 390 px, текст 15 px; горизонтального переполнения нет. TypeScript, ESLint Detail.tsx и production build прошли.

Коллегии барда: обновлены 8 карточек, версия 3; проверено разделение духов 2014/2024, развитие на уровнях 3/6/14 и загрузка через работающий API. Пройдено 105 тестов, ESLint изменённых TS-файлов и production build.

Режимы чтения: в браузере проверены «Кратко» → «Подробный обзор» → «Кратко» для коллегии мечей, наличие трёх росчерков и ссылки на точный раздел источника; для барда SRD проверена кнопка «Полное описание» и таблицы. 105 тестов, TypeScript, ESLint изменённых файлов и production build пройдены.

Регрессия коллегии духов 2014: проверены краткое описание и пять пунктов умений; подробная панель содержит 4631 символ и таблицу из 12 строк эффектов плюс заголовок. После прокрутки до scrollTop 2160 переключение на «Кратко» возвращает scrollTop 0, скрывает таблицу и показывает сводку. Пройдены 108 тестов, ESLint изменённых файлов и production build. Исходное пустое состояние в свежем браузере не воспроизведено.

Проверка всех описаний: аудит 2929 записей, пустых кратких текстов 0. Доступны отдельно сохранённые свойства 91 записи; 117 MetadataOnly-записей не имеют дополнительных сведений сверх сводки (98 подклассов, 12 рас/видов, 7 черт). Общий прогон: 109 из 110; одна новая проверка ошибочно предполагала наличие структурированных ячеек у SRD-барда. Проверка исправлена на явный пример с ячейками, все 5 тестов reading-content прошли повторно. TypeScript, ESLint и production build прошли. Отчёт: docs/DESCRIPTION_AUDIT.md.

Лобби: добавочная миграция SQLite применена; схема PostgreSQL прошла prisma validate. Все 115 тестов прошли. Проверены HTTP-запросами: старые приватные API возвращают 401 без сессии и с подделанным cookie, в том числе с заголовком x-middleware-subrequest; игроку недоступен индекс лобби; секреты кампании отсутствуют в JSON игрока. В браузере проверены вход по приглашению, полный лист, приватные заметки мастера, два последовательных сохранения, редактор кампании и создание чистого лобби. Мобильный viewport 390 px: переполнения нет. Временные данные удалены. Docker в этом окружении отсутствует; контейнерное размещение не проверялось и сервер в интернете не создавался.

## Public catalog access — 2026-10-01
116 tests passed; ESLint and production build passed. Anonymous HTTP checks: root, catalog lists, content detail, sources, editions, overview, coverage and loot catalog return 200 without setting cookies. Import history is hidden. Private APIs and catalog POST return 401. Master login now returns to /play; sign-out returns to the public library.

## Personal accounts — 2026-10-01

- 121 automated tests passed. Added account lifecycle, hashed storage, role injection, CSRF/body limits, shared rate limiter, session expiry/revocation generations, one-time recovery and administrator bootstrap coverage.
- Two-account tests cover private character/campaign/battle APIs, cross-owner references and mutations, personal collections, administrator-only publication, owner/player lobby roles and membership removal.
- ESLint completed without warnings; TypeScript passed as part of the production webpack build.
- Live HTTP smoke passed: anonymous library, registration, isolated campaigns, owner/player lobby permissions, administrator restriction and revoked-session rejection.
- Browser verified login with a temporary account, own empty lobby index, account page, logout to the public library and registration form. Temporary QA accounts and their sessions were removed.
- SQLite migrations 0008 and 0009 applied after saving backups/before-accounts-2026-10-01.db. PostgreSQL schema validation passed; PostgreSQL migrations were not executed against a server.
- UI screenshot: ../accounts-preview.png (outside the source archive).
- Public hosting, sustained load tests and email/OAuth integrations were not performed. Deployment scope and limits are documented in ACCOUNTS.md.

## Personal bestiary — 2026-10-01

- 125 automated tests passed, including owner-only CRUD, stale-version conflicts, archive/restore, public/private search filters and pagination, direct-ID protection, CSRF, numeric validation, private collections and battle snapshots.
- Production build and ESLint passed. SQLite migration 0010 applied after backup to backups/before-custom-monsters-2026-10-01.db. PostgreSQL schema validation passed; no PostgreSQL server was used.
- Browser verification: authenticated creation with custom HP, AC, CR, XP and an action; saved brief/full card; reopening the editing form.
- Personal monsters use structured stat rendering; Markdown action descriptions retain paragraphs. They are stored separately from shared catalog content.
- Live HTTP smoke confirmed saved actions, anonymous access denial and creation of a battle using a personal monster. The temporary QA account, monster and battle were removed afterward.

## Map catalog and editor — 2026-10-01

- 127 automated tests passed. Map tests cover template validity, bounds, resizing, escaped SVG labels, player exports without secret markers/notes, account isolation, stale versions, campaign access, archive/restore, CSRF and anonymous API denial.
- Final production build and ESLint passed. PostgreSQL schema validation passed; PostgreSQL migrations were not executed against a server.
- SQLite migration 0011 applied after backup to backups/before-maps-2026-10-01.db.
- Browser verified anonymous templates, creating a personal template copy, placing ordinary and secret markers with keyboard controls, saving, player view, reopening after reload and preserved master notes. The temporary account and its map were removed.
- Screenshot: ../maps-editor.png. Usage, export behavior and current scope: MAPS.md.

## PNG map uploads — 2026-10-01

- 129 automated tests passed, including full PNG decode/re-encode, invalid/truncated/oversized inputs, private image and thumbnail endpoints, catalog responses without binary data, account isolation, campaign ownership, version conflicts, archive/restore and cross-origin upload rejection.
- Final production build and ESLint passed. PostgreSQL schema validation passed; PostgreSQL migrations were not run against a server.
- SQLite migration 0012 applied after backup to backups/before-image-maps-2026-10-01.db. PNGs and thumbnails are stored in the database, not a public folder.
- Browser verified PNG selection, local preview, upload, catalog thumbnail, zoom, fit view and reopening after reload. The temporary QA account and its image were removed.
- Screenshot: ../png-map-preview.png. Usage and upload/storage limits are documented in MAPS.md.

## Android online client — 2026-10-01

- Web: 131 automated tests passed, ESLint and production build passed. New tests cover the anonymous mobile handshake and detached Blob export anchors, origin restrictions and ordinary link behavior.
- Android SDK Platform 35 and Build Tools 35.0.0 installed after the user's explicit license acceptance. Portable JDK 17 and Gradle 8.11.1 used.
- Final Gradle run: testDebugUnitTest, lintDebug and assembleDebug completed successfully. Three JVM tests passed. Lint reports 0 errors and 4 warnings: newer AndroidX available, Back attribute ignored on older APIs, Android 12+ data extraction rules and a localization warning.
- APK signature verified with apksigner (v2); aapt confirms package app.dndcompanion.mobile.debug, version 0.1.0-debug, minimum API 26 and target API 35. Permissions: INTERNET and ACCESS_NETWORK_STATE only.
- Deliverable: ../dnd-companion-android-debug.apk with a SHA-256 sidecar. Debug signing is for testing; no production key or store publication was created.
- No physical-device or emulator run was performed. File selection, downloads, keyboard/insets, lifecycle and authentication must still be exercised on devices. Public hosting was not created; the server URL is configured in the app after deployment.

## General requirements and content audit — 2026-10-02

- Reviewed all 120 numbered requirements against the current code, schemas, documentation and automated checks. Findings and limits: REQUIREMENTS_AUDIT.md. This is not an exhaustive manual UI or rulebook verification.
- Read-only audit of 2929 Content records: no empty generated summaries or descriptions, no localization/terminology/relation errors, no invalid subclass parents. 403 MetadataOnly overviews must not be treated as full rules. 401 records have no separate detail mode; only 117 of those are MetadataOnly.
- Refreshed public dnd.su and next.dnd.su category indexes on 2026-10-02. Subclass coverage retains the separately reviewed 2026-09-24 snapshot. Name matching is candidate coverage, not exact rule coverage.
- Added data:completeness:audit, detailed JSON and per-record CSV; all reports contain completeness caveats. Manually checked the ancient green dragon: actions are in its prose despite an empty structured actions array. Four missing spell class lists belong to demonstration Homebrew.
- Corrected the no-details message so a short SRD record is not declared incomplete merely because its saved text fits in the brief view.
- 131 tests passed in an isolated temporary database. TypeScript, ESLint for changed code and the production webpack build passed. No gameplay data was modified. No claim of full numerical or translation accuracy is made from these automated checks.

## Subclass mechanics review — 2026-10-02

Four 2014 cards updated with 22 separately stored explanation blocks, stable UUIDs and content revisions. 2024 data unchanged. MetadataOnly remains explicit; these are not complete licensed rule texts. SQLite VACUUM INTO backup created before import. Repeat import skipped all 188 records. 132 tests, changed-file ESLint and production build with TypeScript passed. Current description audit: 94 subclasses still without additional details. See SUBCLASS_REVIEW.md for sources, scope and omissions.

## Audit fixes — 2026-10-02

- Added public edition comparison for approved cards: explicit relations in either direction, clearly labelled name candidates, same-category and subclass-parent guards, two columns and changed-fields view. Personal overrides never alter comparison source data.
- Added spell class/subclass/time/range/damage/save/attack filters and monster environment/minimum movement speed. Russian senses and spellcasting are recognised. Incompatible kind filters return no results; filtering precedes pagination. Structured-data coverage remains incomplete and is disclosed in the UI.
- Added account-scoped name/description overrides with original-value tracking, conflict detection, reset, no-store responses and unsaved-edit warnings. Card opening resolves saved personal text. Guest editing rejected; public reading stays open.
- Reviewed and filled 16 SRD spell records (8 per edition). Preserved UUIDs and prose; incremented contentVersion, stored revisions, rebuilt search text. Dedicated maintainer migration accepts exact previous snapshots and commits atomically. Ordinary import remains unable to modify official content. Backup: backups/before-spell-fields-2026-10-02.db. Repeat migration skipped all 16 records.
- 136 automated tests passed in an isolated temporary database. Tests cover candidate visibility, relation direction, comparison differences, personal-text isolation/staleness/conflicts, Russian monster filters, edition-specific healing and migration rollback/idempotence. Changed-code ESLint, TypeScript and production webpack build passed.
- Browser checked anonymous reading, Fireball comparison 2014/2024, changed-fields checkbox, new filter controls, opening Fireball with Dexterity/Fire filters and guest rejection from personal translations. Authenticated editor interaction, mobile layout and every possible comparison have not been manually tested.
- Updated the 120-point requirements matrix without marking the entire audit resolved. Content still has 403 MetadataOnly overviews and 94 subclasses without additional details. Scope and migration instructions: AUDIT_FIXES.md.

## Tabletop companion: reading shelf — 2026-10-02

- Added browser-local favorites (200), recent cards (30), edition filtering, icons/summaries, pagination, explicit removal, retry and JSON export/import. Stored values contain only UUID and edition. Invalid storage is not silently overwritten. Private monster cards and previews are excluded from automatic history.
- Added dashboard shortcuts to rules, characters and campaign sessions. Existing authentication continues to protect personal game data; public reading and bookmarks need no account. This is a connected companion for in-person play, not an offline client database.
- 138 tests passed, including reading-list bounds, deduplication, preservation of favorites when clearing history and import validation. TypeScript, changed-file ESLint and production build passed. After final validation-message/edition guards, focused reading-list tests and production build passed again.
- Browser verified adding Fireball to favorites, reload persistence, opening from the shelf, removing the test favorite and viewing recent history. Screenshot inspected for desktop layout. File-picker import, cross-device transfer and physical Android testing were not performed. See TABLETOP.md.

## Session desk — 2026-10-02

- Replaced the campaign live overview with a session selector and separate plan, in-session notes and summary fields. Uses existing campaign drafts and versioned save, with no schema migration or new permission surface.
- Added material attachment, forward/reverse relation lookup, text search, direct editing and collapsed NPC secrets. Archived sessions/materials are excluded. General campaign notes, active quests and heroes remain available. Home shortcut now opens this mode after choosing a campaign.
- 140 tests passed. New tests cover reverse relations, archive exclusion and separate session/campaign text rendering. TypeScript, changed-file ESLint and production build passed. No authenticated manual browser editing was performed. Deployment remains local.

## Player tabletop sheet — 2026-10-02

- Added a default tabletop tab to the character sheet: HP/temp HP, validated damage/healing inputs, concentration, current conditions, exhaustion/death-save summary, resource spend/return, rest confirmation, separate normal/pact slots and prepared/always spell descriptions.
- Reuses existing character commands and version/ownership checks. Parent archive/busy fieldset continues to block mutations. Full inventory, spell casting, conditions and feature editors remain accessible. Damage adjustments are manual before input, and temporary HP does not stack. No new schema or combat engine.
- 141 tests passed. New server-rendering coverage checks slot remainder, prepared-vs-known spell visibility and bounded note excerpts. Changed-file ESLint, TypeScript and production build passed. Authenticated browser interaction and physical-phone layout were not manually tested. Local server restarted and HTTP 200 verified.

## Server and browser backups — 2026-10-02

- Added SQLite snapshot, inspection and explicit stopped-server restore commands. Existing backup files are never overwritten. Restore validates schema, rejects journal files and saves the current database before replacement. Tested on isolated temporary databases, never by restoring production.
- Added browser backup export/import in Settings with key allowlist, JSON validation, UTF-8 byte limit, review/confirmation and rollback on storage failure. Server records and browser drafts remain separate. Reload is requested after import.
- Full suite: 143 passed. Added tests for backup restoration, safety snapshot, malformed files, existing destination and missing stopped-server acknowledgment. After strengthening byte limits and adding journal/schema mismatch checks, the two focused tests passed again. TypeScript, changed-file ESLint and production webpack build passed.
- Created and inspected backups/tabletop-2026-10-02.db (44,498,944 bytes). Local server restarted; HTTP 200 and the new Settings block verified in browser. Download-event observation timed out, so browser file download/import and physical Android behavior remain unconfirmed.
- SQLite backup is an administrator CLI; PostgreSQL restore and a single combined portable archive are not implemented. Instructions: BACKUP.md. The entire requirements audit is not marked complete.

## Seven tabletop additions — 2026-10-02

- Added separately authored draft/published lobby handouts with owner-checked PNG map attachment and membership-checked no-store image delivery. Public printing includes only published materials. Campaign secrets are not copied into handouts automatically.
- Added append-only shared journal with server-assigned author/time, search and export. Added GM-controlled group ledger with recipient/reason, current balances, immutable history and insufficient-stock rejection. Optimistic lobby versions prevent lost writes. Closed lobbies reject writes; revoked participants lose access.
- Added previous-session recap, current goal and unresolved questions, plus cross-category campaign search with archive toggle. Existing campaign draft/version save remains authoritative.
- Added print previews for full character sheets, prepared/always spells, GM session notes and published handouts. Print styles isolate the preview and expand details. Physical printer/PDF output and authenticated UI flows were not manually exercised.
- Added explicit anonymous snapshot saving to IndexedDB (200 cards) and a minimal static Service Worker reader. Only three static reader assets are cached; no API/account/campaign pages. Saved cards retain descriptions, structured details, source, license, edition/version/date and MetadataOnly limitations. No private text overlays or implicit caching of private monsters.
- Full suite: 147 tests passed. New coverage checks publication privacy, image ownership, membership/revocation/closed state, journal authorship, stale writes, treasury balances, campaign search/recap fields and all 12 Spirit Bard stories in offline snapshots. TypeScript, changed-file ESLint and webpack production build passed. PostgreSQL schema validation passed without a live database.
- Applied SQLite migration 0013_tabletop after backups/before-tabletop-seven-2026-10-02.db. Existing content records were not rewritten. PostgreSQL equivalent migration is supplied.
- Browser verified saving Fireball 2014 (1 saved, 0 failed), loading offline.html, stopping the project server, reloading the static reader and reading the complete saved spell with parameters/source/license. Screenshot: outputs/offline-reading.jpg. Server restarted and HTTP 200 confirmed. Physical Android, full multi-account browser workflow and actual paper printing remain untested.
- Updated packaging to include public assets, including the offline reader. Instructions and limits: TABLETOP_GROUP.md. This delivers the seven agreed additions, not every remaining requirement in the original master specification.

## Android 0.2 and iOS source project — 2026-10-02

- Android now routes window.print through its same-origin, main-frame WebMessage listener into Android PrintManager. Added offline-reader menu/error-screen access and text/plain export support. Built versionCode 2 / versionName 0.2.0-debug with existing SDK/JDK. JVM 3/3, lintDebug and assembleDebug passed; lint reports 0 errors / 4 warnings. apksigner verified the APK v2 signature.
- Added a UIKit/WKWebView iPhone/iPad Xcode project, Swift URL/origin policy, compatible-server probe without redirects, settings and data reset, JS dialogs, same-origin export/share bridge, native printing, and independent offline-card storage/reader. Web offline saving awaits the iOS native write reply. Added privacy manifest, generated icon sizes from the existing SVG, shared Xcode scheme, Swift policy tests and Mac build.sh.
- Full web suite: 148 tests passed. Additional bridge coverage exercises detached downloads, foreign-origin refusal, print dispatch and offline acknowledgment. TypeScript, changed JS/TS ESLint and webpack production build passed; focused mobile tests passed again after a test lint fix.
- iOS XML plists/manifest/scheme were parsed successfully on Windows. No Swift compiler, iOS SDK, Xcode or Apple signing environment is available here. Swift compilation, iOS simulator/device behavior and IPA export are NOT verified or claimed complete. No App Store or Play publication performed.
- Physical-device checks, Android System WebView offline behavior and native printer/PDF flows remain to be done. Browser offline reading was verified separately in the previous stage. See docs/MOBILE.md and ios/README.md.
