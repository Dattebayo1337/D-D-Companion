import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset } from "../imports/pipeline";
import {
  calculateEncounter,
  generateLoot,
  lootPool,
  itemRarity,
  lootResultSchema,
  lootGold,
  type EncounterDraft,
  type LootOptions,
  type LootItem,
} from "../domain/rules/dm-tools";
const id = "00000000-0000-4000-8000-000000000001";
const enemy = (
  xp = 100,
  count = 1,
  edition: "5e_2014" | "5e_2024" = "5e_2014",
) => ({ id, name: "Противник", edition, xp, cr: 1, count, multiplier: true });
const draft: EncounterDraft = {
  party: [{ level: 1, count: 4 }],
  opponents: [enemy()],
  target: 1,
};
test("Бой 2014: пороги и награда без множителя", () => {
  const r = calculateEncounter("5e_2014", {
    ...draft,
    party: [
      { level: 3, count: 3 },
      { level: 2, count: 1 },
    ],
    opponents: [enemy(125, 4)],
  });
  assert.deepEqual(r.budgets, [275, 550, 825, 1400]);
  assert.equal(r.adjusted, 1000);
  assert.equal(r.difficulty, "Тяжёлый");
  assert.equal(r.xpEach, 125);
  assert.equal(calculateEncounter("5e_2014", draft).difficulty, "Лёгкий");
});
test("Бой 2014: границы множителей и размер группы", () => {
  for (const [count, multiplier] of [
    [1, 1],
    [2, 1.5],
    [3, 2],
    [6, 2],
    [7, 2.5],
    [10, 2.5],
    [11, 3],
    [14, 3],
    [15, 4],
    [99, 4],
  ])
    assert.equal(
      calculateEncounter("5e_2014", { ...draft, opponents: [enemy(10, count)] })
        .multiplier,
      multiplier,
    );
  assert.equal(
    calculateEncounter("5e_2014", {
      ...draft,
      party: [{ level: 1, count: 2 }],
      opponents: [enemy(10, 15)],
    }).multiplier,
    5,
  );
  assert.equal(
    calculateEncounter("5e_2014", { ...draft, party: [{ level: 1, count: 6 }] })
      .multiplier,
    0.5,
  );
  const r = calculateEncounter("5e_2014", {
    ...draft,
    opponents: [
      enemy(100),
      {
        ...enemy(10, 10),
        id: "00000000-0000-4000-8000-000000000002",
        multiplier: false,
      },
    ],
  });
  assert.equal(r.multiplier, 1);
  assert.equal(r.raw, 200);
});
test("Бой 2024: бюджет как верхняя граница, без множителя", () => {
  const base = {
    party: [{ level: 1, count: 4 }],
    target: 1,
    opponents: [enemy(200, 1, "5e_2024")],
  };
  assert.equal(
    calculateEncounter("5e_2024", base).difficulty,
    "В пределах бюджета: низкая",
  );
  assert.equal(
    calculateEncounter("5e_2024", {
      ...base,
      opponents: [enemy(201, 1, "5e_2024")],
    }).difficulty,
    "В пределах бюджета: умеренная",
  );
  assert.equal(
    calculateEncounter("5e_2024", {
      ...base,
      opponents: [enemy(401, 1, "5e_2024")],
    }).difficulty,
    "Выше высокого бюджета",
  );
  assert.equal(
    calculateEncounter("5e_2024", {
      ...base,
      opponents: [enemy(10, 99, "5e_2024")],
    }).multiplier,
    1,
  );
  assert.deepEqual(
    calculateEncounter("5e_2024", { ...base, party: [{ level: 15, count: 6 }] })
      .budgets,
    [19800, 32400, 46800],
  );
});
test("Бой: пустые составы, нулевой опыт, валидация редакции", () => {
  assert.equal(
    calculateEncounter("5e_2014", { ...draft, party: [] }).xpEach,
    0,
  );
  assert.equal(
    calculateEncounter("5e_2014", { ...draft, opponents: [] }).difficulty,
    "Добавьте противников",
  );
  assert.equal(
    calculateEncounter("5e_2014", { ...draft, opponents: [enemy(0)] })
      .difficulty,
    "Ниже лёгкого",
  );
  assert.throws(() => calculateEncounter("5e_2024", draft));
  assert.throws(() =>
    calculateEncounter("5e_2014", {
      ...draft,
      party: [{ level: 0, count: 4 }],
    }),
  );
  assert.throws(() =>
    calculateEncounter("5e_2014", {
      ...draft,
      party: [
        { level: 1, count: 20 },
        { level: 1, count: 1 },
      ],
    }),
  );
});
const opts: LootOptions = {
  level: 5,
  type: "hoard",
  wealth: "standard",
  magicCount: 2,
  rarity: "auto",
  sourceBookId: "",
};
const pool: LootItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  name: `Предмет ${i}`,
  edition: "5e_2024",
  rarity: i === 4 ? "Legendary" : "Uncommon",
  sourceBookId: id,
}));
test("Добыча: воспроизводимость, порядок каталога, уникальность и фильтры", () => {
  const r = generateLoot("5e_2024", opts, pool, 42);
  assert.deepEqual(r, generateLoot("5e_2024", opts, [...pool].reverse(), 42));
  assert.equal(new Set(r.items.map((i) => i.id)).size, 2);
  assert.ok(r.items.every((i) => i.rarity === "Uncommon"));
  assert.ok(lootResultSchema.safeParse(r).success);
  assert.equal(lootPool("5e_2014", opts, pool).length, 0);
  assert.equal(
    lootPool("5e_2024", { ...opts, rarity: "Legendary" }, pool).length,
    1,
  );
  assert.throws(() =>
    generateLoot("5e_2024", { ...opts, rarity: "Legendary" }, pool, 42),
  );
  assert.throws(() => generateLoot("5e_2024", opts, pool, -1));
  assert.equal(
    lootPool("5e_2024", { ...opts, sourceBookId: pool[1].id }, pool).length,
    0,
  );
});
test("Добыча: стоимость монет сохраняется, масштаб богатства и отсутствие магии", () => {
  const coins = (r: ReturnType<typeof generateLoot>) =>
    r.coins.cp + 10 * r.coins.sp + 100 * r.coins.gp + 1000 * r.coins.pp;
  for (const seed of [0, 1, 42, 4294967295]) {
    const standard = generateLoot(
      "5e_2024",
      { ...opts, magicCount: 0 },
      [],
      seed,
    );
    const rich = generateLoot(
      "5e_2024",
      { ...opts, magicCount: 0, wealth: "rich" },
      [],
      seed,
    );
    const poor = generateLoot(
      "5e_2024",
      { ...opts, magicCount: 0, wealth: "poor" },
      [],
      seed,
    );
    assert.equal(coins(rich), 2 * coins(standard));
    assert.equal(coins(poor) * 2, coins(standard));
    assert.ok(
      standard.valuables[0].count >= 1 && standard.valuables[0].count <= 4,
    );
    assert.equal(standard.items.length, 0);
    assert.equal(
      lootGold(standard),
      coins(standard) / 100 +
        standard.valuables[0].count * standard.valuables[0].gp,
    );
  }
});
test("Редкость: реальные справочники, отсутствие смешения редких и очень редких", () => {
  for (const year of [2014, 2024]) {
    const entries = parseDataset(
      readFileSync(`data/srd/references-${year}.json`, "utf8"),
    ).entries.filter(
      (e) => e.kind === "Reference" && e.reference.category === "MagicItem",
    );
    assert.ok(
      entries.filter((e) => e.kind === "Reference" && itemRarity(e)).length >
        100,
    );
    const sample = entries.find((e) => e.kind === "Reference")!;
    assert.ok(sample.kind === "Reference");
    for (const [text, expected] of [
      ["*Чудесный предмет, очень редкий*", "VeryRare"],
      ["*Оружие, необычное*", "Uncommon"],
      ["*Оружие, необычное (+1), редкое (+2)*", null],
      ["*Чудесный предмет, редкость варьируется*", null],
      ["*Чудесный предмет, артефакт*", null],
    ] as const)
      assert.equal(
        itemRarity({
          ...sample,
          descriptionRu: text,
          reference: { ...sample.reference, properties: [] },
        }),
        expected,
      );
  }
});
