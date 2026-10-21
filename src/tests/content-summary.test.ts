import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDataset } from "../imports/pipeline";
import { shortPassage, contentSummary } from "../domain/content-summary";
test("Краткие состояния показывают эффекты вместо вводной фразы", () => {
  const entry = parseDataset(
    readFileSync("data/srd/references-2024.json", "utf8"),
  ).entries.find((e) => e.nameOriginal === "Blinded [Condition]")!;
  assert.ok(entry);
  const text = contentSummary(entry).text;
  assert.ok(!text.includes("Пока вы находитесь"));
  assert.match(text, /не можете видеть/i);
  assert.match(text, /преимуществом/i);
});
test("Краткие описания: очистка разметки, границы предложений и длины", () => {
  assert.equal(
    shortPassage(
      "# Заголовок\n\nТаблица: заголовок\n\n| а | б |\n\nВы получаете **преимущество** на следующую проверку. Действует до конца хода. Третье предложение.",
    ),
    "Вы получаете преимущество на следующую проверку. Действует до конца хода.",
  );
  assert.equal(
    shortPassage("[Ссылка](https://example.test) — это описание предмета."),
    "Ссылка — это описание предмета.",
  );
  assert.ok(shortPassage("Длинное описание ".repeat(100)).length <= 361);
});
test("Краткие описания: SRD и дополнения обеих редакций имеют русский обзор", () => {
  for (const year of [2014, 2024])
    for (const kind of [
      "srd/references",
      "srd/spells",
      "srd/monsters",
      "phb/backgrounds",
      "phb/subclasses",
      "phb/feats",
      "dndsu/supplement",
      "dndsu/options",
    ]) {
      for (const entry of parseDataset(
        readFileSync(`data/${kind}-${year}.json`, "utf8"),
      ).entries) {
        const summary = contentSummary(entry);
        assert.ok(
          /[а-яё]/i.test(summary.text),
          `${entry.nameRu}: пустой обзор`,
        );
        assert.ok(!summary.text.includes("https://"), entry.nameRu);
        assert.ok(!summary.text.includes("|---"), entry.nameRu);
        assert.ok(summary.text.length <= 361, entry.nameRu);
      }
    }
});
test("Краткие описания: приёмы существа и отсутствие подмены Homebrew", () => {
  const monster = parseDataset(
    readFileSync("data/srd/monsters-2024.json", "utf8"),
  ).entries.find((e) => e.nameOriginal === "Hell Hound")!;
  assert.ok(
    contentSummary(monster).facts.some((f) =>
      f.value.includes("Огненное дыхание"),
    ),
  );
  const wizard = parseDataset(
    readFileSync("data/srd/references-2024.json", "utf8"),
  ).entries.find((e) => e.nameRu === "Волшебник")!;
  const custom = {
    ...wizard,
    contentOrigin: "Homebrew" as const,
    descriptionRu:
      "Этот авторский класс использует совершенно другие способности.",
  };
  assert.equal(contentSummary(custom).text, custom.descriptionRu);
});
