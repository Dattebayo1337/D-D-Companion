import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { characterSchema } from "../entities/character";
import { datasetSchema } from "../entities/content";
import { classRules, deriveCharacter } from "../domain/rules/character";
import { TabletopSheet } from "../features/characters/TabletopSheet";
test("Лист за столом: доступные заклинания, отдельные ячейки и короткие заметки", () => {
  const wizard = Object.values(classRules).find(
    (r) => r.edition === "5e_2014" && r.name === "Wizard",
  )!;
  const spells = datasetSchema.parse(
    JSON.parse(readFileSync("data/srd/spells-2014.json", "utf8")),
  ).entries;
  const ready = spells.find((e) => e.nameOriginal === "Magic Missile")!,
    known = spells.find((e) => e.nameOriginal === "Fireball")!;
  const c = characterSchema.parse({
    name: "Герой",
    edition: "5e_2014",
    speciesRaceId: randomUUID(),
    backgroundId: randomUUID(),
    method: "Standard",
    abilities: { STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 },
    classes: [{ classId: wizard.id, level: 3, hpRolls: [6, 4, 4] }],
    hp: 9,
    tempHp: 3,
    slotsSpent: [4, 1, 0, 0, 0, 0, 0, 0, 0],
    spells: [
      { spellId: ready.id, classId: wizard.id, status: "Prepared" },
      { spellId: known.id, classId: wizard.id, status: "Known" },
    ],
    notes: "Проверенная заметка. ".repeat(200),
  });
  const html = renderToStaticMarkup(
    createElement(TabletopSheet, {
      character: c,
      stats: deriveCharacter(c),
      entries: spells,
      command: async () => true,
      patch: () => {},
      open: () => {},
      navigate: () => {},
    }),
  );
  assert.ok(html.includes(ready.nameRu));
  assert.ok(!html.includes(known.nameRu));
  assert.match(html, /0\s*\/\s*4/);
  assert.match(html, /1\s*\/\s*2/);
  assert.ok(html.includes("Нет активной концентрации"));
  assert.ok(!html.includes(c.notes));
});
