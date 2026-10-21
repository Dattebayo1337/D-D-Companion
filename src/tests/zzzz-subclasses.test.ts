import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset, importDataset } from "../imports/pipeline";
import { search, filtersSchema } from "../search/service";
import { catalog } from "../services/characters/service";

const load = (path: string) => parseDataset(readFileSync(path, "utf8"));
test("Подклассы PHB: полный состав и связи с классами обеих редакций", () => {
  const oldCounts: Record<string, number> = {
    Barbarian: 2,
    Bard: 2,
    Cleric: 7,
    Druid: 2,
    Fighter: 3,
    Monk: 3,
    Paladin: 3,
    Ranger: 2,
    Rogue: 3,
    Sorcerer: 2,
    Warlock: 3,
    Wizard: 8,
  };
  for (const year of [2014, 2024]) {
    const base = load(`data/srd/references-${year}.json`);
    const extra = load(`data/phb/subclasses-${year}.json`);
    for (const entry of extra.entries) {
      assert.equal(entry.contentVersion, 2);
      assert.match(entry.descriptionRu, /Как играется/);
      assert.ok(entry.kind === "Reference");
      const levels = entry.reference.properties
        .find((p) => p.nameRu === "Уровни развития")!
        .valueRu.split(", ")
        .map(Number);
      assert.deepEqual(
        entry.reference.features.map((f) => f.level),
        levels,
        entry.nameOriginal,
      );
      assert.ok(
        entry.reference.features.every((f) => f.descriptionRu.length > 25),
      );
    }
    const all = [...base.entries, ...extra.entries];
    const classes = base.entries.filter(
      (e) => e.kind === "Reference" && e.reference.category === "Class",
    );
    const subclasses = all.filter(
      (e) => e.kind === "Reference" && e.reference.category === "Subclass",
    );
    assert.equal(classes.length, 12);
    assert.equal(subclasses.length, year === 2014 ? 40 : 48);
    for (const cls of classes) {
      const children = subclasses.filter(
        (e) => e.kind === "Reference" && e.reference.parentId === cls.id,
      );
      assert.equal(
        children.length,
        year === 2014 ? oldCounts[cls.nameOriginal] : 4,
        cls.nameOriginal,
      );
      assert.ok(children.every((e) => e.edition === cls.edition));
      assert.equal(
        new Set(
          children.map((e) =>
            e.nameOriginal.replace(/[^a-z0-9]/gi, "").toLowerCase(),
          ),
        ).size,
        children.length,
      );
    }
  }
});
test("Подклассы PHB: повторный импорт, фильтрация по классу и каталог персонажа", async () => {
  for (const year of [2014, 2024]) {
    const data = load(`data/phb/subclasses-${year}.json`);
    await importDataset({
      ...data,
      entries: data.entries.map((e) => ({
        ...e,
        contentVersion: 1,
        descriptionRu: "Предыдущий краткий обзор",
        ...(e.kind === "Reference"
          ? { reference: { ...e.reference, features: [] } }
          : {}),
      })),
    });
    const update = await importDataset(data);
    assert.equal(update.imported, data.entries.length);
    const repeat = await importDataset(data);
    assert.equal(repeat.imported, 0);
    assert.equal(repeat.skipped, data.entries.length);
    const edition = year === 2014 ? "5e_2014" : "5e_2024";
    const available = await catalog(edition);
    for (const className of ["Wizard", "Fighter"]) {
      const cls = available.find(
        (e) =>
          e.kind === "Reference" &&
          e.reference.category === "Class" &&
          e.nameOriginal === className,
      )!;
      const result = await search(
        filtersSchema.parse({
          kind: "Reference",
          category: "Subclass",
          edition,
          parentId: cls.id,
          pageSize: 100,
        }),
      );
      assert.equal(
        result.total,
        year === 2024 ? 4 : className === "Wizard" ? 8 : 3,
      );
      assert.ok(
        result.items.every(
          (e) => e.kind === "Reference" && e.reference.parentId === cls.id,
        ),
      );
      const wrongEdition = await search(
        filtersSchema.parse({
          kind: "Reference",
          category: "Subclass",
          edition: year === 2014 ? "5e_2024" : "5e_2014",
          parentId: cls.id,
        }),
      );
      assert.equal(wrongEdition.total, 0);
    }
    for (const entry of data.entries) {
      const saved = available.find((e) => e.id === entry.id);
      assert.ok(saved, entry.nameOriginal);
      assert.equal(saved.contentVersion, 2);
      assert.equal(saved.descriptionRu, entry.descriptionRu);
      assert.ok(
        saved.kind === "Reference" && saved.reference.features.length >= 3,
      );
    }
  }
});
