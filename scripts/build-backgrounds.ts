import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { datasetSchema, type ReferenceEntry } from "../src/entities/content";
import { auditDataset } from "../src/imports/pipeline";
const uuid = (s: string) => {
  const h = createHash("sha256")
    .update("dnd-companion:phb-summaries:" + s)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const date = "2026-09-17T00:00:00.000Z";
const license =
  "Справочные данные и самостоятельное краткое изложение механики. Полный текст книги не включён. Dungeons & Dragons — Wizards of the Coast; это не материал SRD и не перевод по лицензии CC BY.";
type Old = {
  name: string;
  ru: string;
  skills: string;
  tools: string;
  languages?: string;
  gear: string;
  feature: string;
  effect: string;
  variant?: string;
  source?: string;
};
const old: Old[] = [
  {
    name: "Charlatan",
    ru: "Шарлатан",
    skills: "Обман, Ловкость рук",
    tools: "Набор для грима, набор для фальсификации",
    gear: "Красивая одежда, набор для грима, принадлежности выбранной аферы, кошель с 15 зм.",
    feature: "Поддельная личность",
    effect:
      "Есть вторая личность с документами и знакомыми. Документы и письма можно подделывать по образцу документа или почерка.",
  },
  {
    name: "Criminal",
    ru: "Преступник",
    skills: "Обман, Скрытность",
    tools: "Один игровой набор, воровские инструменты",
    gear: "Ломик, тёмная обычная одежда с капюшоном, кошель с 15 зм.",
    feature: "Криминальные связи",
    effect:
      "Надёжный посредник связывает вас с преступной сетью; знакомые курьеры помогают передавать сообщения на расстоянии.",
    source: "https://www.dndbeyond.com/backgrounds/8-criminal-spy",
  },
  {
    name: "Entertainer",
    ru: "Артист",
    skills: "Акробатика, Выступление",
    tools: "Набор для грима, один музыкальный инструмент",
    gear: "Выбранный музыкальный инструмент, подарок поклонника, костюм, кошель с 15 зм.",
    feature: "По многочисленным просьбам",
    effect:
      "Регулярные выступления обеспечивают скромные или комфортные еду и ночлег; узнающие вас зрители обычно настроены дружелюбно.",
  },
  {
    name: "Folk Hero",
    ru: "Народный герой",
    skills: "Уход за животными, Выживание",
    tools: "Один вид инструментов ремесленника, наземный транспорт",
    gear: "Инструменты ремесленника, лопата, железный горшок, обычная одежда, кошель с 10 зм.",
    feature: "Деревенское гостеприимство",
    effect:
      "Простые люди могут укрыть вас и помочь отдохнуть, если вы им не угрожаете. Ради защиты от преследователей они не обязаны рисковать жизнью.",
  },
  {
    name: "Guild Artisan",
    ru: "Гильдейский ремесленник",
    skills: "Проницательность, Убеждение",
    tools: "Один вид инструментов ремесленника",
    languages: "Один на выбор",
    gear: "Инструменты ремесленника, письмо гильдии, дорожная одежда, кошель с 15 зм.",
    feature: "Членство в гильдии",
    effect:
      "Гильдия помогает с жильём, едой, похоронами, контактами и обоснованной правовой защитой. Взносы — 5 зм в месяц; задолженность требуется погасить.",
  },
  {
    name: "Hermit",
    ru: "Отшельник",
    skills: "Медицина, Религия",
    tools: "Набор травника",
    languages: "Один на выбор",
    gear: "Футляр с записями, зимнее одеяло, обычная одежда, набор травника, 5 зм.",
    feature: "Открытие",
    effect:
      "Вы владеете важной тайной, найденной в уединении. Её содержание и влияние на приключение определите вместе с мастером.",
  },
  {
    name: "Noble",
    ru: "Благородный",
    skills: "История, Убеждение",
    tools: "Один игровой набор",
    languages: "Один на выбор",
    gear: "Красивая одежда, кольцо-печатка, родословная, кошель с 25 зм.",
    feature: "Привилегированное положение",
    effect:
      "Происхождение открывает двери высшего общества и позволяет получить аудиенцию местного аристократа. Вместо этого умения можно выбрать трёх небоевых слуг; они не идут в опасные места.",
  },
  {
    name: "Outlander",
    ru: "Чужеземец",
    skills: "Атлетика, Выживание",
    tools: "Один музыкальный инструмент",
    languages: "Один на выбор",
    gear: "Посох, охотничий капкан, охотничий трофей, дорожная одежда, кошель с 10 зм.",
    feature: "Странник",
    effect:
      "Вы хорошо помните карты и расположение местности. При наличии природных ресурсов находите дневной запас пищи и воды для себя и ещё пяти человек.",
  },
  {
    name: "Sage",
    ru: "Мудрец",
    skills: "Магия, История",
    tools: "Нет",
    languages: "Два на выбор",
    gear: "Чёрные чернила, перо, маленький нож, письмо умершего коллеги с нерешённым вопросом, обычная одежда, кошель с 10 зм.",
    feature: "Исследователь",
    effect:
      "Если ответа нет, вы часто знаете, где или у кого его искать. Доступность нужных знаний определяет мастер; поиск может потребовать приключения.",
    source: "https://www.dndbeyond.com/backgrounds/11-sage",
  },
  {
    name: "Sailor",
    ru: "Моряк",
    skills: "Атлетика, Внимательность",
    tools: "Инструменты навигатора, водный транспорт",
    gear: "Дубинка, 50 футов шёлковой верёвки, талисман, обычная одежда, кошель с 10 зм.",
    feature: "Поездка на корабле",
    effect:
      "Знакомая команда может бесплатно перевезти вас и спутников в обмен на работу. Подходящие маршрут и сроки не гарантированы.",
  },
  {
    name: "Soldier",
    ru: "Солдат",
    skills: "Атлетика, Запугивание",
    tools: "Один игровой набор, наземный транспорт",
    gear: "Знак звания, трофей врага, костяные игральные кости или карты, обычная одежда, кошель с 10 зм.",
    feature: "Воинское звание",
    effect:
      "В признающей ваше звание организации младшие чины учитывают ваш авторитет. Можно получать простое имущество или лошадей во временное пользование и доступ в дружественные лагеря.",
    source: "https://www.dndbeyond.com/backgrounds/12-soldier",
  },
  {
    name: "Urchin",
    ru: "Беспризорник",
    skills: "Ловкость рук, Скрытность",
    tools: "Набор для грима, воровские инструменты",
    gear: "Маленький нож, карта родного города, ручная мышь, память о родителях, обычная одежда, кошель с 10 зм.",
    feature: "Городские тайны",
    effect:
      "Вне боя вы и ведомые вами спутники можете перемещаться между городскими местами вдвое быстрее обычного.",
  },
];
const variant = (
  base: string,
  name: string,
  ru: string,
  changes: Partial<Old>,
) => {
  const parent = old.find((x) => x.name === base)!;
  old.push({
    ...parent,
    name,
    ru,
    variant: base,
    source:
      parent.source ??
      `https://dnd5e.wikidot.com/background:${base.toLowerCase().replaceAll(" ", "-")}`,
    ...changes,
  });
};
variant("Criminal", "Spy", "Шпион", {
  effect:
    "Вариант преступника: прежняя работа была разведкой. Связной и способы передачи сообщений сохраняются; уточните, кому вы служили.",
});
variant("Entertainer", "Gladiator", "Гладиатор", {
  gear: "Недорогое необычное оружие вместо музыкального инструмента, подарок поклонника, костюм, кошель с 15 зм.",
  effect:
    "Вариант артиста: выступаете в зрелищных боях. Умение о еде и ночлеге работает через арены и бойцовские площадки. Владение оружием этим не предоставляется.",
});
variant("Guild Artisan", "Guild Merchant", "Гильдейский торговец", {
  tools:
    "Вместо ремесленных инструментов можно выбрать инструменты навигатора или дополнительный язык",
  gear: "Вместо инструментов можно взять мула и телегу; письмо гильдии, дорожная одежда, кошель с 15 зм.",
  effect:
    "Вариант ремесленника для торговой гильдии. Сохраняются гильдейская помощь и взносы 5 зм в месяц.",
});
variant("Noble", "Knight", "Рыцарь", {
  feature: "Слуги",
  effect:
    "Вариант благородного: три помощника вместо привилегированного положения, один — дворянин-оруженосец. Помощники выполняют бытовые задачи, не сражаются и не следуют в очевидно опасные места.",
});
variant("Sailor", "Pirate", "Пират", {
  feature: "Дурная репутация",
  effect:
    "Вариант моряка: можно заменить бесплатную поездку дурной репутацией. В поселениях свидетели мелких проступков часто боятся сообщать властям; это не общая неприкосновенность.",
});
type Modern = {
  name: string;
  ru: string;
  abilities: string;
  feat: string;
  skills: string;
  tools: string;
  gear: string;
  source?: string;
};
const modern: Modern[] = [
  {
    name: "Artisan",
    ru: "Ремесленник",
    abilities: "Сила, Ловкость, Интеллект",
    feat: "Ремесленник",
    skills: "Анализ, Убеждение",
    tools: "Один вид инструментов ремесленника",
    gear: "Выбранные инструменты ремесленника, два кошеля, дорожная одежда и 32 зм",
  },
  {
    name: "Charlatan",
    ru: "Шарлатан",
    abilities: "Ловкость, Телосложение, Харизма",
    feat: "Умелый",
    skills: "Обман, Ловкость рук",
    tools: "Набор для фальсификации",
    gear: "Набор для фальсификации, костюм, красивая одежда и 15 зм",
  },
  {
    name: "Entertainer",
    ru: "Артист",
    abilities: "Сила, Ловкость, Харизма",
    feat: "Музыкант",
    skills: "Акробатика, Выступление",
    tools: "Один музыкальный инструмент",
    gear: "Выбранный музыкальный инструмент, два костюма, зеркало, духи, дорожная одежда и 11 зм",
  },
  {
    name: "Farmer",
    ru: "Фермер",
    abilities: "Сила, Телосложение, Мудрость",
    feat: "Крепкий",
    skills: "Уход за животными, Природа",
    tools: "Инструменты плотника",
    gear: "Серп, инструменты плотника, набор целителя, железный горшок, лопата, дорожная одежда и 30 зм",
  },
  {
    name: "Guard",
    ru: "Стражник",
    abilities: "Сила, Интеллект, Мудрость",
    feat: "Бдительность",
    skills: "Атлетика, Внимательность",
    tools: "Один игровой набор",
    gear: "Копьё, лёгкий арбалет, 20 болтов, выбранный игровой набор, закрытый фонарь, кандалы, колчан, дорожная одежда и 12 зм",
  },
  {
    name: "Guide",
    ru: "Проводник",
    abilities: "Ловкость, Телосложение, Мудрость",
    feat: "Посвящённый в магию: друид",
    skills: "Скрытность, Выживание",
    tools: "Инструменты картографа",
    gear: "Короткий лук, 20 стрел, инструменты картографа, спальник, колчан, палатка, дорожная одежда и 3 зм",
    source: "https://wastedwizardgames.com/dnd/2024/backgrounds/guide/",
  },
  {
    name: "Hermit",
    ru: "Отшельник",
    abilities: "Телосложение, Мудрость, Харизма",
    feat: "Целитель",
    skills: "Медицина, Религия",
    tools: "Набор травника",
    gear: "Боевой посох, набор травника, спальник, книга по философии, лампа, три фляги масла, дорожная одежда и 16 зм",
  },
  {
    name: "Merchant",
    ru: "Торговец",
    abilities: "Телосложение, Интеллект, Харизма",
    feat: "Везунчик",
    skills: "Уход за животными, Убеждение",
    tools: "Инструменты навигатора",
    gear: "Инструменты навигатора, два кошеля, дорожная одежда и 22 зм",
  },
  {
    name: "Noble",
    ru: "Благородный",
    abilities: "Сила, Интеллект, Харизма",
    feat: "Умелый",
    skills: "История, Убеждение",
    tools: "Один игровой набор",
    gear: "Выбранный игровой набор, красивая одежда, духи и 29 зм",
  },
  {
    name: "Sailor",
    ru: "Моряк",
    abilities: "Сила, Ловкость, Мудрость",
    feat: "Драчун",
    skills: "Акробатика, Внимательность",
    tools: "Инструменты навигатора",
    gear: "Кинжал, инструменты навигатора, верёвка, дорожная одежда и 20 зм",
  },
  {
    name: "Scribe",
    ru: "Писец",
    abilities: "Ловкость, Интеллект, Мудрость",
    feat: "Умелый",
    skills: "Анализ, Внимательность",
    tools: "Принадлежности каллиграфа",
    gear: "Принадлежности каллиграфа, красивая одежда, лампа, три фляги масла, 12 листов пергамента и 23 зм",
  },
  {
    name: "Wayfarer",
    ru: "Скиталец",
    abilities: "Ловкость, Мудрость, Харизма",
    feat: "Везунчик",
    skills: "Проницательность, Скрытность",
    tools: "Воровские инструменты",
    gear: "Два кинжала, воровские инструменты, любой игровой набор, спальник, два кошеля, дорожная одежда и 16 зм",
  },
];
// Independent short mechanical summaries; no book prose, illustrations or personality tables.
const feats = [
  [
    "Crafter",
    "Ремесленник",
    "Три владения ремесленными инструментами; немагические покупки дешевле на 20%. После длительного отдыха можно временно изготовить предмет по таблице быстрого изготовления; подробности — в книге.",
  ],
  [
    "Healer",
    "Целитель",
    "Действием с набором целителя расходуется его применение: существо тратит кость хитов и восстанавливает её результат плюс ваш бонус мастерства. Единицы на кубиках такого лечения или лечебного заклинания перебрасываются.",
  ],
  [
    "Lucky",
    "Везунчик",
    "После длительного отдыха очки удачи равны бонусу мастерства. Очко даёт преимущество вашему испытанию к20 либо помеху атаке против вас.",
  ],
  [
    "Musician",
    "Музыкант",
    "Три музыкальных владения. Игра после короткого или длительного отдыха даёт героическое вдохновение слышащим союзникам; их максимум равен бонусу мастерства.",
  ],
  [
    "Tavern Brawler",
    "Драчун",
    "Безоружный урон: 1к4 плюс Сила, единицу можно перебросить. Владение импровизированным оружием. Раз за ход безоружное попадание в действии «Атака» может также оттолкнуть на 5 футов.",
  ],
  [
    "Tough",
    "Крепкий",
    "Максимум хитов увеличивается на удвоенный уровень персонажа, затем ещё на 2 за каждый новый уровень.",
  ],
];
mkdirSync("data/phb", { recursive: true });
for (const year of [2014, 2024] as const) {
  const edition = `5e_${year}` as const,
    sourceId = uuid(`${year}:source`);
  const srd = datasetSchema.parse(
    JSON.parse(readFileSync(`data/srd/references-${year}.json`, "utf8")),
  );
  const entries: ReferenceEntry[] = [];
  const add = (
    name: string,
    ru: string,
    descriptionRu: string,
    source: string,
    category: "Background" | "Feat",
    variant?: string,
  ) => {
    const aliases: Record<string, string[]> = {
      Wayfarer: ["Бродяга"],
      Farmer: ["Крестьянин"],
      Noble: ["Дворянин"],
      Scribe: ["Писарь"],
      Guard: ["Страж"],
      Tough: ["Живучий"],
    };
    entries.push({
      id: uuid(`${year}:${category}:${name}`),
      kind: "Reference",
      nameRu: ru,
      nameOriginal: name,
      descriptionRu,
      descriptionOriginal: "",
      edition,
      sourceBookId: sourceId,
      source,
      sourcePage: "",
      license,
      rulesVersion: `PHB ${year}`,
      translationStatus: "Approved",
      contentOrigin: "MetadataOnly",
      contentVersion: 1,
      errataVersion: "",
      createdAt: date,
      updatedAt: date,
      aliases: aliases[name] ?? [],
      tags: [
        "Книга игрока",
        "Краткая сводка",
        variant ? "Вариант" : "Основная",
      ],
      reference: {
        category,
        parentId: null,
        properties: [
          { nameRu: "Формат", valueRu: "Краткая сводка правил" },
          ...(variant
            ? [
                {
                  nameRu: "Вариант предыстории",
                  valueRu: old.find((x) => x.name === variant)!.ru,
                },
              ]
            : []),
        ],
        features: [],
        progression: [],
      },
    });
  };
  if (year === 2014)
    for (const b of old) {
      add(
        b.name,
        b.ru,
        `**Навыки:** ${b.skills}.\n\n**Инструменты и транспорт:** ${b.tools}.\n\n**Языки:** ${b.languages ?? "Нет дополнительных"}.\n\n**Снаряжение:** ${b.gear}\n\n### ${b.feature}\n${b.effect}`,
        b.source ??
          `https://dnd5e.wikidot.com/background:${b.name.toLowerCase().replaceAll(" ", "-")}`,
        "Background",
        b.variant,
      );
    }
  else {
    for (const b of modern)
      add(
        b.name,
        b.ru,
        `**Характеристики:** ${b.abilities}. Распределите +2 и +1 между двумя из них либо по +1 во все три; итог не выше 20.\n\n**Черта происхождения:** ${b.feat}.\n\n**Навыки:** ${b.skills}.\n\n**Инструменты:** ${b.tools}.\n\n**Снаряжение на выбор:** ${b.gear}; либо 50 зм вместо всего набора.`,
        b.source ??
          `https://roll20.net/compendium/dnd5e/Backgrounds:${b.name}?expansion=32231`,
        "Background",
      );
    for (const [name, ru, description] of feats)
      add(
        name,
        ru,
        description,
        "https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024",
        "Feat",
      );
  }
  const data = datasetSchema.parse({
    schemaVersion: 1,
    name: `Книга игрока ${year} — дополнение предысторий`,
    sources: [
      {
        id: sourceId,
        shortName: `PHB ${year} · Сводки`,
        fullNameRu: `Книга игрока ${year} — справочные сводки`,
        fullNameOriginal: `Player's Handbook (${year}) — reference summaries`,
        edition,
        publisher: "Wizards of the Coast",
        contentType: "MetadataOnly",
        licenseType:
          "Справочные данные; самостоятельные краткие изложения, не полный текст книги",
      },
    ],
    entries,
  });
  const audit = auditDataset(data);
  if (!audit.valid) throw Error(JSON.stringify(audit.issues));
  writeFileSync(
    `data/phb/backgrounds-${year}.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
  const complete = [
    ...srd.entries.filter(
      (e) => e.kind === "Reference" && e.reference.category === "Background",
    ),
    ...data.entries.filter(
      (e) => e.kind === "Reference" && e.reference.category === "Background",
    ),
  ];
  if (
    complete.length !== (year === 2014 ? 18 : 16) ||
    new Set(complete.map((e) => e.nameOriginal)).size !== complete.length
  )
    throw Error("Incomplete or duplicate background roster");
  console.log(
    year,
    complete.length,
    "backgrounds; added",
    data.entries.length,
    "entries",
  );
}
