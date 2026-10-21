import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  newCombatant,
  battleSchema,
  type BattleData,
} from "../entities/battle";
import {
  combatDamage,
  combatHeal,
  deathSave,
  startBattle,
  moveTurn,
} from "../domain/rules/battle";
import { parseDice, rollDice } from "../domain/rules/dice";
const hero = () => ({
  ...newCombatant(randomUUID(), "Герой", "5e_2024"),
  maxHp: 20,
  hp: 20,
  deathSaves: true,
});
test("Трекер: инициатива, равенство, круг ходов и возврат без изменения хитов", () => {
  const a = { ...hero(), name: "А", initiative: 5 },
    b = { ...hero(), name: "Б", initiative: 15 },
    c = { ...hero(), name: "В", initiative: 15 };
  const initial: BattleData = {
    name: "Бой",
    edition: "5e_2024",
    status: "preparing",
    round: 1,
    turn: 0,
    participants: [a, b, c],
    notes: "",
    log: [],
  };
  let battle = startBattle(initial);
  assert.deepEqual(
    battle.participants.map((p) => p.name),
    ["Б", "В", "А"],
  );
  for (let i = 0; i < 3; i++) battle = moveTurn(battle, "next");
  assert.equal(battle.round, 2);
  assert.equal(battle.turn, 0);
  battle = moveTurn(battle, "previous");
  assert.equal(battle.round, 1);
  assert.equal(battle.turn, 2);
  assert.equal(battle.participants[0].hp, 20);
  battle = moveTurn(battle, "round");
  assert.equal(battle.round, 2);
  assert.equal(battle.turn, 0);
  assert.equal(moveTurn(startBattle(initial), "previous").round, 1);
  assert.throws(() => startBattle({ ...initial, participants: [] }));
  assert.throws(() => moveTurn(initial, "next"));
  assert.ok(
    !battleSchema.safeParse({ ...initial, participants: [a, a] }).success,
  );
});
test("Трекер: временные хиты, концентрация и различия СЛ 2014/2024", () => {
  const p = { ...hero(), tempHp: 5, concentration: "Эффект" };
  const q = combatDamage(p, 8);
  assert.equal(q.hp, 17);
  assert.equal(q.tempHp, 0);
  assert.equal(q.concentrationDC, 10);
  assert.equal(p.hp, 20);
  assert.throws(() => combatDamage(q, 1), /предыдущую/);
  for (const edition of ["5e_2014", "5e_2024"] as const) {
    const result = combatDamage(
      { ...hero(), maxHp: 200, hp: 200, edition, concentration: "Эффект" },
      100,
    );
    assert.equal(result.concentrationDC, edition === "5e_2014" ? 50 : 30);
  }
  const zero = combatDamage({ ...p, hp: 3, tempHp: 0 }, 3);
  assert.equal(zero.hp, 0);
  assert.equal(zero.deathState, "dying");
  assert.equal(zero.concentration, "");
  assert.equal(
    combatDamage({ ...hero(), deathSaves: false }, 20).deathState,
    "dead",
  );
  assert.equal(
    combatDamage({ ...hero(), hp: 6, maxHp: 12 }, 18).deathState,
    "dead",
  );
  assert.equal(combatDamage({ ...zero, tempHp: 0 }, 1, true).failure, 2);
});
test("Трекер: лечение, натуральные 1/20, стабилизация и смерть", () => {
  const dying = combatDamage(hero(), 20);
  assert.equal(deathSave(dying, 1).failure, 2);
  assert.equal(deathSave({ ...dying, failure: 2 }, 5).deathState, "dead");
  const stable = deathSave({ ...dying, success: 2 }, 10);
  assert.equal(stable.deathState, "stable");
  assert.equal(stable.success, 0);
  assert.equal(deathSave(dying, 20).hp, 1);
  assert.throws(() => deathSave(stable, 15));
  const healed = combatHeal({ ...dying, failure: 2, tempHp: 7 }, 100);
  assert.equal(healed.hp, 20);
  assert.equal(healed.failure, 0);
  assert.equal(healed.tempHp, 7);
  assert.throws(() => combatHeal({ ...dying, deathState: "dead" }, 1));
});
test("Кубы: парсер, преимущества, помехи, крит и защита от неверных формул", () => {
  for (const sides of [4, 6, 8, 10, 12, 20, 100])
    assert.equal(parseDice(`к${sides}`).sides, sides);
  assert.deepEqual(parseDice(" 2d6 + 3 "), {
    count: 2,
    sides: 6,
    keep: "",
    modifier: 3,
  });
  let index = 0;
  assert.equal(
    rollDice("1d20+5", "advantage", () => [2, 17][index++]).total,
    22,
  );
  index = 0;
  assert.equal(
    rollDice("1d20-1", "disadvantage", () => [2, 17][index++]).total,
    1,
  );
  assert.equal(rollDice("2d6+3", "critical", () => 6).total, 27);
  assert.equal(rollDice("2d20kl1", "normal", () => 8).total, 8);
  for (const text of [
    "0d6",
    "101d6",
    "1d3",
    "2d6+alert(1)",
    "1d20kh2",
    "1d6+2d8",
    "",
  ])
    assert.throws(() => parseDice(text));
  assert.throws(() => parseDice("2d20", "advantage"));
  assert.throws(() => parseDice("1d20", "critical"));
  assert.throws(() => parseDice("51d6", "critical"));
  assert.throws(() => rollDice("1d6", "normal", () => 7));
});
