import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../database/client";
import {
  blankMap,
  mapSchema,
  mapSvg,
  playerMap,
  resizeMap,
} from "../entities/map";
import { mapCommand, listMaps } from "../services/maps/service";
import { mapTemplates } from "../features/maps/templates";
import { GET, POST } from "../app/api/maps/route";
import { ACCOUNT_COOKIE } from "../services/accounts/service";
import { digest, secretToken } from "../services/lobby/auth";
test("Map grid, templates, resizing and player exports preserve content and omit secrets", () => {
  for (const m of mapTemplates)
    assert.equal(mapSchema.safeParse(m).success, true);
  const m = blankMap();
  m.notes = "SECRET NOTES";
  m.markers = [
    {
      id: randomUUID(),
      x: 2,
      y: 3,
      kind: "label",
      label: '<script>alert("x")</script>',
      secret: false,
    },
    {
      id: randomUUID(),
      x: 23,
      y: 17,
      kind: "treasure",
      label: "SECRET TREASURE",
      secret: true,
    },
  ];
  assert.equal(playerMap(m).markers.length, 1);
  assert.equal(playerMap(m).notes, "");
  const svg = mapSvg(m, true);
  assert.ok(!svg.includes("SECRET"));
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;"));
  assert.ok(mapSvg(m, false).includes("SECRET TREASURE"));
  m.cells[2 * m.width + 2] = "water";
  const small = resizeMap(m, 8, 8);
  assert.equal(small.cells[2 * 8 + 2], "water");
  assert.equal(small.markers.length, 1);
  assert.equal(mapSchema.safeParse(small).success, true);
  assert.equal(mapSchema.safeParse({ ...m, cells: [] }).success, false);
  assert.equal(
    mapSchema.safeParse({ ...m, markers: [{ ...m.markers[0], x: 60 }] })
      .success,
    false,
  );
});
test("Personal maps enforce ownership, versions, campaign boundaries, archive and route authentication", async () => {
  const owner = randomUUID(),
    other = randomUUID(),
    token = secretToken();
  await db.account.create({
    data: {
      id: owner,
      username: `map_${owner.slice(0, 8)}`,
      displayName: "Map test",
      passwordHash: "fixture",
      recoveryHash: "fixture",
    },
  });
  await db.accountSession.create({
    data: {
      accountId: owner,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  const req = (body?: unknown, origin = "http://localhost:3000", auth = true) =>
    new Request("http://localhost:3000/api/maps", {
      method: body ? "POST" : "GET",
      headers: {
        cookie: auth ? `${ACCOUNT_COOKIE}=${token}` : "",
        origin,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    assert.equal((await GET(req(undefined, undefined, false))).status, 401);
    const save = {
      action: "save",
      version: 0,
      campaignId: null,
      data: blankMap(),
    };
    assert.equal((await POST(req(save, "https://evil.example"))).status, 400);
    assert.equal((await POST(req({ ...save, ownerId: other }))).status, 400);
    const response = await POST(req(save));
    assert.equal(response.status, 200);
    const first = await response.json();
    assert.equal((await listMaps(owner)).length, 1);
    assert.equal((await listMaps(other)).length, 0);
    await assert.rejects(
      mapCommand({ ...save, id: first.id, version: 1 }, other),
      /не найдена/,
    );
    await assert.rejects(
      mapCommand(
        { action: "archive", id: first.id, version: 1, archived: true },
        other,
      ),
      /не найдена/,
    );
    const next = await mapCommand(
      {
        ...save,
        id: first.id,
        version: 1,
        data: { ...blankMap(), name: "Изменена" },
      },
      owner,
    );
    assert.equal(next.version, 2);
    await assert.rejects(
      mapCommand({ ...save, id: first.id, version: 1 }, owner),
      /другом окне/,
    );
    await assert.rejects(
      mapCommand({ ...save, campaignId: randomUUID() }, owner),
      /Кампания недоступна/,
    );
    const archived = await mapCommand(
      { action: "archive", id: first.id, version: 2, archived: true },
      owner,
    );
    assert.equal(archived.archived, true);
    const restored = await mapCommand(
      { action: "archive", id: first.id, version: 3, archived: false },
      owner,
    );
    assert.equal(restored.archived, false);
    assert.equal(
      (await POST(req({ ...save, data: { ...blankMap(), width: 100 } })))
        .status,
      400,
    );
  } finally {
    await db.adventureMap.deleteMany({ where: { ownerId: owner } });
    await db.account.delete({ where: { id: owner } });
  }
});
