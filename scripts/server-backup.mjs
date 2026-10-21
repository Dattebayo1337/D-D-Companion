import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, openSync, closeSync, unlinkSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const required = [
  "Content",
  "Character",
  "Campaign",
  "Collection",
  "Encounter",
  "Account",
  "LocalizationOverride",
  "CustomMonster",
  "AdventureMap",
  "ImageMap",
];
export function inspectDatabase(filename) {
  if (!existsSync(filename) || !statSync(filename).isFile())
    throw new Error("Файл базы не найден.");
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec("PRAGMA trusted_schema=OFF");
    const integrity = db.prepare("PRAGMA quick_check").all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== "ok")
      throw new Error("Нарушена целостность SQLite.");
    if (db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Нарушены ссылки в базе.");
    const schema = db
      .prepare(
        "SELECT type, name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
      )
      .all();
    if (
      schema.some(
        (r) =>
          r.type === "trigger" ||
          r.type === "view" ||
          /CREATE\s+VIRTUAL/i.test(r.sql ?? ""),
      )
    )
      throw new Error("Неожиданная исполняемая схема базы.");
    for (const name of required)
      if (!schema.some((r) => r.type === "table" && r.name === name))
        throw new Error(`Это не полная база приложения: отсутствует ${name}.`);
    return { bytes: statSync(filename).size, schema: JSON.stringify(schema) };
  } finally {
    db.close();
  }
}
export async function createBackup(sourcePath, destinationPath) {
  const source = resolve(sourcePath),
    destination = resolve(destinationPath);
  if (source === destination)
    throw new Error("Копия должна иметь отдельный путь.");
  inspectDatabase(source);
  // Reserve exclusively: never overwrite an existing backup, even accidentally.
  closeSync(openSync(destination, "wx", 0o600));
  let db;
  try {
    db = new DatabaseSync(source, { readOnly: true });
    await backup(db, destination);
    inspectDatabase(destination);
  } catch (error) {
    unlinkSync(destination);
    throw error;
  } finally {
    db?.close();
  }
  return { path: destination, bytes: statSync(destination).size };
}
export async function restoreBackup(sourcePath, targetPath, stopped = false) {
  if (!stopped)
    throw new Error(
      "Остановите сервер и явно передайте --server-stopped. Восстановление заменяет всю базу.",
    );
  const source = resolve(sourcePath),
    target = resolve(targetPath);
  if (source === target) throw new Error("Источник и рабочая база совпадают.");
  if (
    ["-wal", "-shm", "-journal"].some((suffix) => existsSync(target + suffix))
  )
    throw new Error(
      "Рядом с базой есть журнал SQLite. Убедитесь, что сервер остановлен и база штатно закрыта.",
    );
  const incoming = inspectDatabase(source),
    current = inspectDatabase(target);
  if (incoming.schema !== current.schema)
    throw new Error(
      "Схемы базы различаются. Используйте соответствующую версию приложения и её миграции.",
    );
  const safetyPath = `${target}.before-restore-${randomUUID()}.db`;
  await createBackup(target, safetyPath);
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, target);
    inspectDatabase(target);
  } catch (error) {
    const safety = new DatabaseSync(safetyPath, { readOnly: true });
    try {
      await backup(safety, target);
    } finally {
      safety.close();
    }
    throw error;
  } finally {
    db.close();
  }
  return { restored: target, safetyPath };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [action, source, target, flag] = process.argv.slice(2);
  try {
    if (!source || (action !== "inspect" && !target))
      throw new Error(
        "Использование: node scripts/server-backup.mjs backup <база> <копия> | inspect <копия> | restore <копия> <база> --server-stopped",
      );
    if (action === "backup") console.log(await createBackup(source, target));
    else if (action === "inspect") {
      const result = inspectDatabase(source);
      console.log({ valid: true, bytes: result.bytes });
    } else if (action === "restore")
      console.log(
        await restoreBackup(source, target, flag === "--server-stopped"),
      );
    else throw new Error("Неизвестная команда.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
