import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createBackup, restoreBackup } from "../../scripts/server-backup.mjs";
import {
  applyBrowserBackup,
  captureBrowserBackup,
  parseBrowserBackup,
} from "../domain/browser-backup";

test("Копия браузера: разрешённые ключи, проверка формата и откат при переполнении", () => {
  const values = new Map<string, string>([
    ["companion-edition", "5e_2014"],
    ["unrelated-token", "private"],
  ]);
  let fail = false;
  const storage = {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      if (fail && key === "companion-settings") {
        fail = false;
        throw new Error("quota");
      }
      values.set(key, value);
    },
  };
  const copy = captureBrowserBackup(storage);
  assert.deepEqual(Object.keys(copy.values), ["companion-edition"]);
  assert.throws(() =>
    parseBrowserBackup(
      JSON.stringify({ ...copy, values: { "unrelated-token": "new" } }),
    ),
  );
  assert.throws(() =>
    parseBrowserBackup(
      JSON.stringify({ ...copy, values: { "companion-edition": "bad" } }),
    ),
  );
  fail = true;
  assert.throws(
    () =>
      applyBrowserBackup(storage, {
        ...copy,
        values: { "companion-edition": "5e_2024", "companion-settings": "{}" },
      }),
    /Прежние значения/,
  );
  assert.equal(values.get("companion-edition"), "5e_2014");
  assert.equal(values.has("companion-settings"), false);
  applyBrowserBackup(storage, {
    ...copy,
    values: { "companion-edition": "5e_2024" },
  });
  assert.equal(values.get("companion-edition"), "5e_2024");
  assert.equal(values.get("unrelated-token"), "private");
});

test("Копия сервера: полное восстановление, предварительная копия и отказ при неверном файле", async () => {
  const source = process.env.DATABASE_URL!.slice(5);
  assert.ok(
    source.includes("dnd-companion-test-"),
    "Only the isolated test database may be copied here",
  );
  const dir = mkdtempSync(join(tmpdir(), "dnd-backup-test-"));
  const copy = join(dir, "copy.db"),
    target = join(dir, "target.db"),
    malformed = join(dir, "bad.db");
  await createBackup(source, copy);
  await createBackup(source, target);
  await assert.rejects(createBackup(source, copy));
  await assert.rejects(restoreBackup(copy, target), /server-stopped/);
  const modified = new DatabaseSync(target);
  modified
    .prepare("INSERT INTO Edition (id, nameRu) VALUES (?, ?)")
    .run("backup-test-marker", "Проверка");
  modified.close();
  writeFileSync(malformed, "invalid sqlite");
  await assert.rejects(restoreBackup(malformed, target, true));
  writeFileSync(target + "-journal", "busy");
  await assert.rejects(restoreBackup(copy, target, true), /журнал/);
  unlinkSync(target + "-journal");
  const changedSchema = new DatabaseSync(target);
  changedSchema.exec("CREATE TABLE BackupSchemaMismatch (id TEXT)");
  changedSchema.close();
  await assert.rejects(restoreBackup(copy, target, true), /Схемы/);
  const fixSchema = new DatabaseSync(target);
  fixSchema.exec("DROP TABLE BackupSchemaMismatch");
  fixSchema.close();
  const result = await restoreBackup(copy, target, true);
  assert.ok(existsSync(result.safetyPath));
  const restored = new DatabaseSync(target, { readOnly: true });
  assert.equal(
    restored
      .prepare("SELECT id FROM Edition WHERE id = ?")
      .get("backup-test-marker"),
    undefined,
  );
  restored.close();
  const safety = new DatabaseSync(result.safetyPath, { readOnly: true });
  assert.ok(
    safety
      .prepare("SELECT id FROM Edition WHERE id = ?")
      .get("backup-test-marker"),
  );
  safety.close();
});
