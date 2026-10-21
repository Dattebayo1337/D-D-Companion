import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditDataset, importDataset, parseDataset } from "../imports/pipeline";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const packages = [2014, 2024].map((y) =>
  parseDataset(readFileSync(`data/phb/feats-${y}.json`, "utf8")),
);
test("Черты PHB: полный каталог обеих книг без дублей, русский текст и источники", () => {
  const indexes = JSON.parse(
    readFileSync("data/dndsu/catalog-index.json", "utf8"),
  ).indexes as {
    edition: string;
    category: string;
    items: { nameOriginal: string; source: string }[];
  }[];
  for (const [i, year] of [2014, 2024].entries()) {
    const data = packages[i];
    assert.ok(auditDataset(data).valid);
    assert.equal(data.entries.length, year === 2014 ? 37 : 49);
    const all = [
      "srd/references",
      "phb/backgrounds",
      "dndsu/supplement",
      "phb/feats",
    ]
      .flatMap(
        (p) =>
          parseDataset(readFileSync(`data/${p}-${year}.json`, "utf8")).entries,
      )
      .filter((e) => e.kind === "Reference" && e.reference.category === "Feat");
    const names = all.map((e) => norm(e.nameOriginal));
    assert.equal(new Set(names).size, names.length);
    const phb = indexes
      .find((x) => x.edition === `5e_${year}` && x.category === "Feat")!
      .items.filter((x) =>
        year === 2014
          ? x.source === "PH14"
          : x.source.split(",").includes("301"),
      );
    assert.equal(phb.length, year === 2014 ? 42 : 75);
    for (const row of phb)
      assert.ok(names.includes(norm(row.nameOriginal)), row.nameOriginal);
    for (const e of data.entries) {
      assert.equal(
        new URL(e.source).hostname,
        year === 2014 ? "dnd.su" : "next.dnd.su",
      );
      assert.ok(e.descriptionRu.split(/\s+/).length < 200);
      assert.equal(e.contentOrigin, "MetadataOnly");
    }
  }
});
test("Черты PHB: механика стойкости и дуэлянта различается по редакциям", () => {
  const durable = packages.map(
    (p) => p.entries.find((e) => norm(e.nameOriginal) === "durable")!,
  );
  assert.match(durable[0].descriptionRu, /удвоенному/);
  assert.match(durable[1].descriptionRu, /спасброски от смерти/);
  assert.notEqual(durable[0].id, durable[1].id);
  const duel = packages.map(
    (p) => p.entries.find((e) => norm(e.nameOriginal) === "defensiveduelist")!,
  );
  assert.match(duel[0].descriptionRu, /против этой атаки/);
  assert.match(duel[1].descriptionRu, /следующего хода/);
});
test("Черты PHB: повторный импорт не создаёт записей", async () => {
  for (const p of packages) {
    await importDataset(p);
    const result = await importDataset(p);
    assert.equal(result.imported, 0);
    assert.equal(result.skipped, p.entries.length);
  }
});
