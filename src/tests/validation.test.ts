import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  auditDataset,
  parseDataset,
  DatasetError,
  MAX_IMPORT_BYTES,
} from "@/imports/pipeline";
import { validateRussian, validateTerminology } from "@/localization/validate";
import { distanceLabel } from "@/localization/labels";
const raw = readFileSync("data/examples/homebrew.json", "utf8");
const fixture = () => parseDataset(raw);
test("Учебный набор проходит структурную и русскую проверку", () =>
  assert.equal(auditDataset(fixture()).valid, true));
test("Повтор UUID отклоняется", () => {
  const d = fixture();
  d.entries.push(d.entries[0]);
  assert.equal(auditDataset(d).valid, false);
});
test("Редакция книги и записи должны совпадать", () => {
  const d = fixture();
  d.entries[0].edition = "5e_2024";
  assert.ok(auditDataset(d).issues.some((i) => i.message.includes("Редакция")));
});
test("Разорванная ссылка на источник отклоняется", () => {
  const d = fixture();
  d.sources = [];
  assert.ok(auditDataset(d).issues.some((i) => i.message.includes("Источник")));
});
test("Разорванная связь контента отклоняется", () => {
  const d = fixture();
  d.relations = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      sourceId: d.entries[0].id,
      targetId: "20000000-0000-4000-8000-000000000002",
      relationType: "Related",
    },
  ];
  assert.equal(auditDataset(d).valid, false);
});
test("Пустое русское название не заменяется оригиналом", () => {
  const d = fixture();
  d.entries[0].nameRu = "";
  assert.ok(
    validateRussian(d.entries).some(
      (i) => i.message === "Отсутствует русская локализация.",
    ),
  );
  assert.equal(auditDataset(d).valid, false);
});
test("Черновик без перевода импортируется только в рабочую базу", () => {
  const d = fixture();
  d.entries[0].nameRu = "";
  d.entries[0].translationStatus = "Missing";
  const a = auditDataset(d);
  assert.equal(a.valid, true);
  assert.ok(a.localization.length);
});
test("Латиница и шаблоны в русском тексте обнаруживаются", () => {
  const d = fixture();
  d.entries[0].descriptionRu = "Текст {{placeholder}} Fire damage";
  assert.ok(
    validateRussian(d.entries).some((i) => i.message.includes("Английский")),
  );
  assert.ok(
    validateRussian(d.entries).some((i) => i.message.includes("шаблон")),
  );
});
test("Вложенные действия монстра также проверяются", () => {
  const d = fixture();
  const m = d.entries.find((e) => e.kind === "Monster");
  assert.ok(m?.kind === "Monster");
  m.monster.actions[0].descriptionRu = "Attack";
  assert.ok(validateRussian(d.entries).length);
});
test("Неизвестные enum и дополнительные пути отклоняются Zod", () => {
  const data = JSON.parse(raw);
  data.entries[0].spell.school = "UNKNOWN";
  assert.throws(() => parseDataset(JSON.stringify(data)), DatasetError);
  const path = JSON.parse(raw);
  path.path = "../../file";
  assert.throws(() => parseDataset(JSON.stringify(path)), DatasetError);
});
test("Неверный JSON и слишком большой файл отклоняются", () => {
  assert.throws(() => parseDataset("{"), DatasetError);
  assert.throws(
    () => parseDataset(" ".repeat(MAX_IMPORT_BYTES + 1)),
    DatasetError,
  );
});
test("Конфликт терминологии обнаруживается", () => {
  const d = fixture();
  const term = {
    id: d.entries[0].id,
    original: "Fire",
    russian: "Огонь",
    category: "DamageType" as const,
    edition: "5e_2014" as const,
    aliases: [],
    notes: "",
    createdAt: d.entries[0].createdAt,
    updatedAt: d.entries[0].updatedAt,
  };
  assert.equal(
    validateTerminology([term, { ...term, russian: "Пламя" }]).length,
    1,
  );
});
test("Единицы пересчитываются из канонического значения без накопления округлений", () => {
  assert.equal(distanceLabel(30, true), "9.14 м");
  assert.equal(distanceLabel(30, false), "30 фт");
  assert.equal(distanceLabel(30, true), "9.14 м");
});
