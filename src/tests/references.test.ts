import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset, auditDataset, importDataset } from "../imports/pipeline";
import { search, filtersSchema } from "../search/service";
import type { ReferenceEntry } from "../entities/content";
const data = [2014, 2024].map((y) =>
  parseDataset(readFileSync(`data/srd/references-${y}.json`, "utf8")),
);
for (const [index, year] of [2014, 2024].entries())
  test(`Справочники ${year}: все категории, классы 1–20 и полный индекс предметов`, () => {
    const d = data[index];
    assert.deepEqual(auditDataset(d).issues, []);
    assert.equal(d.entries.length, index === 0 ? 532 : 682);
    const refs = d.entries as ReferenceEntry[];
    assert.equal(
      refs.filter((e) => e.reference.category === "Class").length,
      12,
    );
    assert.equal(
      refs.filter((e) => e.reference.category === "Subclass").length,
      12,
    );
    for (const e of refs.filter((e) => e.reference.category === "Class")) {
      assert.deepEqual(
        e.reference.progression.map((p) => p.level),
        Array.from({ length: 20 }, (_, i) => i + 1),
      );
      assert.ok(e.reference.properties.length > 0);
      assert.ok(e.reference.features.length > 0);
    }
    for (const e of refs.filter((e) => e.reference.category === "Subclass"))
      assert.ok(
        refs.some(
          (c) =>
            c.id === e.reference.parentId &&
            c.reference.category === "Class" &&
            c.edition === e.edition,
        ),
      );
    const names = readFileSync(
      `data/raw/srd-${year}/omnisgm/en/${index === 0 ? "16" : "14"}_Glossary/03_MagicItems.md`,
      "utf8",
    )
      .split("\n")
      .filter((l) => l.startsWith("|"))
      .slice(2)
      .map((l) => l.split("|")[1].trim());
    for (const name of names)
      assert.ok(
        refs.some(
          (e) =>
            e.reference.category === "MagicItem" && e.nameOriginal === name,
        ),
        name,
      );
    const longsword = refs.find(
      (e) =>
        e.nameOriginal === "Longsword" && e.reference.category === "Weapon",
    )!;
    assert.match(longsword.descriptionRu, /1[кd]8/);
    if (index === 1) assert.match(longsword.descriptionRu, /Мастерство/);
    assert.equal(
      refs.filter((e) => e.reference.category === "Condition").length,
      15,
    );
  });
test("Подкласс не может ссылаться на класс другой редакции или отсутствующую запись", () => {
  const d = structuredClone(data[0]);
  const e = d.entries.find(
    (e) => e.kind === "Reference" && e.reference.category === "Subclass",
  ) as ReferenceEntry;
  e.reference.parentId = "90000000-0000-4000-8000-000000000001";
  assert.equal(auditDataset(d).valid, false);
});
test("Справочники проходят реальный импорт, повторный импорт, поиск и связи класса", async () => {
  const result = await importDataset(data[1]);
  assert.equal(result.imported, 682);
  const repeat = await importDataset(data[1]);
  assert.equal(repeat.imported, 0);
  assert.equal(repeat.skipped, 682);
  const classes = await search(
    filtersSchema.parse({
      kind: "Reference",
      category: "Class",
      edition: "5e_2024",
    }),
  );
  assert.equal(classes.total, 12);
  const barbarian = classes.items.find((e) => e.nameOriginal === "Barbarian")!;
  const subclasses = await search(
    filtersSchema.parse({ kind: "Reference", parentId: barbarian.id }),
  );
  assert.equal(subclasses.total, 1);
  assert.equal(
    (subclasses.items[0] as ReferenceEntry).reference.category,
    "Subclass",
  );
  const result2 = await search(
    filtersSchema.parse({
      q: "Longsword",
      kind: "Reference",
      category: "Weapon",
    }),
  );
  assert.ok(result2.items.some((e) => e.nameOriginal === "Longsword"));
});
