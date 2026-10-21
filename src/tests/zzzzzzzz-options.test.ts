import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset, auditDataset, importDataset } from "../imports/pipeline";
import { filtersSchema, search } from "../search/service";
import { parseIndex } from "../../scripts/audit-dndsu";
const load = (p: string) => parseDataset(readFileSync(p, "utf8"));
const packages = [2014, 2024].map((y) => load(`data/dndsu/options-${y}.json`));

test("Проверенные механики дополнений 2014: уровни и раздельные режимы чтения", async () => {
  const { readingContent } = await import("../domain/reading-content");
  const expected: Record<string, number[]> = {
    Artillerist: [3, 5, 9, 15],
    "Circle of Stars": [2, 6, 10, 14],
    "Rune Knight": [3, 7, 10, 15, 18],
    Swarmkeeper: [3, 7, 11, 15],
  };
  for (const [name, levels] of Object.entries(expected)) {
    const entry = packages[0].entries.find(e => e.nameOriginal === name)!;
    assert.ok(entry?.kind === "Reference");
    assert.deepEqual([...new Set(entry.reference.features.map(f => f.level))], levels);
    const reading = readingContent(entry);
    assert.ok(reading.summary.text.trim());
    assert.ok(reading.hasDetails);
    assert.equal(reading.features.length, entry.reference.features.length);
    assert.equal(entry.contentOrigin, "MetadataOnly");
    assert.ok(entry.contentVersion >= 2);
    assert.equal(entry.updatedAt, "2026-10-02T00:00:00.000Z");
  }
  const stars = packages[0].entries.find(e => e.nameOriginal === "Circle of Stars")!;
  assert.ok(stars.kind === "Reference");
  const form = stars.reference.features.find(f => f.nameRu === "Выбор созвездия")!;
  assert.match(form.descriptionRu, /спасбросках концентрации/);
  assert.doesNotMatch(form.descriptionRu, /всех спасбросках/);
  const swarm = packages[0].entries.find(e => e.nameOriginal === "Swarmkeeper")!;
  assert.ok(swarm.kind === "Reference");
  assert.match(swarm.reference.features[0].descriptionRu, /Раз за собственный ход/);
  assert.match(swarm.reference.features.at(-1)!.descriptionRu, /именно этому урону/);
});

test("Коллегии барда: описание игры и развитие отдельно для каждой редакции", () => {
  const colleges = packages.flatMap((p) => p.entries).filter((e) =>
    e.nameOriginal.startsWith("College of"),
  );
  assert.equal(colleges.length, 8);
  for (const entry of colleges) {
    assert.ok(entry.kind === "Reference");
    assert.match(entry.descriptionRu, /Как играется/);
    assert.deepEqual([...new Set(entry.reference.features.map((f) => f.level))], [3, 6, 14]);
    assert.ok(entry.reference.features.every((f) => f.descriptionRu.length > 100));
    assert.ok(entry.contentVersion >= 3);
  }
  const spirits = colleges.filter((e) => e.nameOriginal === "College of Spirits");
  assert.equal(spirits.length, 2);
  assert.notEqual(spirits[0].descriptionRu, spirits[1].descriptionRu);
  assert.ok(spirits[0].kind === "Reference" && spirits[1].kind === "Reference");
  assert.match(spirits[0].reference.features.map((f) => f.descriptionRu).join(" "), /Часовой сеанс/);
  assert.match(spirits[1].reference.features.map((f) => f.descriptionRu).join(" "), /Духовные стражи/);
});
test("Дополнения: 188 записей с проверенными классами и редакциями", () => {
  for (const [i, year] of [2014, 2024].entries()) {
    const base = load(`data/srd/references-${year}.json`);
    const p = packages[i];
    const known = new Map(base.entries.map((e) => [e.id, e]));
    assert.deepEqual(
      auditDataset(
        p,
        new Map(base.sources.map((s) => [s.id, s.edition])),
        new Set(known.keys()),
        known,
      ).issues,
      [],
    );
    assert.equal(p.entries.length, year === 2014 ? 150 : 38);
    const all = [
      ...base.entries,
      ...load(`data/phb/subclasses-${year}.json`).entries,
      ...load(`data/dndsu/supplement-${year}.json`).entries,
      ...p.entries,
    ];
    const ids = new Map(all.map((e) => [e.id, e]));
    const species = all.filter(
      (e) => e.kind === "Reference" && e.reference.category === "SpeciesRace",
    );
    const subs = all.filter(
      (e) => e.kind === "Reference" && e.reference.category === "Subclass",
    );
    assert.equal(species.length, year === 2014 ? 84 : 19);
    assert.equal(subs.length, year === 2014 ? 118 : 76);
    for (const e of subs) {
      assert.ok(e.kind === "Reference");
      const parent = ids.get(e.reference.parentId!);
      assert.ok(
        parent?.kind === "Reference" && parent.reference.category === "Class",
      );
      assert.equal(parent.edition, e.edition);
    }
    const keys = p.entries.map(
      (e) =>
        `${e.edition}:${e.kind === "Reference" ? e.reference.category : ""}:${e.nameOriginal.toLowerCase()}`,
    );
    assert.equal(new Set(keys).size, keys.length);
    for (const e of p.entries) {
      assert.ok(e.descriptionRu.length > 70);
      assert.equal(
        new URL(e.source).hostname,
        year === 2014 ? "dnd.su" : "next.dnd.su",
      );
    }
  }
});
test("Дополнения: книжные варианты не подменяют друг друга", () => {
  const rows = packages[0].entries;
  const old = rows.find((e) => e.nameOriginal === "Bugbear")!;
  const modern = rows.find((e) => e.nameOriginal === "Bugbear (MPMM)")!;
  assert.notEqual(old.id, modern.id);
  assert.notEqual(old.sourceBookId, modern.sourceBookId);
  assert.match(old.descriptionRu, /врасплох/);
  assert.match(modern.descriptionRu, /ещё не ходившим/);
  assert.ok(modern.aliases.includes("Bugbear"));
});
test("Каталог рас: распознаёт отдельный блок Мультивселенной без Homebrew", () => {
  const tile = (url: string, en: string) =>
    `<a href="${url}"><span class="article_title">Раса</span><span class="article_title_en">${en}</span><span class="article_source">MPMM</span></a>`;
  const rows = parseIndex(
    tile("/race/1-test/", "Old") +
      tile("/multiverse/race/2-test/", "New") +
      tile("/homebrew/race/3-test/", "Homebrew"),
    "https://dnd.su/race/",
  );
  assert.deepEqual(
    rows.map((r) => r.nameOriginal),
    ["Old", "New"],
  );
});
test("Дополнения: повторный импорт и поиск подклассов изобретателя", async () => {
  for (const p of packages) {
    await importDataset(p);
    const repeat = await importDataset(p);
    assert.equal(repeat.imported, 0);
    assert.equal(repeat.skipped, p.entries.length);
    const parent = p.entries.find((e) => e.nameOriginal === "Artificer")!;
    const result = await search(
      filtersSchema.parse({
        edition: parent.edition,
        kind: "Reference",
        category: "Subclass",
        parentId: parent.id,
        pageSize: 100,
      }),
    );
    assert.equal(result.total, parent.edition === "5e_2014" ? 4 : 6);
    assert.ok(
      result.items.every(
        (e) => e.kind === "Reference" && e.reference.parentId === parent.id,
      ),
    );
  }
});
