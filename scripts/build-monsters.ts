import { verifySources } from "./srd-source";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { datasetSchema, damages, creatureTypes } from "../src/entities/content";
import { auditDataset } from "../src/imports/pipeline";
const uuid = (s: string) => {
  const h = createHash("sha256")
    .update("dnd-companion:omnisgm:" + s)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
verifySources();
const date = "2026-09-17T00:00:00.000Z";
function field(s: string, label: string, required = false) {
  const v =
    s.match(new RegExp("^- \\*\\*" + label + ":?\\*\\*:? (.+)$", "mi"))?.[1] ??
    "";
  if (required && !v)
    throw new Error("Missing " + label + " " + s.slice(0, 80));
  return v;
}
const sections = (s: string) =>
  [...s.matchAll(/^### (.+)\n([\s\S]*?)(?=^#{1,3} |$(?![\s\S]))/gm)].filter(
    (m) => /\*\*(?:Armor Class|Класс [Дд]оспеха):/.test(m[2]),
  );
const number = (s: string) => Number(s.replace(/[, ]/g, ""));
for (const year of [2014, 2024]) {
  const root = `data/raw/srd-${year}/omnisgm`;
  const files =
    year === 2014
      ? ["15_MonstersA-Z.md"]
      : ["12_MonstersA-Z.md", "13_Animals.md"];
  const read = (lang: string) =>
    files
      .map((f) => readFileSync(`${root}/${lang}/${f}`, "utf8"))
      .join("\n")
      .replace(/\r/g, "");
  const en = sections(read("en")),
    ru = sections(read("ru"));
  const ruMap = new Map(
    ru.map((m) => {
      const h = m[1].match(/^(.+?) \(([A-Za-z].*)\)$/);
      if (!h) throw new Error(m[1]);
      return [
        h[2].split(/[()]/)[0].trim(),
        { name: h[1], body: m[2].trim() },
      ] as const;
    }),
  );
  console.log(year, en.length, ru.length);
  const edition = year === 2014 ? "5e_2014" : "5e_2024",
    version = year === 2014 ? "5.1" : "5.2.1",
    sourceId = uuid(`${year}:monsters:source`);
  const entries = en.map((m) => {
    const name = m[1],
      eng = m[2],
      rus = ruMap.get(name) ?? ruMap.get(name.replace(/ \(.+\)$/, ""));
    if (!rus) throw new Error("No translation " + name);
    const meta = eng.match(/^\*([^*]+)\*/m)![1];
    const ruMeta = rus.body.match(/^\*([^*]+)\*/m)![1];
    const size = meta.split(" ")[0],
      type = creatureTypes.find((t) =>
        new RegExp("\\b" + t + "s?\\b", "i").test(meta),
      );
    const ac = field(eng, "Armor Class", true),
      hp = field(eng, "Hit Points", true),
      speed = field(eng, "Speed", true),
      cr = field(eng, year === 2014 ? "Challenge" : "CR", true);
    const crParts = cr
        .match(/^[\d/]+/)![0]
        .split("/")
        .map(Number),
      challengeRating =
        crParts.length === 2 ? crParts[0] / crParts[1] : crParts[0];
    const scoreRow =
      year === 2014
        ? eng.split("\n").find((l) => /^\|\s*\d+/.test(l))
        : eng.split("\n").find((l) => /^\|\s*SCORE/.test(l));
    if (!scoreRow) throw new Error("Scores " + name);
    const scores = scoreRow
      .split("|")
      .slice(year === 2014 ? 1 : 2, -1)
      .map((x) => Number(x.trim().match(/^\d+/)?.[0]));
    if (scores.length !== 6 || scores.some((x) => !Number.isFinite(x)))
      throw new Error("Scores " + name);
    const abilities = Object.fromEntries(
      ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((k, i) => [k, scores[i]]),
    );
    const movements = Object.fromEntries(
      [
        ["walk", /^([\d]+)/],
        ["fly", /fly (\d+)/i],
        ["swim", /swim (\d+)/i],
        ["climb", /climb (\d+)/i],
        ["burrow", /burrow (\d+)/i],
      ].map(([k, re]) => [k, Number(speed.match(re as RegExp)?.[1] ?? 0)]),
    );
    const damageList = (label: string) =>
      damages.filter((d) =>
        new RegExp("\\b" + d + "\\b", "i").test(field(eng, label)),
      );
    const groups = Object.fromEntries(
      [
        ...rus.body.matchAll(/^#### (.+)\n([\s\S]*?)(?=^#### |$(?![\s\S]))/gm),
      ].map((x) => [x[1], x[2].trim()]),
    );
    const features = (heading: string) =>
      groups[heading]
        ? [{ nameRu: heading, descriptionRu: groups[heading] }]
        : [];
    const spellcasting =
      Object.values(groups).find((v) => /заклинани/i.test(v)) ?? "";
    return {
      id: uuid(`${year}:monster:${name}`),
      kind: "Monster",
      nameRu: rus.name,
      nameOriginal: name,
      descriptionRu: rus.body,
      descriptionOriginal: eng.trim(),
      edition,
      sourceBookId: sourceId,
      source: `https://github.com/OmnisGM-App/OmnisGM-Rules/tree/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-${year === 2014 ? "5.1" : "5.2"}`,
      license:
        "CC BY 4.0 — Wizards of the Coast LLC; русский перевод OmnisGM. https://creativecommons.org/licenses/by/4.0/",
      rulesVersion: `SRD ${version}`,
      translationStatus: "Approved",
      contentOrigin: "SRD",
      contentVersion: 1,
      createdAt: date,
      updatedAt: date,
      monster: {
        size,
        type,
        alignmentRu: ruMeta.split(",").slice(1).join(",").trim() || "Не указан",
        armorClass: Number(ac.match(/^\d+/)![0]),
        armorTypeRu:
          field(rus.body, "Класс [Дд]оспеха").match(/\((.+)\)/)?.[1] ?? "",
        hitPoints: Number(hp.match(/^\d+/)![0]),
        hitDice: hp.match(/\((.+)\)/)?.[1] ?? "",
        speed: movements,
        abilities,
        challengeRating,
        xp: number(
          cr.match(year === 2014 ? /\(([\d, ]+) XP/ : /XP ([\d,]+)/)![1],
        ),
        proficiencyBonus: Number(
          cr.match(/PB \+(\d+)/)?.[1] ??
            Math.max(2, Math.ceil(challengeRating / 4) + 1),
        ),
        sensesRu: field(rus.body, "Чувства") || "Не указаны",
        languagesRu:
          field(rus.body, "Языки").replace(/^[—–-]$/, "Нет") || "Нет",
        savingThrowsRu: field(rus.body, "Спасброски"),
        skillsRu: field(rus.body, "Навыки"),
        resistances: damageList("(?:Damage )?Resistances"),
        immunities: damageList("(?:Damage )?Immunities"),
        vulnerabilities: damageList("(?:Damage )?Vulnerabilities"),
        traits: features(year === 2014 ? "Свойства" : "Особенности"),
        actions: features("Действия"),
        bonusActions: features("Бонусные действия"),
        reactions: features("Реакции"),
        legendaryActions: features("Легендарные действия"),
        spellcastingRu: spellcasting,
        statBlockComplete: true,
      },
    };
  });
  const dataset = datasetSchema.parse({
    schemaVersion: 1,
    name: `Бестиарий SRD ${version}`,
    sources: [
      {
        id: sourceId,
        shortName: `SRD ${version} · Бестиарий`,
        fullNameRu: `Системный справочный документ ${version} — бестиарий`,
        edition,
        publisher: "Wizards of the Coast LLC; OmnisGM",
        contentType: "SRD",
        licenseType: "CC BY 4.0",
      },
    ],
    entries,
  });
  const audit = auditDataset(dataset);
  writeFileSync(
    `data/srd/monsters-${year}.json`,
    JSON.stringify(dataset, null, 2) + "\n",
  );
  console.log(JSON.stringify(audit));
}
