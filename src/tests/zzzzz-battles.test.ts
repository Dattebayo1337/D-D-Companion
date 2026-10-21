import { HOST_COOKIE, hostSession } from "../services/lobby/auth";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseDataset, importDataset } from "../imports/pipeline";
import { battleCommand, listBattles } from "../services/battles/service";
import { campaignCommand } from "../services/campaigns/service";
import { emptyCampaign } from "../entities/campaign";
import { db } from "../database/client";
import { POST } from "../app/api/battles/route";
import { characterSchema } from "../entities/character";
import { characterCommand } from "../services/characters/service";
import { classRules } from "../domain/rules/character";
test("Сохранённые бои: бестиарий, снимки, версии, раунды и архив", async () => {
  const dataset = parseDataset(
    readFileSync("data/srd/monsters-2024.json", "utf8"),
  );
  await importDataset(dataset);
  const monster = dataset.entries.find((e) => e.nameOriginal === "Hell Hound")!;
  assert.equal(monster.kind, "Monster");
  let r = await battleCommand({
    action: "create",
    name: "Бой тест",
    edition: "5e_2024",
    opponents: [{ id: monster.id, count: 2 }],
  });
  assert.equal(r.data.participants.length, 2);
  assert.notEqual(r.data.participants[0].id, r.data.participants[1].id);
  const stale = r;
  let target = r.data.participants[0].id;
  r = await battleCommand({
    action: "damage",
    id: r.id,
    version: r.version,
    participantId: target,
    amount: 5,
  });
  assert.equal(r.data.participants[0].hp, 53);
  assert.equal(
    (await db.monster.findUniqueOrThrow({ where: { contentId: monster.id } }))
      .hitPoints,
    58,
  );
  await assert.rejects(
    () =>
      battleCommand({
        action: "heal",
        id: r.id,
        version: stale.version,
        participantId: target,
        amount: 5,
      }),
    /другом окне/,
  );
  r = await battleCommand({
    action: "rollInitiative",
    id: r.id,
    version: r.version,
  });
  assert.ok(
    r.data.participants.every(
      (p) =>
        p.initiative >= p.initiativeMod + 1 &&
        p.initiative <= p.initiativeMod + 20,
    ),
  );
  r = await battleCommand({ action: "start", id: r.id, version: r.version });
  await assert.rejects(
    () =>
      battleCommand({
        action: "add",
        id: r.id,
        version: r.version,
        kind: "monster",
        sourceId: monster.id,
      }),
    /подготовки/,
  );
  target = r.data.participants[0].id;
  for (let i = 0; i < 2; i++)
    r = await battleCommand({ action: "next", id: r.id, version: r.version });
  assert.equal(r.data.round, 2);
  r = await battleCommand({
    action: "tempHp",
    id: r.id,
    version: r.version,
    participantId: target,
    amount: 7,
  });
  r = await battleCommand({
    action: "tempHp",
    id: r.id,
    version: r.version,
    participantId: target,
    amount: 3,
  });
  assert.equal(r.data.participants[0].tempHp, 3);
  r = await battleCommand({ action: "finish", id: r.id, version: r.version });
  await assert.rejects(
    () =>
      battleCommand({
        action: "damage",
        id: r.id,
        version: r.version,
        participantId: target,
        amount: 1,
      }),
    /завершён/,
  );
  r = await battleCommand({
    action: "archive",
    id: r.id,
    version: r.version,
    archived: true,
  });
  await assert.rejects(
    () => battleCommand({ action: "prepare", id: r.id, version: r.version }),
    /архива/,
  );
  r = await battleCommand({
    action: "archive",
    id: r.id,
    version: r.version,
    archived: false,
  });
  assert.equal(
    (await listBattles()).find((b) => b.id === r.id)?.data.log.at(-1)?.text,
    "Бой восстановлен.",
  );
});
test("Сохранённые бои: кампании, NPC, редакции и состояния", async () => {
  const references = parseDataset(
    readFileSync("data/srd/references-2024.json", "utf8"),
  );
  await importDataset(references);
  const monsters = parseDataset(
    readFileSync("data/srd/monsters-2014.json", "utf8"),
  );
  await importDataset(monsters);
  const monster = monsters.entries[0];
  const npcId = randomUUID();
  const campaign = await campaignCommand({
    action: "create",
    data: {
      ...emptyCampaign("5e_2024"),
      editionMode: "Mixed",
      entries: [
        {
          id: npcId,
          kind: "npc",
          name: "Проводник",
          fields: {},
          notes: "",
          links: [],
          parentId: null,
          archived: false,
        },
      ],
    },
  });
  let r = await battleCommand({
    action: "create",
    name: "Смешанный бой",
    edition: "5e_2024",
    campaignId: campaign.id,
    opponents: [{ id: monster.id, count: 1 }],
  });
  assert.equal(r.data.participants[0].edition, "5e_2014");
  const manual = {
    name: "Проводник",
    maxHp: 20,
    hp: 20,
    ac: 12,
    initiative: 10,
    initiativeMod: 1,
    side: "ally",
    deathSaves: true,
    notes: "",
  };
  r = await battleCommand({
    action: "add",
    id: r.id,
    version: r.version,
    kind: "npc",
    sourceId: npcId,
    manual,
  });
  const target = r.data.participants[1].id;
  r = await battleCommand({
    action: "concentration",
    id: r.id,
    version: r.version,
    participantId: target,
    text: "Эффект",
  });
  r = await battleCommand({
    action: "damage",
    id: r.id,
    version: r.version,
    participantId: target,
    amount: 1,
  });
  assert.equal(r.data.participants[1].concentrationDC, 10);
  r = await battleCommand({
    action: "concentrationPass",
    id: r.id,
    version: r.version,
    participantId: target,
  });
  const condition = references.entries.find(
    (e) =>
      e.kind === "Reference" &&
      e.reference.category === "Condition" &&
      e.nameOriginal.startsWith("Incapacitated"),
  )!;
  r = await battleCommand({
    action: "condition",
    id: r.id,
    version: r.version,
    participantId: target,
    conditionId: condition.id,
    enabled: true,
  });
  assert.equal(r.data.participants[1].concentration, "");
  await assert.rejects(
    () =>
      battleCommand({
        action: "concentration",
        id: r.id,
        version: r.version,
        participantId: target,
        text: "Эффект",
      }),
    /не позволяет/,
  );
  await assert.rejects(
    () =>
      battleCommand({
        action: "create",
        name: "Не смешанный",
        edition: "5e_2024",
        opponents: [{ id: monster.id, count: 1 }],
      }),
    /Редакция/,
  );
  await assert.rejects(
    () =>
      battleCommand({
        action: "create",
        name: "Слишком много",
        edition: "5e_2014",
        opponents: [
          { id: monster.id, count: 100 },
          { id: monsters.entries[1].id, count: 1 },
        ],
      }),
    /100 участников/,
  );
  await assert.rejects(
    () =>
      battleCommand({
        action: "add",
        id: r.id,
        version: r.version,
        kind: "npc",
        sourceId: randomUUID(),
        manual,
      }),
    /не найден/,
  );
});
test("API боёв отклоняет неверный ввод и межсайтовую запись", async () => {
  const request = (body: string, origin = "http://localhost:3000") =>
    new Request("http://localhost:3000/api/battles", {
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
          JSON.stringify({ action: "create", name: "Бой", edition: "5e_2024" }),
          "https://foreign.test",
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (await POST(request(JSON.stringify({ action: "nonsense" })))).status,
    400,
  );
});
test("Боевой снимок героя не меняет лист; правка заметок не отменяет стабилизацию", async () => {
  const dataset = parseDataset(
    readFileSync("data/srd/references-2024.json", "utf8"),
  );
  await importDataset(dataset);
  const ref = (kind: string) =>
    dataset.entries.find(
      (e) => e.kind === "Reference" && e.reference.category === kind,
    )!.id;
  const fighter = Object.values(classRules).find(
    (c) => c.name === "Fighter" && c.edition === "5e_2024",
  )!;
  const character = await characterCommand({
    action: "create",
    data: characterSchema.parse({
      name: "Герой боя",
      edition: "5e_2024",
      speciesRaceId: ref("SpeciesRace"),
      backgroundId: ref("Background"),
      method: "Standard",
      abilities: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
      classes: [{ classId: fighter.id, level: 1, hpRolls: [6] }],
      hp: 1,
    }),
  });
  let r = await battleCommand({
    action: "create",
    name: "Снимок героя",
    edition: "5e_2024",
  });
  r = await battleCommand({
    action: "add",
    id: r.id,
    version: r.version,
    kind: "character",
    sourceId: character.id,
  });
  const target = r.data.participants[0].id;
  await assert.rejects(
    () =>
      battleCommand({
        action: "add",
        id: r.id,
        version: r.version,
        kind: "character",
        sourceId: character.id,
      }),
    /уже участвует/,
  );
  r = await battleCommand({
    action: "damage",
    id: r.id,
    version: r.version,
    participantId: target,
    amount: character.data.hp,
  });
  assert.equal(r.data.participants[0].hp, 0);
  assert.equal(
    (await db.character.findUniqueOrThrow({ where: { id: character.id } }))
      .version,
    character.version,
  );
  assert.equal(
    characterSchema.parse(
      (await db.character.findUniqueOrThrow({ where: { id: character.id } }))
        .data,
    ).hp,
    character.data.hp,
  );
  r = await battleCommand({
    action: "stabilize",
    id: r.id,
    version: r.version,
    participantId: target,
  });
  const p = r.data.participants[0];
  r = await battleCommand({
    action: "edit",
    id: r.id,
    version: r.version,
    participantId: target,
    manual: {
      name: p.name,
      maxHp: p.maxHp,
      hp: p.hp,
      ac: p.ac,
      initiative: p.initiative,
      initiativeMod: p.initiativeMod,
      side: p.side,
      deathSaves: p.deathSaves,
      notes: "Только заметка",
    },
  });
  assert.equal(r.data.participants[0].deathState, "stable");
});
