import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { datasetSchema, type Content } from "../src/entities/content";
import { auditDataset } from "../src/imports/pipeline";
type Row = {
  year: number;
  category: "SpeciesRace" | "Subclass" | "Class";
  nameRu: string;
  nameOriginal: string;
  source: string;
  url: string;
  summary: string;
  overview?: string;
  contentVersion?: number;
  reviewedAt?: string;
  features?: { nameRu: string; level: number; descriptionRu: string }[];
  parent?: string;
  levels?: number[];
};
const rows = JSON.parse(
  readFileSync("data/dndsu/options-curated.json", "utf8"),
) as Row[];
const books: Record<string, [string, string]> = {
  POA: ["Принцы Апокалипсиса", "Princes of the Apocalypse"],
  VGM: ["Руководство Воло по монстрам", "Volo's Guide to Monsters"],
  SAS: ["Приключения в космосе", "Spelljammer: Adventures in Space"],
  GGR: [
    "Руководство гильдмастера по Равнике",
    "Guildmasters' Guide to Ravnica",
  ],
  AI: ["Корпорация приключенцев", "Acquisitions Incorporated"],
  MTF: ["Том Морденкайнена о врагах", "Mordenkainen's Tome of Foes"],
  OGA: ["Один грунг выше", "One Grung Above"],
  WBW: [
    "Дикая местность за Ведьминым светом",
    "The Wild Beyond the Witchlight",
  ],
  RLW: [
    "Эберрон: восставшие из Последней войны",
    "Eberron: Rising from the Last War",
  ],
  SDQ: [
    "Драконье копьё: тень королевы драконов",
    "Dragonlance: Shadow of the Dragon Queen",
  ],
  MOT: ["Мифические одиссеи Тероса", "Mythic Odysseys of Theros"],
  LR: ["Восстание локата", "Locathah Rising"],
  SCC: ["Стриксхейвен: программа хаоса", "Strixhaven: A Curriculum of Chaos"],
  TP: ["Пакет тортлов", "The Tortle Package"],
  VRGR: [
    "Руководство ван Рихтена по Равенлофту",
    "Van Richten's Guide to Ravenloft",
  ],
  TCE: ["Котёл Таши со всякой всячиной", "Tasha's Cauldron of Everything"],
  MPMM: [
    "Мультивселенная монстров",
    "Mordenkainen Presents: Monsters of the Multiverse",
  ],
  RTW: ["Равенлофт: ужасы внутри", "Ravenloft: The Horrors Within"],
  "RTW, ABH": [
    "Равенлофт и голод Астариона",
    "Ravenloft: The Horrors Within; Astarion’s Book of Hungers",
  ],
  EFA: ["Эберрон: кузница изобретателя", "Eberron: Forge of the Artificer"],
  "Sword Coast Adventurer's Guide": [
    "Руководство искателя приключений по Побережью Меча",
    "Sword Coast Adventurer's Guide",
  ],
  "Xanathar's Guide to Everything": [
    "Руководство Занатара обо всём",
    "Xanathar's Guide to Everything",
  ],
  "Dungeon Master's Guide": ["Руководство мастера", "Dungeon Master's Guide"],
  "Dungeon Master Guide": ["Руководство мастера", "Dungeon Master's Guide"],
  "Explorer's Guide to Wildemount": [
    "Руководство исследователя по Дикогорью",
    "Explorer's Guide to Wildemount",
  ],
  "Fizban's Treasury of Dragons": [
    "Сокровищница драконов Физбана",
    "Fizban's Treasury of Dragons",
  ],
  "Bigby Presents: Glory of the Giants": [
    "Бигби представляет: слава великанов",
    "Bigby Presents: Glory of the Giants",
  ],
  "Forgotten Realms: Heroes of Faerun": [
    "Забытые Королевства: герои Фаэруна",
    "Forgotten Realms: Heroes of Faerun",
  ],
  "Arcana Unleashed": ["Освобождённая магия", "Arcana Unleashed"],
};
for (const [, book] of Object.entries(books)) books[book[1]] = book;
const uuid = (key: string) => {
  const h = createHash("sha256")
    .update("dnd-companion:options:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const license =
  "Самостоятельный краткий обзор по ДнД.су. Полные переводы книг и изображения не включены. Права на исходные материалы принадлежат их правообладателям; это не материал SRD или CC BY.";
for (const year of [2014, 2024] as const) {
  const edition = `5e_${year}` as const;
  const base = datasetSchema.parse(
    JSON.parse(readFileSync(`data/srd/references-${year}.json`, "utf8")),
  );
  const subset: Row[] = [
    {
      year,
      category: "Class",
      nameRu: year === 2014 ? "Изобретатель" : "Артефактор",
      nameOriginal: "Artificer",
      source: year === 2014 ? "TCE" : "EFA",
      url:
        year === 2014
          ? "https://dnd.su/class/137-artificer/"
          : "https://next.dnd.su/class/artificer",
      summary:
        year === 2014
          ? "Магический ремесленник, использующий Интеллект, инструменты и подготовленные заклинания. Создаёт инфузии предметов; специализацию выбирает на третьем уровне. Эта карточка — справочный обзор класса."
          : "Магический ремесленник с подготовленными заклинаниями на Интеллекте и созданием магических предметов. На третьем уровне выбирает специализацию. Эта карточка — справочный обзор класса.",
    },
    ...rows.filter((r) => r.year === year),
  ];
  const entryId = (r: Row) => uuid(`${year}:${r.url}`);
  const classes = new Map(
    base.entries
      .filter((e) => e.kind === "Reference" && e.reference.category === "Class")
      .map((e) => [e.nameOriginal, { id: e.id, nameRu: e.nameRu }]),
  );
  classes.set("Artificer", {
    id: entryId(subset[0]),
    nameRu: subset[0].nameRu,
  });
  const usedBooks = new Map<string, [string, string]>();
  const entries: Content[] = subset.map((r) => {
    const b = books[r.source];
    if (!b) throw Error("Unknown book " + r.source);
    usedBooks.set(b[1], b);
    const variant = r.source === "MPMM";
    const parent = r.parent ? classes.get(r.parent) : undefined;
    if (r.category === "Subclass" && !parent)
      throw Error("Missing class " + r.parent);
    const properties = [
      { nameRu: "Книга", valueRu: b[0] },
      {
        nameRu: "Формат",
        valueRu: r.reviewedAt
          ? "Справочные пояснения механик по уровням; полный текст и исключения — в источнике"
          : "Краткий обзор; точные условия и полные правила — по ссылке на источник",
      },
    ];
    if (r.reviewedAt) properties.push({ nameRu: "Проверка источника", valueRu: r.reviewedAt.slice(0, 10) });
    if (parent) properties.unshift({ nameRu: "Класс", valueRu: parent.nameRu });
    if (r.levels?.length)
      properties.push({
        nameRu: "Уровни развития",
        valueRu: r.levels.join(", "),
      });
    return {
      id: entryId(r),
      kind: "Reference",
      nameRu: r.nameRu + (variant ? " · Мультивселенная монстров" : ""),
      nameOriginal: r.nameOriginal + (variant ? " (MPMM)" : ""),
      descriptionRu: r.summary + (r.overview ? "\n\n" + r.overview : ""),
      descriptionOriginal: "",
      edition,
      sourceBookId: uuid(`${year}:book:${b[1]}`),
      source: r.url,
      sourcePage: "",
      license,
      rulesVersion: String(year),
      translationStatus: "Approved",
      contentOrigin: "MetadataOnly",
      aliases: variant ? [r.nameRu, r.nameOriginal] : [],
      tags: ["Краткий обзор", "Дополнения", b[0]],
      contentVersion: r.contentVersion ?? (r.overview ? 3 : year === 2024 && r.nameOriginal === "Dhampir" ? 2 : 1),
      errataVersion: "",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt:
        r.reviewedAt ?? (r.contentVersion
          ? "2026-10-01T02:00:00.000Z"
          : r.overview
          ? "2026-10-01T01:00:00.000Z"
          : year === 2024 && r.nameOriginal === "Dhampir"
          ? "2026-10-01T00:01:00.000Z"
          : "2026-10-01T00:00:00.000Z"),
      reference: {
        category: r.category,
        parentId: parent?.id ?? null,
        properties,
        features: r.features ?? [],
        progression: [],
      },
    };
  });
  const data = datasetSchema.parse({
    schemaVersion: 1,
    name: `Расы и подклассы дополнений — ${year}`,
    sources: [...usedBooks.values()].map((b) => ({
      id: uuid(`${year}:book:${b[1]}`),
      shortName: `${b[1]} · ${year}`.slice(0, 80),
      fullNameRu: b[0] + " — справочные обзоры " + year,
      fullNameOriginal: b[1],
      edition,
      publisher: "Сводки по справочнику DnD.su",
      contentType: "MetadataOnly",
      licenseType: license,
    })),
    entries,
  });
  const known = new Map(base.entries.map((e) => [e.id, e]));
  const audit = auditDataset(
    data,
    new Map(base.sources.map((s) => [s.id, s.edition])),
    new Set(known.keys()),
    known,
  );
  if (!audit.valid) throw Error(JSON.stringify(audit.issues));
  writeFileSync(
    `data/dndsu/options-${year}.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
  console.log(year, entries.length);
}
