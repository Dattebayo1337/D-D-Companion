# Лицензии и происхождение

## Application Code

Код приложения создан для владельца проекта. Отдельная лицензия на публичное распространение этого кода пока не назначена. Перед публикацией владелец должен выбрать её. Торговые марки Dungeons & Dragons и D&D принадлежат их правообладателям; проект не заявляет официальную связь с ними.

Прямые зависимости имеют собственные условия (точные установленные версии закреплены в pnpm-lock.yaml):

| Пакет                                   | Лицензия   |
| --------------------------------------- | ---------- |
| Next.js, React, React DOM               | MIT        |
| TypeScript, Prisma и @prisma/client     | Apache-2.0 |
| Zod, Tailwind CSS, @tailwindcss/postcss | MIT        |
| Lucide React                            | ISC        |
| snowball-stemmers                       | ISC        |
| ESLint, eslint-config-next, @types/\*   | MIT        |

Транзитивные пакеты сохраняют свои LICENSE/NOTICE в node_modules; при перераспространении бинарной сборки необходимо включить их обязательные уведомления. Lockfile не является заменой лицензионным текстам.

## SRD Content

Включены тексты заклинаний, бестиария и справочников SRD 5.1 и SRD 5.2.1, Wizards of the Coast LLC, и русский перевод OmnisGM: https://github.com/OmnisGM-App/OmnisGM-Rules/tree/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5. Лицензия: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/. Исходные LICENSE.md, LICENSE-RU.md и Legal сохранены в data/raw/srd-2014/omnisgm и data/raw/srd-2024/omnisgm. Изменения: преобразование Markdown в JSON, извлечение метаданных, перевод двух заголовков Table, удаление четырёх дублирующих английских названий из русских статблоков; подробности в docs/SRD_DATA.md.

# Legal Information

The System Reference Document 5.1 is provided to you free of charge under the terms of the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/legalcode) ("CC-BY-4.0"). You are free to use this content in any manner permitted by that license as long as you include the following attribution statement in your own work:

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Please do not include any other attribution regarding Wizards other than that provided above. You may, however, include a statement on your work that it is "compatible with fifth edition" or "5E compatible."

Section 5 of CC-BY-4.0 includes a Disclaimer of Warranties and Limitation of Liability that limits our liability to you.

# Legal Information

The System Reference Document 5.2.1 (“SRD 5.2.1”) is provided to you free of charge by Wizards of the Coast LLC (“Wizards”) under the terms of the Creative Commons Attribution 4.0 International License (“CC-BY-4.0”). You are free to use the content in this document in any manner permitted under CC-BY-4.0, provided that you include the following attribution statement in any of your work:

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Please do not include any other attribution to Wizards or its parent or affiliates other than that provided above. You may, however, include a statement on your work indicating that it is “compatible with fifth edition” or “5E compatible.”

Section 5 of CC-BY-4.0 includes a Disclaimer of Warranties and Limitation of Liability that limits our liability to you.

## Licensed Content

Лицензированные книги не включены. Контракт контента предусматривает license/source/sourceBook/sourcePage. Пользователь отвечает за наличие разрешения на использование и распространение такого материала.

## User Imported Content

Материал остаётся под своей исходной лицензией. Импорт не передаёт прав и не публикует его в сеть. Не выполняются автоматическое копирование закрытых книг, обход защиты или загрузка с защищённых сайтов.

## Homebrew

`data/examples/homebrew.json` — оригинальный демонстрационный материал, подготовленный для этого проекта и предоставляемый как CC0-1.0. Он не является официальным SRD и не предназначен как проверенный игровой баланс. Названия, описания и механика намеренно обозначены в UI как авторский учебный контент.

Пользовательские Homebrew-наборы должны указывать свою лицензию отдельно. Наличие примера CC0 не меняет условия чужих наборов.

Дополнительные преобразования этапа 2 описаны в docs/PHASE2.md. Полные исходные главы и лицензии сохранены без изменений; сопоставления статей зафиксированы в data/srd/reference-mapping-2014.json и reference-mapping-2024.json.

## Справочные сводки «Книг игрока»

`data/phb/` содержит справочные факты и самостоятельные краткие русские изложения механики предысторий и связанных черт. Состав источников и границы покрытия описаны в `docs/BACKGROUNDS.md`; URL указан в каждой записи. Новые записи помечены `MetadataOnly`, не являются полным воспроизведением книг и не объявляются содержимым SRD/CC BY. Права на книги, названия и торговые обозначения Dungeons & Dragons принадлежат Wizards of the Coast. Уведомления о лицензии существующего SRD сохраняются отдельно.

## Справочные сводки по DnD.su

Пакеты data/dndsu содержат самостоятельно написанные краткие сводки механики, библиографические сведения и ссылки на карточки dnd.su/next.dnd.su. Полные переводы страниц, изображения и комментарии не включены. Свободная лицензия сайта не установлена; эти записи не являются SRD и не маркируются CC BY. Права на исходные игровые материалы сохраняются у их правообладателей. См. docs/DNDSU.md.

Пакеты `data/phb/subclasses-2014.json` и `subclasses-2024.json` содержат самостоятельно написанные краткие обзоры недостающих подклассов PHB, сверенные со страницами классов https://dnd.su/class/ и https://next.dnd.su/class/. Они помечены MetadataOnly, не являются SRD или переводом под CC BY и не содержат полного текста особенностей. Каждая карточка сохраняет прямую ссылку на страницу соответствующего класса.
