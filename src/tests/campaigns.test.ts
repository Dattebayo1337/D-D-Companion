import { HOST_COOKIE, hostSession } from "../services/lobby/auth";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  campaignSchema,
  emptyCampaign,
  type CampaignEntry,
} from "../entities/campaign";
import { campaignCommand, listCampaigns } from "../services/campaigns/service";
import { db } from "../database/client";
import { POST } from "../app/api/campaigns/route";
const entry = (kind: CampaignEntry["kind"] = "location"): CampaignEntry => ({
  id: randomUUID(),
  kind,
  name: "Запись",
  fields: {},
  notes: "",
  links: [],
  parentId: null,
  archived: false,
});
test("Кампании: связи, циклы локаций, уникальность и допустимые поля", () => {
  const a = entry(),
    b = { ...entry(), parentId: a.id },
    npc = entry("npc");
  npc.links = [b.id];
  const data = { ...emptyCampaign("5e_2024"), entries: [a, b, npc] };
  assert.ok(campaignSchema.safeParse(data).success);
  assert.ok(
    !campaignSchema.safeParse({
      ...data,
      entries: [a, { ...b, parentId: b.id }],
    }).success,
  );
  assert.ok(
    !campaignSchema.safeParse({
      ...data,
      entries: [{ ...a, parentId: b.id }, b],
    }).success,
  );
  assert.ok(!campaignSchema.safeParse({ ...data, entries: [a, a] }).success);
  assert.ok(
    !campaignSchema.safeParse({
      ...data,
      entries: [{ ...npc, links: [randomUUID()] }],
    }).success,
  );
  assert.ok(
    !campaignSchema.safeParse({
      ...data,
      entries: [{ ...npc, fields: { secretEnglish: "x" } }],
    }).success,
  );
  assert.ok(
    !campaignSchema.safeParse({
      ...data,
      entries: [{ ...entry("quest"), fields: { status: "Победа" } }],
    }).success,
  );
});
test("Кампании: создание, сохранение, конфликт версий, архив и восстановление", async () => {
  const data = {
    ...emptyCampaign("5e_2014"),
    name: "Тестовая кампания",
    entries: [entry("quest")],
  };
  let r = await campaignCommand({ action: "create", data });
  assert.equal(r.version, 1);
  assert.equal(r.data.entries.length, 1);
  const old = r;
  r = await campaignCommand({
    action: "save",
    id: r.id,
    version: r.version,
    data: { ...data, notes: "Сохранённые заметки" },
  });
  assert.equal(r.version, 2);
  await assert.rejects(
    () =>
      campaignCommand({
        action: "save",
        id: old.id,
        version: old.version,
        data,
      }),
    /другом окне/,
  );
  assert.equal(
    (await listCampaigns()).find((c) => c.id === r.id)?.data.notes,
    "Сохранённые заметки",
  );
  r = await campaignCommand({
    action: "archive",
    id: r.id,
    version: r.version,
    archived: true,
  });
  await assert.rejects(
    () =>
      campaignCommand({ action: "save", id: r.id, version: r.version, data }),
    /архива/,
  );
  r = await campaignCommand({
    action: "archive",
    id: r.id,
    version: r.version,
    archived: false,
  });
  assert.equal(r.archived, false);
  assert.equal(r.data.notes, "Сохранённые заметки");
  const imported = await campaignCommand({
    action: "create",
    data: JSON.parse(JSON.stringify(r.data)),
  });
  assert.notEqual(imported.id, r.id);
  assert.deepEqual(imported.data, r.data);
});
test("Кампании: ссылки персонажей и смешанная редакция", async () => {
  const id = randomUUID();
  await db.character.create({
    data: { id, name: "Герой", edition: "5e_2014", data: {} },
  });
  const data = { ...emptyCampaign("5e_2024"), characterIds: [id] };
  try {
    await assert.rejects(
      () => campaignCommand({ action: "create", data }),
      /смешанную/,
    );
    const r = await campaignCommand({
      action: "create",
      data: { ...data, editionMode: "Mixed" },
    });
    assert.deepEqual(r.data.characterIds, [id]);
    await assert.rejects(
      () =>
        campaignCommand({
          action: "create",
          data: { ...data, characterIds: [randomUUID()] },
        }),
      /не найден/,
    );
  } finally {
    await db.campaign.deleteMany({ where: { name: data.name } });
    await db.character.delete({ where: { id } });
  }
});
test("API кампаний: неверный JSON, чужой origin и недопустимый ввод", async () => {
  const request = (body: string, origin = "http://localhost:3000") =>
    new Request("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin,
        cookie: `${HOST_COOKIE}=${hostSession()}`,
      },
      body,
    });
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal(
    (
      await POST(
        request(
          JSON.stringify({ action: "create", data: emptyCampaign("5e_2024") }),
          "https://foreign.test",
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (await POST(request(JSON.stringify({ action: "create", data: {} }))))
      .status,
    400,
  );
});
