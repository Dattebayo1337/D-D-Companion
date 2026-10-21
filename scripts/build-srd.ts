import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { datasetSchema, type Spell } from "../src/entities/content";
import { auditDataset } from "../src/imports/pipeline";
const manifest = JSON.parse(
  readFileSync("data/raw/srd-sources.json", "utf8"),
) as { files: { path: string; sha256: string }[] };
for (const file of manifest.files) {
  const actual = createHash("sha256")
    .update(readFileSync("data/raw/" + file.path))
    .digest("hex");
  if (actual !== file.sha256)
    throw new Error("Source checksum mismatch: " + file.path);
}
const stamp = "2026-09-17T00:00:00.000Z";
const reviewed = JSON.parse(
  readFileSync("data/srd/spell-fields-reviewed.json", "utf8"),
) as {
  reviewedAt: string;
  editions: Record<string, Record<string, Partial<Spell["spell"]>>>;
};
const corrections: Record<string, string> = {
  " (Otherworldly Steed)": "",
  " (Giant Insect)": "",
  " (Animated Object)": "",
  " (Draconic Spirit)": "",
  "Table:": "Таблица:",
};
const localize = (s: string) =>
  Object.entries(corrections).reduce(
    (text, [from, to]) => text.replaceAll(from, to),
    s,
  );
const commit = "9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5";
const uuid = (key: string) => {
  const h = createHash("sha256")
    .update("dnd-companion:omnisgm:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const clean = (s: string) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .trim();
const field = (s: string, label: string) => {
  const match = s.match(new RegExp("^\\*\\*" + label + ":\\*\\* (.+)$", "m"));
  if (!match) throw new Error("Missing " + label + " in " + s.slice(0, 100));
  return clean(match[1]);
};
function sections(s: string) {
  return [
    ...s.matchAll(/^### (.+)\n([\s\S]*?)(?=^#{1,3} |$(?![\s\S]))/gm),
  ].filter(
    (m) => m[2].includes("**Components:") || m[2].includes("**Компоненты:"),
  );
}
const classNames: Record<string, string> = {
  Bard: "Бард",
  Cleric: "Жрец",
  Druid: "Друид",
  Paladin: "Паладин",
  Ranger: "Следопыт",
  Sorcerer: "Чародей",
  Warlock: "Колдун",
  Wizard: "Волшебник",
};
for (const year of [2014, 2024]) {
  const root = `data/raw/srd-${year}/omnisgm`;
  const chapter = year === 2014 ? "10_Spells.md" : "07_Spells.md";
  const glossary = year === 2014 ? "16_Glossary" : "14_Glossary";
  const read = (p: string) =>
    readFileSync(`${root}/${p}`, "utf8")
      .replace(/\r\n/g, "\n")
      .replaceAll("**Component:**", "**Components:**");
  const en = sections(read(`en/${chapter}`));
  const ru = sections(read(`ru/${chapter}`));
  const ruMap = new Map(
    ru.map((m) => {
      const name = m[1].match(/^(.+) \(([^)]+)\)$/);
      if (!name) throw new Error(m[1]);
      return [name[2], { name: name[1], body: m[2] }] as const;
    }),
  );
  const rows = read(`en/${glossary}/02_Spells.md`)
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .slice(2)
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((x) => x.trim()),
    );
  const index = new Map(rows.map((r) => [r[0], r]));
  if (
    en.length !== ru.length ||
    en.length !== index.size ||
    ruMap.size !== ru.length
  )
    throw new Error(`Counts ${year}: ${en.length}/${ru.length}/${index.size}`);
  const edition = year === 2014 ? "5e_2014" : "5e_2024";
  const version = year === 2014 ? "5.1" : "5.2.1";
  const sourceId = uuid(`${year}:source`);
  const entries = en.map((m) => {
    const name = m[1],
      eng = m[2],
      rus = ruMap.get(name),
      meta = index.get(name);
    if (!rus || !meta) throw new Error("Unmatched " + name);
    const range = field(eng, "Range");
    const cast = field(eng, "Casting Time");
    const components = field(eng, "Components");
    const duration = field(eng, "Duration");
    const ruComponents = field(rus.body, "Компоненты");
    const description = (s: string, label: string) =>
      clean(s.slice(s.indexOf("**" + label + ":**")).replace(/^.*\n/, ""));
    const rangeKind = /^Self/i.test(range)
      ? "Self"
      : /^Touch/i.test(range)
        ? "Touch"
        : /^Sight/i.test(range)
          ? "Sight"
          : /^Unlimited/i.test(range)
            ? "Unlimited"
            : /^\d/.test(range)
              ? "Distance"
              : "Special";
    const rangeFeet =
      rangeKind === "Distance"
        ? Number(range.match(/[\d,]+/)![0].replaceAll(",", "")) *
          (/mile/i.test(range) ? 5280 : 1)
        : 0;
    const material = (s: string) => s.match(/\(([\s\S]+)\)/)?.[1] ?? "";
    const original = description(eng, "Duration");
    return {
      id: uuid(`${year}:spell:${name}`),
      kind: "Spell",
      nameRu: rus.name,
      nameOriginal: name,
      descriptionRu: localize(description(rus.body, "Длительность")),
      descriptionOriginal: original,
      edition,
      sourceBookId: sourceId,
      source: `https://github.com/OmnisGM-App/OmnisGM-Rules/tree/${commit}/src/dnd/srd-${version === "5.1" ? "5.1" : "5.2"}`,
      license:
        "CC BY 4.0 — Wizards of the Coast LLC; русский перевод OmnisGM. https://creativecommons.org/licenses/by/4.0/",
      rulesVersion: `SRD ${version}`,
      translationStatus: "Approved",
      contentOrigin: "SRD",
      contentVersion: reviewed.editions[year]?.[name] ? 2 : 1,
      createdAt: stamp,
      updatedAt: reviewed.editions[year]?.[name] ? reviewed.reviewedAt : stamp,
      spell: {
        level: meta[1] === "Cantrip" ? 0 : Number(meta[1].match(/\d+/)?.[0]),
        school: meta[2],
        castingTime: /^Bonus Action/i.test(cast)
          ? "BonusAction"
          : /^Reaction/i.test(cast)
            ? "Reaction"
            : /hour/i.test(cast) && !/^Action/.test(cast)
              ? "Hour"
              : /minute/i.test(cast)
                ? "Minute"
                : /^Action/i.test(cast)
                  ? "Action"
                  : "Special",
        castingTimeRu: field(rus.body, "Время накладывания"),
        ritual: /ritual/i.test(cast),
        rangeFeet,
        rangeKind,
        rangeRu: field(rus.body, "Дистанция"),
        components: components
          .split("(")[0]
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        materialComponentRu: material(ruComponents),
        materialComponentOriginal: material(components),
        materialCost: material(components).match(/([\d,]+)\+? (?:GP|gp)/)?.[1]
          ? Number(
              material(components)
                .match(/([\d,]+)\+? (?:GP|gp)/)![1]
                .replaceAll(",", ""),
            )
          : null,
        materialConsumed: /consum/i.test(material(components)),
        durationRu: field(rus.body, "Длительность"),
        concentration: /concentration/i.test(duration),
        classes: meta[3].split(",").map((c) => {
          if (!classNames[c.trim()]) throw new Error(c);
          return classNames[c.trim()];
        }),
        ...reviewed.editions[year]?.[name],
      },
    };
  });
  const dataset = datasetSchema.parse({
    schemaVersion: 1,
    name: `Все заклинания SRD ${version} — русский перевод OmnisGM`,
    sources: [
      {
        id: sourceId,
        shortName: `SRD ${version}`,
        fullNameRu: `Системный справочный документ ${version} — заклинания`,
        fullNameOriginal: `System Reference Document ${version}`,
        edition,
        publisher: "Wizards of the Coast LLC; OmnisGM (Russian translation)",
        contentType: "SRD",
        licenseType: "CC BY 4.0",
      },
    ],
    entries,
  });
  const audit = auditDataset(dataset);
  mkdirSync("data/srd", { recursive: true });
  writeFileSync(
    `data/srd/spells-${year}.json`,
    JSON.stringify(dataset, null, 2) + "\n",
  );
  if (!audit.valid) throw new Error(JSON.stringify(audit));
  console.log(year, entries.length, "заклинаний; проверка пройдена");
}
