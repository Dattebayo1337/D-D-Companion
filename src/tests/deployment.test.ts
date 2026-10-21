import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rotateBackup } from "../../scripts/backup-rotate.mjs";
import { GET } from "../app/api/health/ready/route";
import { db } from "../database/client";
import { isPublicRequest } from "../services/lobby/access";

test("Readiness checks Prisma and hides database errors with 503", async () => {
  assert.equal(isPublicRequest("/api/health/ready", "GET"), true);
  assert.equal(isPublicRequest("/api/health/ready", "POST"), false);
  assert.equal((await GET()).status, 200);
  const originalQuery = db.$queryRaw;
  db.$queryRaw = () => {
    throw Error("private-db-path-secret");
  };
  try {
    const response = await GET();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { status: "unavailable" });
  } finally {
    db.$queryRaw = originalQuery;
  }
});

test("Backup rotation preserves predeploy and unrelated files; failed backup never prunes", async () => {
  const source = process.env.DATABASE_URL!.slice(5);
  assert.ok(source.includes("dnd-companion-test-"));
  const directory = mkdtempSync(join(tmpdir(), "dnd-rotation-"));
  writeFileSync(join(directory, "keep-me.db"), "unrelated");
  for (let i = 0; i < 3; i++)
    await rotateBackup(source, directory, "scheduled", 2);
  await rotateBackup(source, directory, "predeploy", 2);
  assert.equal(
    readdirSync(directory).filter(
      (n) => n.startsWith("scheduled-") && n.endsWith(".db"),
    ).length,
    2,
  );
  assert.equal(
    readdirSync(directory).filter(
      (n) => n.startsWith("predeploy-") && n.endsWith(".db"),
    ).length,
    1,
  );
  const before = readdirSync(directory).sort();
  await assert.rejects(
    rotateBackup(join(directory, "missing.db"), directory, "scheduled", 2),
  );
  assert.deepEqual(readdirSync(directory).sort(), before);
  assert.equal(
    readFileSync(join(directory, "keep-me.db"), "utf8"),
    "unrelated",
  );
  await assert.rejects(rotateBackup(source, directory, "scheduled", 0));
});
