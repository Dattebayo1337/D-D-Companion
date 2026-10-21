import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset, auditDataset, importDataset } from "../imports/pipeline";
import { search, filtersSchema } from "../search/service";
import { catalog, characterCommand } from "../services/characters/service";
import { characterSchema } from "../entities/character";
const expected = {
  2014: [
    "Acolyte",
    "Charlatan",
    "Criminal",
    "Entertainer",
    "Folk Hero",
    "Guild Artisan",
    "Hermit",
    "Noble",
    "Outlander",
    "Sage",
    "Sailor",
    "Soldier",
    "Urchin",
    "Spy",
    "Gladiator",
    "Guild Merchant",
    "Knight",
    "Pirate",
  ],
  2024: [
    "Acolyte",
    "Artisan",
    "Charlatan",
    "Criminal",
    "Entertainer",
    "Farmer",
    "Guard",
    "Guide",
    "Hermit",
    "Merchant",
    "Noble",
    "Sage",
    "Sailor",
    "Scribe",
    "Soldier",
    "Wayfarer",
  ],
};
for (const year of [2014, 2024] as const) {
  const srd = parseDataset(
    readFileSync(`data/srd/references-${year}.json`, "utf8"),
  );
  const extra = parseDataset(
    readFileSync(`data/phb/backgrounds-${year}.json`, "utf8"),
  );
  test(`Предыстории PHB ${year}: точный состав, редакция и отсутствие дублей`, () => {
    assert.equal(auditDataset(extra).valid, true);
    const entries = [...srd.entries, ...extra.entries].filter(
      (e) => e.kind === "Reference" && e.reference.category === "Background",
    );
    assert.deepEqual(
      entries.map((e) => e.nameOriginal).sort(),
      [...expected[year]].sort(),
    );
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
    assert.ok(
      extra.entries.every(
        (e) =>
          e.edition === `5e_${year}` &&
          e.contentOrigin === "MetadataOnly" &&
          e.descriptionRu.length > 70,
      ),
    );
    assert.equal(
      extra.entries.filter((e) => e.tags.includes("Вариант")).length,
      year === 2014 ? 5 : 0,
    );
    if (year === 2024) {
      const required = [
        "Crafter",
        "Healer",
        "Lucky",
        "Musician",
        "Tavern Brawler",
        "Tough",
      ];
      assert.deepEqual(
        extra.entries
          .filter(
            (e) => e.kind === "Reference" && e.reference.category === "Feat",
          )
          .map((e) => e.nameOriginal)
          .sort(),
        required.sort(),
      );
    }
  });
  test(`Предыстории PHB ${year}: импорт повторяется без дублей и доступен в поиске`, async () => {
    await importDataset(srd);
    await importDataset(extra);
    const repeat = await importDataset(extra);
    assert.equal(repeat.imported, 0);
    assert.equal(repeat.skipped, extra.entries.length);
    const result = await search(
      filtersSchema.parse({
        kind: "Reference",
        category: "Background",
        edition: `5e_${year}`,
        pageSize: 100,
      }),
    );
    assert.equal(result.total, expected[year].length);
    const sources = new Set(result.items.map((e) => e.sourceBookId));
    assert.equal(sources.size, 2);
  });
}
test("Новая предыстория доступна мастеру персонажа в своей редакции", async () => {
  const entries = await catalog("5e_2024");
  const ref = (name: string) =>
    entries.find((e) => e.nameOriginal === name && e.kind === "Reference")!;
  const c = characterSchema.parse({
    name: "Проверка проводника",
    edition: "5e_2024",
    method: "Standard",
    abilities: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
    speciesRaceId: entries.find(
      (e) => e.kind === "Reference" && e.reference.category === "SpeciesRace",
    )!.id,
    backgroundId: ref("Guide").id,
    classes: [{ classId: ref("Fighter").id, level: 1, hpRolls: [10] }],
  });
  const saved = await characterCommand({ action: "create", data: c });
  assert.equal(saved.data.backgroundId, ref("Guide").id);
  const legacy = (await catalog("5e_2014")).find(
    (e) => e.nameOriginal === "Knight",
  )!;
  await assert.rejects(
    () =>
      characterCommand({
        action: "create",
        data: { ...c, backgroundId: legacy.id },
      }),
    /редакции/,
  );
});
