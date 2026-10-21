import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset, auditDataset } from "../imports/pipeline";
import type { Monster } from "../entities/content";
for (const year of [2014, 2024])
  test(`Бестиарий ${year}: полный индекс, локализация и характеристики`, () => {
    const data = parseDataset(
      readFileSync(`data/srd/monsters-${year}.json`, "utf8"),
    );
    const dir = year === 2014 ? "16" : "14";
    const files =
      year === 2014 ? ["04_Monsters.md"] : ["04_Monsters.md", "05_Animals.md"];
    const names = files.flatMap((f) =>
      readFileSync(
        `data/raw/srd-${year}/omnisgm/en/${dir}_Glossary/${f}`,
        "utf8",
      )
        .split("\n")
        .filter((l) => l.startsWith("|"))
        .slice(2)
        .map((l) => l.split("|")[1].trim()),
    );
    assert.equal(data.entries.length, year === 2014 ? 317 : 330);
    assert.deepEqual(
      new Set(data.entries.map((e) => e.nameOriginal)),
      new Set(names),
    );
    assert.equal(
      new Set(data.entries.map((e) => e.nameRu)).size,
      data.entries.length,
    );
    assert.deepEqual(auditDataset(data).issues, []);
    const aboleth = data.entries.find(
      (e) => e.nameOriginal === "Aboleth",
    ) as Monster;
    assert.equal(aboleth.monster.hitPoints, year === 2014 ? 135 : 150);
    assert.equal(aboleth.monster.armorClass, 17);
    assert.equal(aboleth.monster.abilities.STR, 21);
    assert.equal(aboleth.monster.speed.swim, 40);
    assert.equal(aboleth.monster.challengeRating, 10);
    assert.ok(aboleth.monster.legendaryActions.length);
    for (const e of data.entries) {
      assert.equal(e.kind, "Monster");
      assert.match(e.descriptionRu, /Хиты/);
      assert.ok((e as Monster).monster.statBlockComplete);
    }
  });

test("Бестиарий: комбинированные фильтры сохраняют точный итог и пагинацию", async () => {
  const { importDataset } = await import("../imports/pipeline");
  const { search, filtersSchema } = await import("../search/service");
  const d = parseDataset(readFileSync("data/srd/monsters-2024.json", "utf8"));
  await importDataset(d);
  const filter = filtersSchema.parse({
    kind: "Monster",
    edition: "5e_2024",
    movement: "fly",
    immunity: "Fire",
    legendary: "true",
    pageSize: 2,
  });
  const r = await search(filter);
  assert.ok(r.total > 2);
  assert.equal(r.items.length, 2);
  for (const e of r.items) {
    assert.equal(e.kind, "Monster");
    const m = (e as Monster).monster;
    assert.ok(m.speed.fly > 0);
    assert.ok(m.immunities.includes("Fire"));
    assert.ok(m.legendaryActions.length);
  }
  const next = await search({ ...filter, page: 2 });
  assert.equal(next.total, r.total);
  assert.ok(next.items.every((e) => !r.items.some((a) => a.id === e.id)));
});
