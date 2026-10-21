import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../database/client";
import { json } from "../database/repository";
import { emptyCampaign } from "../entities/campaign";
import { characterSchema } from "../entities/character";
import { classRules } from "../domain/rules/character";
import { lobbyCommand, lobbyIndex, lobbyView } from "../services/lobby/service";
import {
  digest,
  HOST_COOKIE,
  hostSession,
  isHost,
  PLAYER_COOKIE,
  sessionCookie,
} from "../services/lobby/auth";
import { POST, GET } from "../app/api/lobby/route";
const request = (cookie = "") =>
  new Request("http://localhost:3000/api/lobby", { headers: { cookie } });
const host = () => request(`${HOST_COOKIE}=${hostSession()}`);
const settings = {
  name: "Лобби теста",
  campaignId: null,
  characterIds: [] as string[],
  notes: "GM-SECRET-NOTES",
};
async function create() {
  const result = await lobbyCommand(host(), {
    action: "create",
    data: settings,
  });
  assert.ok(result.id && result.invite);
  return { id: result.id, invite: result.invite };
}
async function join(invite: string) {
  const result = await lobbyCommand(request(), {
    action: "join",
    invite,
    name: "Игрок",
  });
  assert.ok(result.token);
  return request(`${PLAYER_COOKIE}=${result.token}`);
}
test("Лобби: роль мастера нельзя подделать; сессия подписана и имеет срок", () => {
  assert.equal(isHost(host()), true);
  assert.equal(isHost(request(`${HOST_COOKIE}=Master`)), false);
  assert.equal(isHost(request(`${HOST_COOKIE}=1.fake.fake`)), false);
  const token = hostSession();
  assert.equal(isHost(request(`${HOST_COOKIE}=${token}x`)), false);
  assert.match(
    sessionCookie(request(), PLAYER_COOKIE, "test"),
    /HttpOnly; SameSite=Lax/,
  );
});
test("Лобби: игрок видит только опубликованные полные листы, а не кампанию и секреты", async () => {
  const classId = Object.values(classRules).find(
    (c) => c.edition === "5e_2014",
  )!.id;
  const data = characterSchema.parse({
    name: "Общий герой",
    edition: "5e_2014",
    method: "Manual",
    speciesRaceId: randomUUID(),
    backgroundId: randomUUID(),
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    classes: [{ classId, level: 1, hpRolls: [6] }],
    notes: "Заметки героя видны группе",
  });
  const characterId = randomUUID(),
    hiddenId = randomUUID(),
    campaignId = randomUUID();
  await db.character.create({
    data: {
      id: characterId,
      name: data.name,
      edition: data.edition,
      data: json(data),
    },
  });
  await db.character.create({
    data: {
      id: hiddenId,
      name: "Личный герой",
      edition: data.edition,
      data: json({ ...data, name: "Личный герой" }),
    },
  });
  await db.campaign.create({
    data: {
      id: campaignId,
      name: "PRIVATE-CAMPAIGN",
      editionMode: "5e_2014",
      data: json({
        ...emptyCampaign("5e_2014"),
        name: "PRIVATE-CAMPAIGN",
        notes: "CAMPAIGN-SECRET",
      }),
    },
  });
  let id = "";
  try {
    const made = await lobbyCommand(host(), {
      action: "create",
      data: { ...settings, campaignId, characterIds: [characterId] },
    });
    assert.ok(made.id && made.invite);
    id = made.id;
    const player = await join(made.invite);
    const view = await lobbyView(player, id);
    assert.equal(view.role, "Игрок");
    assert.equal(view.master, undefined);
    assert.deepEqual(
      view.characters.map((c) => c.id),
      [characterId],
    );
    assert.equal(view.characters[0].data.notes, data.notes);
    assert.doesNotMatch(
      JSON.stringify(view),
      /GM-SECRET|CAMPAIGN-SECRET|PRIVATE-CAMPAIGN|Личный герой/,
    );
    const dm = await lobbyView(host(), id);
    assert.equal(dm.master?.campaign?.notes, "CAMPAIGN-SECRET");
    assert.equal(dm.master?.settings.notes, settings.notes);
    await db.character.update({
      where: { id: characterId },
      data: { data: json({ ...data, hp: 3 }), version: { increment: 1 } },
    });
    assert.equal((await lobbyView(player)).characters[0].data.hp, 3);
    await assert.rejects(lobbyIndex(player), /аккаунт/);
    await assert.rejects(
      lobbyCommand(player, { action: "save", id, version: 1, data: settings }),
      /аккаунт/,
    );
    await assert.rejects(
      lobbyCommand(request(), { action: "create", data: settings }),
      /аккаунт/,
    );
    await assert.rejects(
      lobbyCommand(request(), {
        action: "join",
        invite: made.invite,
        name: "Взлом",
        role: "Мастер",
      }),
    );
    await assert.rejects(lobbyView(player, randomUUID()), /недоступно/);
  } finally {
    if (id) await db.lobby.delete({ where: { id } });
    await db.campaign.delete({ where: { id: campaignId } });
    await db.character.deleteMany({
      where: { id: { in: [characterId, hiddenId] } },
    });
  }
});
test("Лобби: ротация приглашения, отзыв, закрытие и истечение сессии", async () => {
  const lobby = await create();
  try {
    const player = await join(lobby.invite);
    const rotated = await lobbyCommand(host(), {
      action: "invite",
      id: lobby.id,
    });
    assert.ok(rotated.invite);
    await assert.rejects(join(lobby.invite), /Приглашение/);
    const view = await lobbyView(player);
    await lobbyCommand(host(), {
      action: "kick",
      id: lobby.id,
      memberId: view.participants[0].id,
    });
    await assert.rejects(lobbyView(player), /Нет доступа/);
    await assert.rejects(join(rotated.invite), /Приглашение/);
    const next = await lobbyCommand(host(), { action: "invite", id: lobby.id });
    assert.ok(next.invite);
    const active = await join(next.invite);
    await lobbyCommand(host(), { action: "close", id: lobby.id, closed: true });
    await assert.rejects(lobbyView(active), /закрыто/);
    await assert.rejects(join(next.invite), /Приглашение/);
    await lobbyCommand(host(), {
      action: "close",
      id: lobby.id,
      closed: false,
    });
    await db.lobbyMember.updateMany({
      where: { lobbyId: lobby.id },
      data: { expiresAt: new Date(0) },
    });
    await assert.rejects(lobbyView(active), /Нет доступа/);
  } finally {
    await db.lobby.delete({ where: { id: lobby.id } });
  }
});
test("Лобби: конфликт версий и недоступные персонажи не перезаписывают заметки", async () => {
  const lobby = await create();
  try {
    await lobbyCommand(host(), {
      action: "save",
      id: lobby.id,
      version: 1,
      data: { ...settings, notes: "Новая заметка" },
    });
    await assert.rejects(
      lobbyCommand(host(), {
        action: "save",
        id: lobby.id,
        version: 1,
        data: settings,
      }),
      /уже изменено/,
    );
    await assert.rejects(
      lobbyCommand(host(), {
        action: "save",
        id: lobby.id,
        version: 2,
        data: { ...settings, characterIds: [randomUUID()] },
      }),
      /отсутствует/,
    );
    assert.equal(
      (await lobbyView(host(), lobby.id)).master?.settings.notes,
      "Новая заметка",
    );
    const stored = await db.lobby.findUniqueOrThrow({
      where: { id: lobby.id },
    });
    assert.equal(stored.inviteHash, digest(lobby.invite));
    assert.notEqual(stored.inviteHash, lobby.invite);
  } finally {
    await db.lobby.delete({ where: { id: lobby.id } });
  }
});
test("API лобби: CSRF, отсутствие сессии и секрет сессии только в HttpOnly cookie", async () => {
  assert.equal((await GET(request())).status, 401);
  const cross = await POST(
    new Request("http://localhost:3000/api/lobby", {
      method: "POST",
      headers: {
        origin: "https://evil.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "create", data: settings }),
    }),
  );
  assert.equal(cross.status, 400);
  const lobby = await create();
  try {
    const response = await POST(
      new Request("http://localhost:3000/api/lobby", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "join",
          name: "Игрок API",
          invite: lobby.invite,
        }),
      }),
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
    assert.deepEqual(await response.json(), { id: lobby.id });
  } finally {
    await db.lobby.delete({ where: { id: lobby.id } });
  }
});
