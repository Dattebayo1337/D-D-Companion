import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  parseReadingList,
  updateReadingList,
} from "../features/compendium/reading-list";

test("Закладки: история ограничена, повторное открытие поднимает карточку и не меняет избранное", () => {
  let list = parseReadingList(null);
  const entries = Array.from({ length: 40 }, () => ({
    id: randomUUID(),
    edition: "5e_2014" as const,
  }));
  list = updateReadingList(list, "toggle", entries[0]);
  for (const entry of entries) list = updateReadingList(list, "visit", entry);
  assert.equal(list.recent.length, 30);
  assert.equal(list.recent[0].id, entries[39].id);
  list = updateReadingList(list, "visit", entries[20]);
  assert.equal(list.recent[0].id, entries[20].id);
  assert.equal(list.recent.filter((e) => e.id === entries[20].id).length, 1);
  assert.deepEqual(list.favorites, [entries[0]]);
  assert.deepEqual(updateReadingList(list, "clearRecent").favorites, [
    entries[0],
  ]);
  assert.equal(
    updateReadingList(list, "toggle", entries[0]).favorites.length,
    0,
  );
});
test("Закладки: импорт проверяет UUID, редакцию, версию, ограничения и удаляет дубли", () => {
  const item = { id: randomUUID(), edition: "5e_2024" as const };
  const list = { version: 1, favorites: [item, item], recent: [item] };
  assert.equal(parseReadingList(JSON.stringify(list)).favorites.length, 1);
  for (const bad of [
    { ...list, version: 2 },
    { ...list, favorites: [{ ...item, id: "../secret" }] },
    { ...list, recent: [{ ...item, edition: "other" }] },
    { ...list, favorites: Array(201).fill(item) },
    { ...list, token: "must-not-be-stored" },
  ])
    assert.throws(() => parseReadingList(JSON.stringify(bad)));
  assert.throws(() => parseReadingList("broken json"));
  const full = {
    version: 1 as const,
    favorites: Array.from({ length: 200 }, () => ({
      ...item,
      id: randomUUID(),
    })),
    recent: [],
  };
  assert.throws(() => updateReadingList(full, "toggle", item), /200/);
  assert.equal(
    updateReadingList(full, "removeFavorite", full.favorites[0]).favorites
      .length,
    199,
  );
});
