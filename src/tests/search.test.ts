import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, searchDocument, searchScore } from "@/search/normalize";
const document = searchDocument([
  "Чернильный дракон",
  "Ink Drake",
  "Книжный ящер",
  "Шёпот страниц",
]);
test("Поиск: Е и Ё равнозначны", () =>
  assert.equal(normalize("ШЁПОТ"), normalize("шепот")));
test("Поиск: падежи и множественное число", () => {
  for (const word of ["дракон", "дракона", "драконы", "драконами"])
    assert.ok(searchScore(document, word) > 0, word);
});
test("Поиск: английское название", () =>
  assert.ok(searchScore(document, "ink drake") > 0));
test("Поиск: псевдоним", () =>
  assert.ok(searchScore(document, "книжный ящер") > 0));
test("Поиск: транслитерация", () =>
  assert.ok(searchScore(document, "chernilnyy") > 0));
test("Поиск: опечатка", () => assert.ok(searchScore(document, "дракан") > 0));
test("Поиск: частичное слово", () =>
  assert.ok(searchScore(document, "драк") > 0));
test("Поиск: все слова запроса обязательны", () =>
  assert.equal(searchScore(document, "дракон молния"), 0));
test("Поиск: пустой запрос допускает все записи", () =>
  assert.equal(searchScore(document, ""), 1));
