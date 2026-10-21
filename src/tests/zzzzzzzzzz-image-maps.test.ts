import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "../database/client";
import { POST, GET } from "../app/api/map-images/route";
import { GET as imageGet } from "../app/api/map-images/[id]/route";
import {
  validatePng,
  createImageMap,
  imageMapCommand,
} from "../services/maps/images";
import { MAX_PNG_BYTES } from "../entities/image-map";
import { ACCOUNT_COOKIE } from "../services/accounts/service";
import { digest, secretToken } from "../services/lobby/auth";
const metadata = {
  name: "Карта северных земель",
  description: "Обычная карта региона",
  category: "Регион",
  notes: "Личная заметка",
  campaignId: null,
};
const png = () =>
  sharp({
    create: { width: 320, height: 200, channels: 4, background: "#a3bfbd" },
  })
    .png()
    .toBuffer();
test("PNG upload validates real raster data and dimensions; corrupted or non-PNG files fail", async () => {
  const good = await validatePng(await png());
  assert.equal(good.width, 320);
  assert.equal(good.height, 200);
  assert.equal((await sharp(good.thumbnail).metadata()).format, "png");
  await assert.rejects(
    validatePng(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    /PNG/,
  );
  await assert.rejects(validatePng((await png()).subarray(0, 40)), /повреждён/);
  await assert.rejects(validatePng(Buffer.alloc(MAX_PNG_BYTES + 1)), /10 МБ/);
  const wide = await sharp({
    create: { width: 8193, height: 1, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(validatePng(wide), /слишком большой/);
});
test("PNG maps persist privately, omit blobs from catalog, protect images, versions and campaigns", async () => {
  const owner = randomUUID(),
    other = randomUUID(),
    token = secretToken();
  await db.account.create({
    data: {
      id: owner,
      username: `png_${owner.slice(0, 8)}`,
      displayName: "PNG QA",
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
  const base = "http://localhost:3000/api/map-images";
  const headers = {
    cookie: `${ACCOUNT_COOKIE}=${token}`,
    origin: "http://localhost:3000",
  };
  const upload = async (origin = headers.origin) => {
    const form = new FormData();
    form.set("data", JSON.stringify(metadata));
    form.set(
      "file",
      new Blob([new Uint8Array(await png())], { type: "image/png" }),
      "region.png",
    );
    return new Request(base, {
      method: "POST",
      headers: { ...headers, origin },
      body: form,
    });
  };
  const context = (id: string) => ({ params: Promise.resolve({ id }) });
  const campaignId = randomUUID();
  try {
    assert.equal((await GET(new Request(base))).status, 401);
    assert.equal(
      (await POST(await upload("https://foreign.test"))).status,
      400,
    );
    const response = await POST(await upload());
    assert.equal(response.status, 200);
    const row = await response.json();
    assert.equal(row.width, 320);
    assert.equal(row.image, undefined);
    const catalog = await (await GET(new Request(base, { headers }))).json();
    assert.equal(catalog.length, 1);
    assert.equal(catalog[0].thumbnail, undefined);
    assert.equal(
      (await imageGet(new Request(base + "/" + row.id), context(row.id)))
        .status,
      401,
    );
    const original = await imageGet(
      new Request(base + "/" + row.id, { headers }),
      context(row.id),
    );
    assert.equal(original.status, 200);
    assert.equal(original.headers.get("content-type"), "image/png");
    assert.match(original.headers.get("cache-control")!, /no-store/);
    assert.equal(
      (await sharp(new Uint8Array(await original.arrayBuffer())).metadata())
        .width,
      320,
    );
    const thumb = await imageGet(
      new Request(base + "/" + row.id + "?thumbnail=1", { headers }),
      context(row.id),
    );
    assert.equal(thumb.status, 200);
    const foreign = await createImageMap(metadata, await png(), other);
    assert.equal(
      (
        await imageGet(
          new Request(base + "/" + foreign.id, { headers }),
          context(foreign.id),
        )
      ).status,
      404,
    );
    await assert.rejects(
      imageMapCommand(
        { action: "archive", id: foreign.id, version: 1, archived: true },
        owner,
      ),
      /не найдена/,
    );
    await db.campaign.create({
      data: {
        id: campaignId,
        ownerId: other,
        name: "Foreign campaign",
        editionMode: "5e_2024",
        data: {},
      },
    });
    await assert.rejects(
      createImageMap({ ...metadata, campaignId }, await png(), owner),
      /Кампания недоступна/,
    );
    await db.campaign.update({
      where: { id: campaignId },
      data: { ownerId: owner },
    });
    const updated = await imageMapCommand(
      {
        action: "save",
        id: row.id,
        version: 1,
        data: { ...metadata, campaignId, name: "Обновлена" },
      },
      owner,
    );
    assert.equal(updated.version, 2);
    await assert.rejects(
      imageMapCommand(
        { action: "save", id: row.id, version: 1, data: metadata },
        owner,
      ),
      /другом окне/,
    );
    const archived = await imageMapCommand(
      { action: "archive", id: row.id, version: 2, archived: true },
      owner,
    );
    assert.equal(archived.archived, true);
    const restored = await imageMapCommand(
      { action: "archive", id: row.id, version: 3, archived: false },
      owner,
    );
    assert.equal(restored.archived, false);
    const tooLarge = new Request(base, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data; boundary=test",
        "Content-Length": String(MAX_PNG_BYTES + 200000),
      },
      body: "x",
    });
    assert.equal((await POST(tooLarge)).status, 413);
  } finally {
    await db.imageMap.deleteMany({
      where: { ownerId: { in: [owner, other] } },
    });
    await db.campaign.deleteMany({ where: { id: campaignId } });
    await db.account.delete({ where: { id: owner } });
  }
});
