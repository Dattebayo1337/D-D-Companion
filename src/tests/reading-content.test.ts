import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { datasetSchema } from "../entities/content";
import { readingContent } from "../domain/reading-content";
const load = (path: string) => datasetSchema.parse(JSON.parse(readFileSync(path, "utf8"))).entries;

test("Коллегия духов 2014: непустое краткое содержание и все 12 историй в подробностях", () => {
  const entry = load("data/dndsu/options-2014.json").find(e => e.nameOriginal === "College of Spirits")!;
  const content = readingContent(entry);
  assert.ok(content.summary.text.length > 80);
  assert.match(content.summary.text, /вдохновение/);
  assert.ok(content.hasDetails);
  const stories = content.features.find(f => f.nameRu === "Истории духов: эффекты 1–12")!;
  for (let n = 1; n <= 12; n++) assert.ok(stories.descriptionRu.includes(`| ${n} |`));
});
test("Одна короткая сводка не получает пустой подробный режим", () => {
  const entry = load("data/dndsu/options-2014.json").find(e => e.nameOriginal === "College of Spirits")!;
  assert.ok(entry.kind === "Reference");
  const short = { ...entry, descriptionRu: "Помогает союзникам и управляет духами.", reference: { ...entry.reference, features: [] } };
  assert.equal(readingContent(short).hasDetails, false);
});
test("Отдельные умения отображаются независимо от происхождения и не дублируют текст", () => {
  const entry = load("data/srd/references-2014.json").find(e => e.nameOriginal === "College of Lore")!;
  assert.ok(entry.kind === "Reference");
  assert.equal(readingContent(entry).features.length, 0);
  const separate = { ...entry, descriptionRu: "Бард, который собирает знания и поддерживает союзников." };
  assert.equal(readingContent(separate).features.length, entry.reference.features.length);
});

test("Свойства за пределами краткой карточки и отдельная таблица развития доступны подробно", () => {
  const entry = load("data/srd/references-2014.json").find(e => e.nameOriginal === "Bard")!;
  assert.ok(entry.kind === "Reference");
  const separate = { ...entry, descriptionRu: "Бард поддерживает союзников магией и вдохновением." };
  const reading = readingContent(separate);
  assert.ok(reading.hasDetails);
  assert.ok(reading.properties.length > 4);
  assert.equal(reading.progression.length, 20);
  const withSlots = { ...separate, reference: { ...separate.reference, progression: [{ ...separate.reference.progression[0], spellSlots: [2] }] } };
  assert.deepEqual(readingContent(withSlots).progression[0].spellSlots, [2]);
});

test("Все каталоги: непустая сводка, отдельные свойства и умения не теряются", () => {
  for (const year of [2014, 2024]) for (const kind of ["srd/references", "srd/spells", "srd/monsters", "phb/backgrounds", "phb/subclasses", "phb/feats", "dndsu/supplement", "dndsu/options"]) {
    for (const entry of load(`data/${kind}-${year}.json`)) {
      const reading = readingContent(entry);
      assert.ok(reading.summary.text.trim(), entry.nameRu);
      if (reading.features.length || reading.properties.length || reading.progression.length) assert.ok(reading.hasDetails, entry.nameRu);
    }
  }
});
