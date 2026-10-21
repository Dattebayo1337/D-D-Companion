import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { characterSchema, type CharacterData } from "../entities/character";
import {
  classRules,
  deriveCharacter,
  spellSlots,
  gainLevel,
  restCharacter,
  validateCharacter,
  pointCost,
} from "../domain/rules/character";
import { parseDataset, importDataset } from "../imports/pipeline";
import {
  characterCommand,
  listCharacters,
  rollAbilities,
} from "../services/characters/service";
const datasets = [2014, 2024].map((y) =>
  parseDataset(readFileSync(`data/srd/references-${y}.json`, "utf8")),
);
function hero(year = 2024, name = "Wizard", level = 1): CharacterData {
  const edition = `5e_${year}`;
  const entries = datasets[year === 2014 ? 0 : 1].entries;
  const ref = (cat: string) =>
    entries.find((e) => e.kind === "Reference" && e.reference.category === cat)!
      .id;
  const rule = Object.values(classRules).find(
    (r) => r.edition === edition && r.name === name,
  )!;
  return characterSchema.parse({
    name: "Тестовый герой",
    edition,
    speciesRaceId: ref("SpeciesRace"),
    backgroundId: ref("Background"),
    method: "Standard",
    abilities: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
    classes: [
      {
        classId: rule.id,
        level,
        hpRolls: Array(level).fill(Math.floor(rule.hitDie / 2) + 1),
      },
    ],
    hp: 1,
  });
}
test("Все 24 класса: кости хитов, 20 уровней, ячейки и защита", () => {
  assert.equal(Object.keys(classRules).length, 24);
  for (const rule of Object.values(classRules)) {
    assert.ok([6, 8, 10, 12].includes(rule.hitDie));
    assert.equal(rule.rows.length, 20);
    for (let level = 1; level <= 20; level++) {
      const c = hero(Number(rule.edition.slice(3)), rule.name, level);
      assert.equal(
        deriveCharacter(c).proficiency,
        2 + Math.floor((level - 1) / 4),
      );
      assert.equal(spellSlots(c).length, 9);
      assert.ok(deriveCharacter(c).maxHp >= level);
    }
  }
});
test("Хиты: полный кубик только на первом уровне персонажа; Телосложение ретроактивно", () => {
  const c = hero(2024, "Fighter");
  assert.equal(deriveCharacter(c).maxHp, 11);
  const wizard = Object.values(classRules).find(
    (r) => r.edition === "5e_2024" && r.name === "Wizard",
  )!;
  const leveled = gainLevel(c, wizard.id);
  assert.equal(deriveCharacter(leveled).maxHp, 16);
  leveled.abilityBonuses.CON = 2;
  assert.equal(deriveCharacter(leveled).maxHp, 18);
  assert.throws(() => gainLevel(c, wizard.id, 7));
});
test("Мультикласс: округление полу-заклинателя отличается в 2014 и 2024", () => {
  for (const year of [2014, 2024]) {
    const c = hero(year, "Paladin", 3);
    const wizard = Object.values(classRules).find(
      (r) => r.edition === c.edition && r.name === "Wizard",
    )!;
    c.classes.push({
      classId: wizard.id,
      subclassId: null,
      level: 1,
      hpRolls: [4],
    });
    assert.deepEqual(
      spellSlots(c).slice(0, 2),
      year === 2014 ? [3, 0] : [4, 2],
    );
  }
});
test("Длительный отдых: половина костей в 2014 и все в 2024", () => {
  for (const year of [2014, 2024]) {
    const c = hero(year, "Fighter", 5),
      id = c.classes[0].classId;
    c.spentHitDice[id] = 5;
    c.tempHp = 7;
    c.exhaustion = 2;
    const rested = restCharacter(c, "long");
    assert.equal(rested.spentHitDice[id], year === 2014 ? 3 : 0);
    assert.equal(rested.hp, deriveCharacter(c).maxHp);
    assert.equal(rested.tempHp, 0);
    assert.equal(rested.exhaustion, 1);
    assert.equal(c.spentHitDice[id], 5);
  }
});
test("Короткий отдых: договор восстанавливается, обычные ячейки остаются потраченными", () => {
  const c = hero(2024, "Warlock", 3);
  c.pactSpent = 2;
  c.slotsSpent[0] = 1;
  const r = restCharacter(c, "short");
  assert.equal(r.pactSpent, 0);
  assert.equal(r.slotsSpent[0], 1);
  assert.deepEqual(deriveCharacter(c).pact, { max: 2, level: 2 });
  const druid = hero(2024, "Druid", 2);
  assert.equal(
    deriveCharacter(druid).resources.find((x) => x.name === "Дикий облик")?.max,
    2,
  );
});
test("Проверка набора, покупки, редакции, подкласса и мультикласса", () => {
  const c = hero();
  const map = new Map(datasets[1].entries.map((e) => [e.id, e]));
  assert.deepEqual(validateCharacter(c, map), []);
  assert.equal(pointCost([15, 15, 15, 8, 8, 8]), 27);
  assert.equal(pointCost([16]), Infinity);
  c.abilities.STR = 14;
  assert.ok(validateCharacter(c, map).some((x) => x.includes("Стандартный")));
  assert.ok(validateCharacter(hero(2014), map).length > 0);
});
test("Броски 4d6 отбрасывают меньший кубик", () => {
  for (const r of rollAbilities()) {
    assert.equal(r.dice.length, 4);
    assert.equal(
      r.total,
      r.dice.reduce((a, b) => a + b, 0) - Math.min(...r.dice),
    );
    assert.ok(r.total >= 3 && r.total <= 18);
  }
});
test("Сохранение, временные хиты, конкуренция версий, отдых и архив", async () => {
  await importDataset(datasets[1]);
  const created = await characterCommand({
    action: "create",
    data: hero(2024, "Fighter"),
  });
  assert.equal(created.data.hp, 11);
  const temp = await characterCommand({
    action: "tempHp",
    id: created.id,
    version: created.version,
    amount: 4,
  });
  const damaged = await characterCommand({
    action: "damage",
    id: temp.id,
    version: temp.version,
    amount: 6,
  });
  assert.equal(damaged.data.hp, 9);
  assert.equal(damaged.data.tempHp, 0);
  await assert.rejects(
    () =>
      characterCommand({
        action: "heal",
        id: temp.id,
        version: temp.version,
        amount: 1,
      }),
    /другом окне/,
  );
  const outcomes = await Promise.allSettled(
    [1, 2].map((amount) =>
      characterCommand({
        action: "heal",
        id: damaged.id,
        version: damaged.version,
        amount,
      }),
    ),
  );
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
  const current = (await listCharacters("5e_2024")).find(
    (r) => r.id === created.id,
  )!;
  const archived = await characterCommand({
    action: "archive",
    id: current.id,
    version: current.version,
  });
  await assert.rejects(
    () =>
      characterCommand({
        action: "damage",
        id: archived.id,
        version: archived.version,
      }),
    /архива/,
  );
  const restored = await characterCommand({
    action: "archive",
    id: archived.id,
    version: archived.version,
    archived: false,
  });
  assert.equal(restored.archived, false);
  const rested = await characterCommand({
    action: "long",
    id: restored.id,
    version: restored.version,
  });
  assert.equal(rested.data.hp, 11);
});
test("Книга заклинаний: расход, концентрация и исчерпание ячеек", async () => {
  const spells = parseDataset(
    readFileSync("data/srd/spells-2024.json", "utf8"),
  );
  await importDataset(spells);
  const spell = spells.entries.find(
    (e) => e.kind === "Spell" && e.nameOriginal === "Expeditious Retreat",
  )!;
  const c = hero();
  c.spells = [
    { spellId: spell.id, classId: c.classes[0].classId, status: "Prepared" },
  ];
  let r = await characterCommand({ action: "create", data: c });
  r = await characterCommand({
    action: "cast",
    id: r.id,
    version: r.version,
    key: spell.id,
    slot: 1,
  });
  assert.equal(r.data.slotsSpent[0], 1);
  assert.equal(r.data.concentrationId, spell.id);
  r = await characterCommand({
    action: "cast",
    id: r.id,
    version: r.version,
    key: spell.id,
    slot: 1,
  });
  await assert.rejects(
    () =>
      characterCommand({
        action: "cast",
        id: r.id,
        version: r.version,
        key: spell.id,
        slot: 1,
      }),
    /Нет доступной/,
  );
  r = await characterCommand({ action: "long", id: r.id, version: r.version });
  assert.equal(r.data.slotsSpent[0], 0);
  assert.equal(r.data.concentrationId, null);
  const high = spells.entries.find(
    (e) => e.kind === "Spell" && e.spell.level === 9,
  )!;
  const map = new Map(
    [...datasets[1].entries, ...spells.entries].map((e) => [e.id, e]),
  );
  c.spells[0].spellId = high.id;
  assert.ok(
    validateCharacter(c, map).some((s) => s.includes("выше доступного")),
  );
});
