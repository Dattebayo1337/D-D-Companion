import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RulesText } from "../features/compendium/RulesText";
import { parseDataset, auditDataset } from "../imports/pipeline";
import type { Spell } from "../entities/content";
const datasets = [2014, 2024].map((y) =>
  parseDataset(readFileSync(`data/srd/spells-${y}.json`, "utf8")),
);
function spell(edition: number, name: string) {
  return datasets[edition].entries.find(
    (e) => e.nameOriginal === name,
  ) as Spell;
}
test("SRD: контрольные суммы всех исходников совпадают", () => {
  const manifest = JSON.parse(
    readFileSync("data/raw/srd-sources.json", "utf8"),
  );
  for (const file of manifest.files)
    assert.equal(
      createHash("sha256")
        .update(readFileSync("data/raw/" + file.path))
        .digest("hex"),
      file.sha256,
      file.path,
    );
});
test("SRD: полный состав английского и русского индексов без пропусков и дублей", () => {
  for (const [i, y] of [2014, 2024].entries()) {
    const d = datasets[i];
    assert.equal(d.entries.length, i === 0 ? 319 : 339);
    const base = `data/raw/srd-${y}/omnisgm/`;
    const glossary = i === 0 ? "16_Glossary" : "14_Glossary";
    for (const lang of ["en", "ru"]) {
      const names = readFileSync(
        `${base}${lang}/${glossary}/02_Spells.md`,
        "utf8",
      )
        .split("\n")
        .filter((l) => l.startsWith("|"))
        .slice(2)
        .map((l) => l.split("|")[lang === "en" ? 1 : 2].trim());
      assert.deepEqual(
        new Set(d.entries.map((e) => e.nameOriginal)),
        new Set(names),
      );
    }
    assert.equal(new Set(d.entries.map((e) => e.id)).size, d.entries.length);
    assert.deepEqual(auditDataset(d).issues, []);
    assert.deepEqual(auditDataset(d).localization, []);
    assert.deepEqual(
      new Set(d.entries.map((e) => (e as Spell).spell.level)),
      new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    );
    for (const e of d.entries) {
      assert.ok(e.descriptionRu.length > 50, e.nameOriginal);
      assert.ok(e.descriptionOriginal.length > 50, e.nameOriginal);
      assert.ok((e as Spell).spell.classes.length, e.nameOriginal);
    }
  }
});
test("SRD: редакции не смешиваются — лечение и кислотные брызги", () => {
  assert.match(spell(0, "Cure Wounds").descriptionRu, /1к8/);
  assert.match(spell(1, "Cure Wounds").descriptionRu, /2d8/);
  assert.equal(spell(0, "Acid Splash").spell.school, "Conjuration");
  assert.equal(spell(1, "Acid Splash").spell.school, "Evocation");
  assert.notEqual(spell(0, "Cure Wounds").id, spell(1, "Cure Wounds").id);
});
test("SRD: дистанции, материальные компоненты, концентрация и ритуалы", () => {
  for (const i of [0, 1]) {
    assert.equal(spell(i, "Cure Wounds").spell.rangeKind, "Touch");
    assert.equal(spell(i, "Detect Magic").spell.rangeKind, "Self");
    assert.equal(spell(i, "Detect Magic").spell.ritual, true);
    assert.equal(spell(i, "Detect Magic").spell.concentration, true);
    assert.equal(spell(i, "Fireball").spell.rangeFeet, 150);
    assert.ok(spell(i, "Fireball").spell.materialComponentRu);
    assert.equal(spell(i, "Revivify").spell.materialCost, 300);
    assert.equal(spell(i, "Revivify").spell.materialConsumed, true);
    assert.equal(spell(i, "Sending").spell.rangeKind, "Unlimited");
  }
});
test("SRD: проверенные боевые поля и лечение сохраняют различия редакций", () => {
  for (const i of [0, 1]) {
    assert.equal(spell(i, "Fireball").spell.savingThrow, "DEX");
    assert.equal(spell(i, "Fireball").spell.damage, "8к6");
    assert.equal(spell(i, "Fireball").spell.damageType, "Fire");
    assert.equal(spell(i, "Fire Bolt").spell.attackType, "Ranged");
    assert.equal(spell(i, "Shocking Grasp").spell.attackType, "Melee");
    assert.equal(spell(i, "Magic Missile").spell.attackType, null);
    assert.equal(spell(i, "Magic Missile").spell.savingThrow, null);
    assert.match(spell(i, "Magic Missile").spell.damage, /каждая стрела/);
    assert.ok(spell(i, "Fireball").spell.higherLevelsRu.length > 40);
    assert.equal(
      datasets[i].entries.filter((e) => e.contentVersion === 2).length,
      8,
    );
  }
  assert.match(spell(0, "Cure Wounds").spell.healing, /^1к8/);
  assert.match(spell(1, "Cure Wounds").spell.healing, /^2к8/);
  assert.match(spell(0, "Healing Word").spell.healing, /^1к4/);
  assert.match(spell(1, "Healing Word").spell.healing, /^2к4/);
});

test("SRD: таблицы и вложенные характеристики существ не потеряны", () => {
  assert.match(spell(1, "Teleport").descriptionRu, /\|/);
  assert.match(spell(1, "Find Steed").descriptionRu, /Потусторонний скакун/);
  const html = renderToStaticMarkup(
    createElement(RulesText, { text: spell(1, "Teleport").descriptionRu }),
  );
  assert.match(html, /<table>/);
  assert.match(html, /<th>/);
  const safe = renderToStaticMarkup(
    createElement(RulesText, { text: "<script>alert(1)</script>" }),
  );
  assert.ok(!safe.includes("<script>"));
  assert.ok(safe.includes("&lt;script&gt;"));
});
