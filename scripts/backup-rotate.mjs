import { createBackup } from "./server-backup.mjs";
import { readdirSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export async function rotateBackup(
  source,
  directory,
  kind = "scheduled",
  keep = 14,
) {
  if (!["scheduled", "predeploy", "manual"].includes(kind))
    throw Error("Invalid backup kind");
  if (!Number.isInteger(keep) || keep < 2 || keep > 365)
    throw Error("BACKUP_KEEP must be 2..365");
  const root = resolve(directory);
  const name = `${kind}-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.db`;
  const result = await createBackup(source, join(root, name));
  writeFileSync(
    result.path + ".json",
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        image: process.env.DND_IMAGE ?? null,
        bytes: result.bytes,
      },
      null,
      2,
    ),
    { flag: "wx", mode: 0o600 },
  );
  // Prune only our own fully verified backups, and only after a new backup succeeds.
  const pattern = new RegExp(
    `^${kind}-\\d{4}-\\d{2}-\\d{2}T[0-9TZ.:-]+-[0-9a-f-]{36}\\.db$`,
  );
  const copies = readdirSync(root)
    .filter((n) => pattern.test(n) && statSync(join(root, n)).isFile())
    .sort()
    .reverse();
  for (const old of copies.slice(keep)) {
    unlinkSync(join(root, old));
    try {
      unlinkSync(join(root, old + ".json"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [source, directory, kind] = process.argv.slice(2);
    if (!source || !directory)
      throw Error(
        "Usage: backup-rotate.mjs <source> <backup-directory> [scheduled|predeploy|manual]",
      );
    console.log(
      await rotateBackup(
        source,
        directory,
        kind,
        Number(process.env.BACKUP_KEEP ?? 14),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
