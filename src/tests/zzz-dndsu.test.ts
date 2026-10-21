import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset, auditDataset, importDataset } from "../imports/pipeline";
import { search, filtersSchema } from "../search/service";
import { catalog } from "../services/characters/service";

const packages = [2014, 2024].map((year) =>
  parseDataset(readFileSync(`data/dndsu/supplement-${year}.json`, "utf8")),
);
test("Дополнение ДнД.су: пять категорий, источники и отсутствие дублей в существующих наборах", () => {
  const baseline = [2014, 2024]
    .flatMap((year) =>
      ["spells", "monsters", "references"]
        .map((category) => `data/srd/${category}-${year}.json`)
        .concat(`data/phb/backgrounds-${year}.json`),
    )
    .flatMap((path) => parseDataset(readFileSync(path, "utf8")).entries);
  const key = (e: (typeof baseline)[number]) =>
    `${e.edition}:${e.kind}:${e.kind === "Reference" ? e.reference.category : ""}:${e.nameOriginal.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const keys = new Set(baseline.map(key));
  const categories = new Set<string>();
  for (const data of packages) {
    assert.deepEqual(auditDataset(data).issues, []);
    for (const entry of data.entries) {
      assert.ok(!keys.has(key(entry)), entry.nameOriginal);
      keys.add(key(entry));
      categories.add(
        entry.kind === "Reference" ? entry.reference.category : entry.kind,
      );
      const url = new URL(entry.source);
      assert.equal(
        url.hostname,
        entry.edition === "5e_2024" ? "next.dnd.su" : "dnd.su",
      );
      assert.equal(entry.contentOrigin, "MetadataOnly");
      assert.equal(entry.descriptionOriginal, "");
      assert.ok(entry.descriptionRu.trim().split(/\s+/).length < 200);
    }
  }
  assert.deepEqual([...categories].sort(), [
    "Background",
    "Feat",
    "MagicItem",
    "SpeciesRace",
    "Spell",
  ]);
  assert.deepEqual(
    packages.map((d) => d.entries.length),
    [23, 7],
  );
});
test("Дополнение ДнД.су: различия редакций и точные параметры новых заклинаний", () => {
  const all = packages.flatMap((p) => p.entries);
  const war = all.filter((e) => e.nameOriginal === "War Caster");
  assert.equal(war.length, 2);
  assert.notEqual(war[0].id, war[1].id);
  assert.match(war[1].descriptionRu, /уровень 4/);
  const absorb = all.find((e) => e.nameOriginal === "Absorb Elements")!;
  assert.equal(absorb.edition, "5e_2014"); // next.dnd.su offers only a legacy compatibility link.
  assert.equal(absorb.kind, "Spell");
  if (absorb.kind === "Spell") {
    assert.equal(absorb.spell.castingTime, "Reaction");
    assert.equal(absorb.spell.concentration, false);
    assert.equal(absorb.spell.level, 1);
  }
  const blade = all.find((e) => e.nameOriginal === "Shadow Blade")!;
  assert.ok(
    blade.kind === "Spell" &&
      blade.spell.concentration &&
      blade.spell.damageType === "Psychic",
  );
});
test("Дополнение ДнД.су: повторный импорт, поиск и доступность в мастере персонажа", async () => {
  for (const data of packages) {
    await importDataset(data);
    const repeat = await importDataset(data);
    assert.equal(repeat.imported, 0);
    assert.equal(repeat.skipped, data.entries.length);
  }
  for (const edition of ["5e_2014", "5e_2024"] as const) {
    const result = await search(
      filtersSchema.parse({
        kind: "Reference",
        category: "Feat",
        edition,
        q: "Боевой заклинатель",
      }),
    );
    assert.ok(
      result.items.some(
        (e) => e.nameOriginal === "War Caster" && e.edition === edition,
      ),
    );
    const available = await catalog(edition);
    const required =
      edition === "5e_2014"
        ? ["Haunted One", "Warforged", "Absorb Elements"]
        : ["Aasimar", "War Caster"];
    for (const name of required)
      assert.ok(
        available.some((e) => e.nameOriginal === name),
        name,
      );
    assert.ok(available.every((e) => e.edition === edition));
  }
});
