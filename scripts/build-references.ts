import { verifySources } from "./srd-source";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { datasetSchema, type ReferenceEntry } from "../src/entities/content";
import { auditDataset } from "../src/imports/pipeline";
verifySources();
const date = "2026-09-17T00:00:00.000Z";
const uuid = (s: string) => {
  const h = createHash("sha256")
    .update("dnd-companion:omnisgm:" + s)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const clean = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
const ruClean = (s: string) =>
  clean(s)
    .replace(/ \([A-Za-z][A-Za-z0-9 ,’'–+\/\-]*\)/g, "")
    .replace(/Table:/g, "Таблица:")
    .replace(/\bGP\b/g, "зм")
    .replace(/\bXP\b/g, "ОО")
    .replace(
      / \(Long Rest; в переводе Hobby World [—-] «Продолжительный отдых»\)/g,
      " (также «Продолжительный отдых»)",
    )
    .replace(/PH-B/g, "Книги игрока, Б");
type Part = { name: string; body: string; level: number; index: number };
function parts(s: string, levels: number[]): Part[] {
  const heads = [...s.matchAll(/^(#{1,6}) (.+)$/gm)];
  return heads
    .filter((h) => levels.includes(h[1].length))
    .map((h) => {
      const next = heads.find(
        (n) => n.index! > h.index! && n[1].length <= h[1].length,
      );
      return {
        name: h[2],
        body: s.slice(h.index! + h[0].length, next?.index ?? s.length).trim(),
        level: h[1].length,
        index: h.index!,
      };
    });
}
function tables(s: string) {
  return [...s.matchAll(/(^\|.*\n(?:\|.*\n?)+)/gm)].map((m) =>
    m[1]
      .trim()
      .split("\n")
      .map((l) =>
        l
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim()),
      ),
  );
}
for (const year of [2014, 2024]) {
  const root = `data/raw/srd-${year}/omnisgm`,
    edition = year === 2014 ? "5e_2014" : "5e_2024",
    version = year === 2014 ? "5.1" : "5.2.1",
    sourceId = uuid(`${year}:reference:source`);
  const read = (f: string, lang: string) =>
    readFileSync(`${root}/${lang}/${f}`, "utf8").replace(/\r/g, "");
  const entries: ReferenceEntry[] = [],
    mapping: {
      category: string;
      ru: string;
      en: string;
      file: string;
      method: string;
    }[] = [];
  const add = (
    category: ReferenceEntry["reference"]["category"],
    nameRu: string,
    nameOriginal: string,
    descriptionRu: string,
    descriptionOriginal: string,
    file: string,
    details: Partial<ReferenceEntry["reference"]> = {},
    method = "explicit original name",
  ) => {
    const id = uuid(`${year}:reference:${category}:${nameOriginal}`);
    if (entries.some((e) => e.id === id))
      throw new Error("Duplicate " + category + " " + nameOriginal);
    const e = {
      id,
      kind: "Reference",
      nameRu: ruClean(nameRu),
      nameOriginal,
      descriptionRu: ruClean(descriptionRu),
      descriptionOriginal: clean(descriptionOriginal),
      edition,
      sourceBookId: sourceId,
      source: `https://github.com/OmnisGM-App/OmnisGM-Rules/blob/9d31cc106d780a62cef82cf4e2caa9f9d2dcccb5/src/dnd/srd-${year === 2014 ? "5.1" : "5.2"}/ru/${file}`,
      license:
        "CC BY 4.0 — Wizards of the Coast LLC; русский перевод OmnisGM. https://creativecommons.org/licenses/by/4.0/",
      rulesVersion: `SRD ${version}`,
      translationStatus: "Approved",
      contentOrigin: "SRD",
      contentVersion: 1,
      createdAt: date,
      updatedAt: date,
      reference: { category, ...details },
    };
    entries.push(e as ReferenceEntry);
    mapping.push({ category, ru: nameRu, en: nameOriginal, file, method });
    return id;
  };
  const named = (
    file: string,
    category: ReferenceEntry["reference"]["category"],
    levels = [4],
  ) => {
    const en = parts(read(file, "en"), levels),
      ru = parts(read(file, "ru"), levels);
    for (const r of ru) {
      const h = r.name.match(/^(.+?) \(([A-Za-z].*)\)$/);
      if (!h) continue;
      const e = en.find((e) => e.name === h[2]);
      if (!e) throw new Error(`Unmatched ${file} ${r.name}`);
      add(
        ["Avatar of Death", "Giant Fly"].includes(e.name) ? "Rule" : category,
        h[1],
        e.name,
        r.body,
        e.body,
        file,
      );
    }
  };
  const paired = (
    file: string,
    levels: number[],
    classify: (e: Part) => ReferenceEntry["reference"]["category"],
  ) => {
    const en = parts(read(file, "en"), levels),
      ru = parts(read(file, "ru"), levels);
    if (en.length !== ru.length)
      throw new Error(
        "Heading counts " + file + " " + en.length + "/" + ru.length,
      );
    en.forEach((e, i) => {
      if (!ru[i].body || !e.body) return;
      add(
        classify(e),
        ru[i].name,
        e.name,
        ru[i].body,
        e.body,
        file,
        {},
        "parallel chapter heading order",
      );
    });
  };
  const classDir = year === 2014 ? "06_Classes" : "03_Classes";
  for (const filename of readdirSync(`${root}/en/${classDir}`).filter(
    (f) => f.endsWith(".md") && !f.startsWith("00"),
  )) {
    const file = `${classDir}/${filename}`,
      en = read(file, "en"),
      ru = read(file, "ru");
    const es = parts(en, [3]).find((p) => /Subclass:/i.test(p.name)),
      rs = parts(ru, [3]).find((p) => /Подкласс/i.test(p.name));
    if (!es || !rs) throw new Error("Subclass " + file);
    const className = parts(en, [2])[0].name,
      ruName = parts(ru, [2])[0].name;
    const ebody = en.slice(en.indexOf("\n"), es.index).trim(),
      rbody = ru.slice(ru.indexOf("\n"), rs.index).trim();
    const rt = tables(rbody),
      et = tables(ebody);
    const progressIndex = et.findIndex(
      (t) =>
        t[0].some((c) => /^Level$/.test(c)) && t.some((r) => r[0] === "20"),
    );
    if (progressIndex < 0) throw new Error("Progression " + file);
    const pt = rt[progressIndex];
    if (!pt || !pt.some((r) => r[0] === "20"))
      throw new Error("RU progression " + file);
    const progression = pt
      .slice(2)
      .filter((r) => /^\d+$/.test(r[0]))
      .map((r) => ({
        level: Number(r[0]),
        proficiencyBonus: Number(r[1]),
        featuresRu: ruClean(r[2]),
        resourcesRu: pt[0]
          .slice(3)
          .map((h, i) => `${h}: ${r[i + 3]}`)
          .join("; "),
        spellSlots: [],
      }));
    const features = (body: string) =>
      parts(body, [3, 4])
        .filter((p) => /^Уровень \d+:/.test(p.name))
        .map((p) => ({
          level: Number(p.name.match(/\d+/)![0]),
          nameRu: p.name.replace(/^Уровень \d+: /, ""),
          descriptionRu: ruClean(p.body),
        }));
    const properties = rt[0]
      .slice(2)
      .filter((r) => r[0] && r[1])
      .map((r) => ({ nameRu: ruClean(r[0]), valueRu: ruClean(r[1]) }));
    const classId = add(
      "Class",
      ruName,
      className,
      rbody,
      ebody,
      file,
      { progression, features: features(rbody), properties },
      "parallel class file",
    );
    add(
      "Subclass",
      rs.name.split(":").slice(1).join(":").trim(),
      es.name.split(":").slice(1).join(":").trim(),
      rs.body,
      es.body,
      file,
      { parentId: classId, features: features(rs.body) },
      "parallel subclass section",
    );
  }
  if (year === 2014) {
    named("04_Races.md", "SpeciesRace", [2]);
    const f = "05_CharacterDetails.md";
    const r = parts(read(f, "ru"), [3]).find((p) => p.name === "Послушник")!,
      e = parts(read(f, "en"), [3]).find((p) => p.name === "Acolyte")!;
    add(
      "Background",
      r.name,
      e.name,
      r.body,
      e.body,
      f,
      {},
      "parallel background section",
    );
    named("08_Feats.md", "Feat");
    paired("11_Conditions.md", [4], () => "Condition");
  } else {
    const f = "04_CharacterOrigins.md";
    const en = parts(read(f, "en"), [4]),
      ru = parts(read(f, "ru"), [4]);
    for (const r of ru) {
      const h = r.name.match(/^(.+) \(([^)]+)\)$/);
      if (!h) continue;
      const e = en.find((p) => p.name === h[2])!;
      if (!e) throw new Error(r.name);
      add(
        ["Acolyte", "Criminal", "Sage", "Soldier"].includes(e.name)
          ? "Background"
          : "SpeciesRace",
        h[1],
        e.name,
        r.body,
        e.body,
        f,
      );
    }
    named("05_Feats.md", "Feat");
    paired("08_RulesGlossary.md", [4], (e) =>
      /\[Condition\]/.test(e.name) ? "Condition" : "Rule",
    );
  }
  // Magic item headings explicitly contain their original name; nested tables remain intact.
  named(year === 2014 ? "13_MagicItems.md" : "10_MagicItems.md", "MagicItem", [
    4,
  ]);
  // The sole SRD 2014 artifact uses a third-level heading.
  if (year === 2014) {
    const f = "13_MagicItems.md",
      en = parts(read(f, "en"), [3]).find(
        (p) => p.name === "Orb of Dragonkind",
      ),
      ru = parts(read(f, "ru"), [3]).find((p) =>
        p.name.includes("(Orb of Dragonkind)"),
      );
    if (en && ru) {
      const trim = (s: string) => s.split(/^#### /m)[0];
      add(
        "MagicItem",
        "Сфера драконьей власти",
        en.name,
        trim(ru.body),
        trim(en.body),
        f,
      );
    }
  }
  const equipFile = year === 2014 ? "09_Equipment.md" : "06_Equipment.md";
  const enEquip = read(equipFile, "en"),
    ruEquip = read(equipFile, "ru"),
    et = tables(enEquip),
    rt = tables(ruEquip);
  if (et.length !== rt.length) throw new Error("Equipment tables count");
  const enDetails = parts(enEquip, [4]),
    ruDetails = parts(ruEquip, [4]);
  if (enDetails.length !== ruDetails.length)
    throw new Error("Equipment headings count");
  for (let ti = 0; ti < et.length; ti++) {
    const t = et[ti],
      r = rt[ti];
    if (t.length !== r.length) throw new Error("Table rows " + ti);
    const category = t[0].includes("Damage")
      ? "Weapon"
      : t[0].some((c) => c === "Armor Class (AC)")
        ? "Armor"
        : (year === 2014 ? [7, 9, 11, 12, 13] : [9, 14, 15, 16]).includes(ti)
          ? "Equipment"
          : null;
    if (!category) continue;
    for (let i = 2; i < t.length; i++) {
      if (!t[i][0] || t[i].slice(1).every((c) => !c)) continue;
      const nameOriginal = clean(t[i][0]).replaceAll("*", ""),
        nameRu = ruClean(r[i][0]).replaceAll("*", "");
      if (
        entries.some(
          (e) =>
            e.reference.category === category &&
            e.nameOriginal === nameOriginal,
        )
      )
        continue;
      const dIndex = enDetails.findIndex(
        (p) =>
          p.name === nameOriginal || p.name.startsWith(nameOriginal + " ("),
      );
      const table = (rows: string[][]) =>
        rows.map((row) => "| " + row.join(" | ") + " |").join("\n");
      let rbody = table([r[0], r[1], r[i]]),
        ebody = table([t[0], t[1], t[i]]);
      if (dIndex >= 0) {
        rbody += "\n\n" + ruDetails[dIndex].body;
        ebody += "\n\n" + enDetails[dIndex].body;
      }
      // 2014 equipment descriptions use bold paragraphs rather than heading sections.
      if (year === 2014) {
        const find = (s: string, n: string) => {
          const marker = "**_" + n + "._**";
          const a = s.indexOf(marker);
          if (a < 0) return "";
          const b = s.indexOf("\n**_", a + marker.length);
          return s
            .slice(a, b < 0 ? s.length : b)
            .split(/^## /m)[0]
            .trim();
        };
        rbody += "\n\n" + find(ruEquip, nameRu);
        ebody += "\n\n" + find(enEquip, nameOriginal);
      }
      add(
        category,
        nameRu,
        nameOriginal,
        rbody,
        ebody,
        equipFile,
        {
          properties: r[0].slice(1).map((h, j) => ({
            nameRu: ruClean(h),
            valueRu: ruClean(r[i][j + 1] ?? ""),
          })),
        },
        `parallel equipment table ${ti}, row ${i}`,
      );
    }
  }
  if (year === 2024) {
    enDetails.forEach((e, i) => {
      if (
        e.index < enEquip.indexOf("## Tools") ||
        e.index > enEquip.indexOf("## Adventuring Gear")
      )
        return;
      add(
        "Equipment",
        ruDetails[i].name,
        e.name,
        ruDetails[i].body,
        e.body,
        equipFile,
        {},
        "parallel tool heading",
      );
    });
  }
  // Complete rules chapters supplement the granular entities, including weapon mastery and adventuring.
  const ruleFiles =
    year === 2014
      ? [
          "01_Abilities.md",
          "02_Adventuring.md",
          "03_Combat.md",
          "07_Multiclassing.md",
          "09_Equipment.md",
          "14_Monsters.md",
        ]
      : [
          "01_PlayingTheGame.md",
          "02_CharacterCreation.md",
          "06_Equipment.md",
          "11_Monsters.md",
        ];
  for (const file of ruleFiles) {
    const es = parts(read(file, "en"), [2]),
      rs = parts(read(file, "ru"), [2]);
    if (es.length !== rs.length) throw new Error("Rule headings " + file);
    es.forEach((e, i) => {
      if (!e.body || !rs[i].body) return;
      const name = `${parts(read(file, "en"), [1])[0]?.name ?? file}: ${e.name}`,
        ruName = `${parts(read(file, "ru"), [1])[0]?.name ?? file}: ${rs[i].name}`;
      add(
        "Rule",
        ruName,
        name,
        rs[i].body,
        e.body,
        file,
        {},
        "parallel rules chapter",
      );
    });
  }
  const data = datasetSchema.parse({
    schemaVersion: 1,
    name: `Справочники SRD ${version}`,
    sources: [
      {
        id: sourceId,
        shortName: `SRD ${version} · Справочники`,
        fullNameRu: `Системный справочный документ ${version} — справочники`,
        edition,
        publisher: "Wizards of the Coast LLC; OmnisGM",
        contentType: "SRD",
        licenseType: "CC BY 4.0",
      },
    ],
    entries,
  });
  const audit = auditDataset(data);
  writeFileSync(
    `data/srd/references-${year}.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
  writeFileSync(
    `data/srd/reference-mapping-${year}.json`,
    JSON.stringify(mapping, null, 2) + "\n",
  );
  console.log(
    year,
    "entries",
    entries.length,
    "counts",
    Object.fromEntries(
      [...new Set(entries.map((e) => e.reference.category))].map((k) => [
        k,
        entries.filter((e) => e.reference.category === k).length,
      ]),
    ),
  );
  if (!audit.valid) throw new Error(JSON.stringify(audit.issues));
}
