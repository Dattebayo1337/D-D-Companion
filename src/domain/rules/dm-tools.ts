import { z } from "zod";
import {
  editionSchema,
  type EditionId,
  type ReferenceEntry,
} from "@/entities/content";

// Numeric encounter tables: Basic Rules 2014 and SRD 5.2.1 (CC BY 4.0).
export const budgets2014 = [
  [25, 50, 75, 100],
  [50, 100, 150, 200],
  [75, 150, 225, 400],
  [125, 250, 375, 500],
  [250, 500, 750, 1100],
  [300, 600, 900, 1400],
  [350, 750, 1100, 1700],
  [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400],
  [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600],
  [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100],
  [1250, 2500, 3800, 5700],
  [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800],
  [2100, 4200, 6300, 9500],
  [2400, 4900, 7300, 10900],
  [2800, 5700, 8500, 12700],
];
export const budgets2024 = [
  [50, 75, 100],
  [100, 150, 200],
  [150, 225, 400],
  [250, 375, 500],
  [500, 750, 1100],
  [600, 1000, 1400],
  [750, 1300, 1700],
  [1000, 1700, 2100],
  [1300, 2000, 2600],
  [1600, 2300, 3100],
  [1900, 2900, 4100],
  [2200, 3700, 4700],
  [2600, 4200, 5400],
  [2900, 4900, 6200],
  [3300, 5400, 7800],
  [3800, 6100, 9800],
  [4500, 7200, 11700],
  [5000, 8700, 14200],
  [5500, 10700, 17200],
  [6400, 13200, 22000],
];
export const partySchema = z
  .array(
    z.object({
      level: z.number().int().min(1).max(20),
      count: z.number().int().min(1).max(20),
    }),
  )
  .max(20)
  .refine(
    (rows) => rows.reduce((n, r) => n + r.count, 0) <= 20,
    "В группе может быть до 20 персонажей.",
  );
export const opponentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(500),
  edition: editionSchema,
  xp: z.number().int().min(0).max(1000000),
  cr: z.number().min(0).max(30),
  count: z.number().int().min(1).max(99),
  multiplier: z.boolean(),
});
export const encounterSchema = z.object({
  party: partySchema,
  opponents: z.array(opponentSchema).max(50),
  target: z.number().int().min(0).max(3),
});
export type EncounterDraft = z.infer<typeof encounterSchema>;
export const encounterLabels = (edition: EditionId) =>
  edition === "5e_2014"
    ? ["Лёгкий", "Средний", "Тяжёлый", "Смертельный"]
    : ["Низкая", "Умеренная", "Высокая"];
export function calculateEncounter(edition: EditionId, input: EncounterDraft) {
  const { party, opponents, target } = encounterSchema.parse(input);
  if (opponents.some((e) => e.edition !== edition))
    throw new Error("Противники должны соответствовать выбранной редакции.");
  const table = edition === "5e_2014" ? budgets2014 : budgets2024;
  const budgets = table[0].map((_, i) =>
    party.reduce((sum, p) => sum + table[p.level - 1][i] * p.count, 0),
  );
  const players = party.reduce((n, p) => n + p.count, 0);
  const monsters = opponents.reduce((n, m) => n + m.count, 0);
  const raw = opponents.reduce((n, m) => n + m.count * m.xp, 0);
  const counted = opponents.reduce(
    (n, m) => n + (m.multiplier ? m.count : 0),
    0,
  );
  let multiplier = 1;
  if (edition === "5e_2014" && players && counted) {
    const steps = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
    const base =
      counted === 1
        ? 1
        : counted === 2
          ? 2
          : counted <= 6
            ? 3
            : counted <= 10
              ? 4
              : counted <= 14
                ? 5
                : 6;
    multiplier = steps[base + (players < 3 ? 1 : players >= 6 ? -1 : 0)];
  }
  const adjusted = raw * multiplier;
  const labels = encounterLabels(edition);
  let difficulty = "Добавьте противников";
  if (!players) difficulty = "Добавьте персонажей";
  else if (monsters) {
    if (edition === "5e_2014") {
      const index = budgets.findLastIndex((b) => adjusted >= b);
      difficulty = index < 0 ? "Ниже лёгкого" : labels[index];
    } else {
      const index = budgets.findIndex((b) => raw <= b);
      difficulty =
        index < 0
          ? "Выше высокого бюджета"
          : `В пределах бюджета: ${labels[index].toLowerCase()}`;
    }
  }
  const budget = budgets[Math.min(target, budgets.length - 1)];
  const average = players
    ? party.reduce((n, p) => n + p.level * p.count, 0) / players
    : 0;
  return {
    players,
    monsters,
    raw,
    adjusted,
    multiplier,
    counted,
    budgets,
    budget,
    difficulty,
    remaining: budget - adjusted,
    xpEach: players ? raw / players : 0,
    overlevel: players > 0 && opponents.some((m) => m.cr > average),
  };
}

export const rarities = [
  "Common",
  "Uncommon",
  "Rare",
  "VeryRare",
  "Legendary",
] as const;
export type Rarity = (typeof rarities)[number];
export const rarityLabels: Record<Rarity, string> = {
  Common: "Обычный",
  Uncommon: "Необычный",
  Rare: "Редкий",
  VeryRare: "Очень редкий",
  Legendary: "Легендарный",
};
// Only a single unambiguous rarity in the metadata/header is eligible.
export function itemRarity(entry: ReferenceEntry): Rarity | null {
  const text = (
    entry.reference.properties.find(
      (p) => p.nameRu.toLowerCase() === "редкость",
    )?.valueRu ??
    entry.descriptionRu
      .split(/\r?\n/)
      .find((l) => l.trim() && !l.startsWith("#")) ??
    ""
  ).toLowerCase();
  const found: Rarity[] = [];
  let rest = text;
  for (const [key, re] of [
    ["VeryRare", /очень\s+редк[а-яё]*|very rare/g],
    ["Uncommon", /необычн[а-яё]*|uncommon/g],
    ["Legendary", /легендарн[а-яё]*|legendary/g],
    ["Rare", /редк(?:ий|ая|ое|ие)|\brare\b/g],
    ["Common", /обычн[а-яё]*|\bcommon\b/g],
  ] as const) {
    if (re.test(rest)) {
      found.push(key);
      rest = rest.replace(re, "");
    }
  }
  return found.length === 1 && !/варьиру|varies|артефакт|artifact/.test(text)
    ? found[0]
    : null;
}
export const lootItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  edition: editionSchema,
  rarity: z.enum(rarities),
  sourceBookId: z.string().uuid(),
});
export type LootItem = z.infer<typeof lootItemSchema>;
export const lootOptionsSchema = z.object({
  level: z.number().int().min(1).max(20),
  type: z.enum(["individual", "hoard"]),
  wealth: z.enum(["poor", "standard", "rich"]),
  magicCount: z.number().int().min(0).max(5),
  rarity: z.enum(["auto", ...rarities]),
  sourceBookId: z.union([z.literal(""), z.string().uuid()]),
});
export type LootOptions = z.infer<typeof lootOptionsSchema>;
export function lootPool(
  edition: EditionId,
  options: LootOptions,
  items: LootItem[],
) {
  const max =
    options.level <= 4
      ? 1
      : options.level <= 10
        ? 2
        : options.level <= 16
          ? 3
          : 4;
  return items.filter(
    (i) =>
      i.edition === edition &&
      (!options.sourceBookId || i.sourceBookId === options.sourceBookId) &&
      (options.rarity === "auto"
        ? rarities.indexOf(i.rarity) <= max
        : i.rarity === options.rarity),
  );
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const lootResultSchema = z.object({
  edition: editionSchema,
  seed: z.number().int().min(0).max(4294967295),
  options: lootOptionsSchema,
  coins: z.object({
    cp: z.number().int().nonnegative(),
    sp: z.number().int().nonnegative(),
    gp: z.number().int().nonnegative(),
    pp: z.number().int().nonnegative(),
  }),
  valuables: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().positive(),
      gp: z.number().int().positive(),
    }),
  ),
  items: z.array(lootItemSchema),
  coinFormula: z.string(),
});
export type LootResult = z.infer<typeof lootResultSchema>;
export function generateLoot(
  edition: EditionId,
  input: LootOptions,
  catalog: LootItem[],
  seed: number,
): LootResult {
  const options = lootOptionsSchema.parse(input);
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error("Ключ должен быть целым числом от 0 до 4294967295.");
  const pool = lootPool(edition, options, catalog);
  if (pool.length < options.magicCount)
    throw new Error(
      `В выбранном наборе только ${pool.length} подходящих предметов. Уменьшите количество или измените фильтры.`,
    );
  const random = seededRandom(seed);
  const die = (s: number) => 1 + Math.floor(random() * s);
  const tier =
    options.level <= 4
      ? 0
      : options.level <= 10
        ? 1
        : options.level <= 16
          ? 2
          : 3;
  const scale = [5, 25, 100, 500][tier];
  const factor =
    options.wealth === "poor" ? 0.5 : options.wealth === "rich" ? 2 : 1;
  const typeFactor = options.type === "hoard" ? 10 : 1;
  let copper = Math.round(
    (die(6) + die(6)) * scale * factor * typeFactor * 100,
  );
  const pp = options.type === "hoard" ? Math.floor(copper / 2000) : 0;
  copper -= pp * 1000;
  const gp = (Math.floor(copper / 100) * 0.8) | 0;
  copper -= gp * 100;
  const sp = (Math.floor(copper / 10) * 0.9) | 0;
  copper -= sp * 10;
  const valuables: LootResult["valuables"] = [];
  if (options.type === "hoard" || die(6) >= 5) {
    const names = [
      "Полированный самоцвет",
      "Серебряная брошь с эмалью",
      "Резная шкатулка",
      "Золотой медальон",
    ];
    valuables.push({
      name: names[die(names.length) - 1],
      count: options.type === "hoard" ? die(4) : 1,
      gp: [10, 50, 250, 1000][tier],
    });
  }
  const selected: LootItem[] = [];
  const candidates = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < options.magicCount; i++) {
    const index = Math.floor(random() * candidates.length);
    selected.push(candidates.splice(index, 1)[0]);
  }
  return {
    edition,
    seed,
    options,
    coins: { cp: copper, sp, gp, pp },
    valuables,
    items: selected,
    coinFormula: `2к6 × ${scale} × ${factor} × ${typeFactor} зм`,
  };
}
export function lootGold(result: LootResult) {
  return (
    (result.coins.cp +
      10 * result.coins.sp +
      100 * result.coins.gp +
      1000 * result.coins.pp) /
      100 +
    result.valuables.reduce((sum, v) => sum + v.count * v.gp, 0)
  );
}
export function lootText(result: LootResult) {
  return [
    `Добыча · ${result.edition.slice(3)} · уровень ${result.options.level} · ключ ${result.seed}`,
    "Авторская таблица Companion",
    `${result.coins.cp} мм, ${result.coins.sp} см, ${result.coins.gp} зм, ${result.coins.pp} пм`,
    ...result.valuables.map((v) => `${v.name} × ${v.count} — по ${v.gp} зм`),
    ...result.items.map((i) => `${i.name} — ${rarityLabels[i.rarity]}`),
    `Монеты и ценности: ${lootGold(result)} зм (без оценки магических предметов)`,
  ].join("\n");
}
