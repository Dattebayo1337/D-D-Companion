import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../database/client";
import {
  accountCommand,
  identity,
  ACCOUNT_COOKIE,
  rateLimit,
  requireAdmin,
} from "../services/accounts/service";
import {
  HOST_COOKIE,
  hostSession,
  digest,
  secretToken,
} from "../services/lobby/auth";
import { POST as authPost, GET as authGet } from "../app/api/account/route";
import {
  GET as characterGet,
  POST as characterPost,
} from "../app/api/characters/route";
import {
  GET as campaignGet,
  POST as campaignPost,
} from "../app/api/campaigns/route";
import { GET as battleGet, POST as battlePost } from "../app/api/battles/route";
import { POST as workshopPost } from "../app/api/workshop/route";
import { lobbyCommand, lobbyIndex, lobbyView } from "../services/lobby/service";
import { saveCollection, listCollections } from "../services/workshop";
import { emptyCampaign } from "../entities/campaign";
import { characterSchema } from "../entities/character";
import { json } from "../database/repository";
const password = "A long test passphrase 123";
const request = (
  token = "",
  path = "/api/account",
  body?: unknown,
  origin = "http://localhost:3000",
) =>
  new Request("http://localhost:3000" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      cookie: token ? `${ACCOUNT_COOKIE}=${token}` : "",
      origin,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function register(prefix: string) {
  const username = prefix + randomUUID().slice(0, 8);
  const result = await accountCommand(request(), {
    action: "register",
    username,
    displayName: prefix,
    password,
  });
  assert.ok(result.token && result.recoveryCode);
  const user = await identity(request(result.token));
  assert.ok(user?.id);
  return { ...result, username, id: user.id, req: request(result.token) };
}
async function cleanup(id: string) {
  await db.lobby.deleteMany({ where: { ownerId: id } });
  await db.encounter.deleteMany({ where: { ownerId: id } });
  await db.campaign.deleteMany({ where: { ownerId: id } });
  await db.character.deleteMany({ where: { ownerId: id } });
  await db.collection.deleteMany({ where: { ownerId: id } });
  await db.lobbyMember.deleteMany({ where: { accountId: id } });
  await db.account.delete({ where: { id } });
}
test("Аккаунты: пароли и токены хранятся хешами, профиль не раскрывает секреты", async () => {
  const a = await register("identity");
  try {
    const row = await db.account.findUniqueOrThrow({ where: { id: a.id } });
    assert.match(row.passwordHash, /^scrypt-v1\$/);
    assert.notEqual(row.passwordHash, password);
    assert.equal(row.recoveryHash, digest(a.recoveryCode!));
    assert.equal(row.role, "user");
    const session = await db.accountSession.findUniqueOrThrow({
      where: { tokenHash: digest(a.token!) },
    });
    assert.notEqual(session.tokenHash, a.token);
    assert.equal(await identity(request("forged")), null);
    assert.equal((await identity(a.req))?.id, a.id);
    const profile = await authGet(a.req);
    const text = await profile.text();
    assert.ok(!text.includes(row.passwordHash));
    assert.ok(!text.includes(row.recoveryHash));
    assert.ok(!text.includes(a.token!));
    await assert.rejects(requireAdmin(a.req), /администратору/);
    await assert.rejects(
      accountCommand(request(), {
        action: "register",
        username: a.username.toUpperCase(),
        displayName: "duplicate",
        password,
      }),
      /занят/,
    );
    const forbidden = await authPost(
      request("", "/api/account", {
        action: "register",
        username: "role_injection",
        displayName: "X",
        password,
        role: "admin",
      }),
    );
    assert.equal(forbidden.status, 400);
    const failed = await authPost(
      request("", "/api/account", {
        action: "login",
        username: a.username,
        password: "wrong",
      }),
    );
    assert.equal(failed.status, 401);
    const unknown = await authPost(
      request("", "/api/account", {
        action: "login",
        username: "no_such_account",
        password: "wrong",
      }),
    );
    assert.deepEqual(await failed.json(), await unknown.json());
    const login = await authPost(
      request("", "/api/account", {
        action: "login",
        username: a.username,
        password,
      }),
    );
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie")!, /HttpOnly; SameSite=Lax/);
    assert.deepEqual(await login.json(), { ok: true });
    await db.accountSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(await identity(a.req), null);
  } finally {
    await cleanup(a.id);
  }
});
test("Аккаунты: восстановление, смена пароля и отзыв всех сессий", async () => {
  const a = await register("recovery");
  try {
    const second = await accountCommand(request(), {
      action: "login",
      username: a.username,
      password,
    });
    await assert.rejects(
      accountCommand(request(), {
        action: "recover",
        username: a.username,
        recoveryCode: "wrong",
        password: "replacement password 1",
      }),
      /подтвердить/,
    );
    const recovered = await accountCommand(request(), {
      action: "recover",
      username: a.username,
      recoveryCode: a.recoveryCode,
      password: "replacement password 1",
    });
    assert.ok(recovered.recoveryCode && recovered.token);
    assert.notEqual(recovered.recoveryCode, a.recoveryCode);
    assert.equal(await identity(a.req), null);
    assert.equal(await identity(request(second.token)), null);
    await assert.rejects(
      accountCommand(request(), {
        action: "recover",
        username: a.username,
        recoveryCode: a.recoveryCode,
        password,
      }),
      /подтвердить/,
    );
    const changed = await accountCommand(request(recovered.token), {
      action: "password",
      currentPassword: "replacement password 1",
      password: "replacement password 2",
    });
    assert.equal(await identity(request(recovered.token)), null);
    assert.ok(await identity(request(changed.token)));
    const old = await db.account.findUniqueOrThrow({ where: { id: a.id } });
    await accountCommand(request(changed.token), { action: "logoutAll" });
    assert.equal(await identity(request(changed.token)), null);
    // A session inserted late by a racing login still carries the revoked generation.
    const stale = secretToken();
    await db.accountSession.create({
      data: {
        accountId: a.id,
        authVersion: old.authVersion,
        tokenHash: digest(stale),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    assert.equal(await identity(request(stale)), null);
    const fresh = await accountCommand(request(), {
      action: "login",
      username: a.username,
      password: "replacement password 2",
    });
    await accountCommand(request(fresh.token), { action: "logout" });
    assert.equal(await identity(request(fresh.token)), null);
  } finally {
    await cleanup(a.id);
  }
});
test("Аккаунты: CSRF, ограничение запросов и закрытая регистрация", async () => {
  assert.equal(
    (
      await authPost(
        request("", "/api/account", { action: "logout" }, "https://other.test"),
      )
    ).status,
    400,
  );
  const huge = await authPost(
    new Request("http://localhost:3000/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", padding: "x".repeat(9000) }),
    }),
  );
  assert.equal(huge.status, 400);
  const key = randomUUID();
  await rateLimit(key, 2);
  await rateLimit(key, 2);
  await assert.rejects(
    rateLimit(key, 2),
    (e) => (e as { status: number }).status === 429,
  );
  const prior = process.env.DND_REGISTRATION;
  process.env.DND_REGISTRATION = "closed";
  try {
    assert.equal(
      (
        await authPost(
          request("", "/api/account", {
            action: "register",
            username: "closedreg",
            displayName: "X",
            password,
          }),
        )
      ).status,
      403,
    );
  } finally {
    if (prior === undefined) delete process.env.DND_REGISTRATION;
    else process.env.DND_REGISTRATION = prior;
  }
});
test("Два аккаунта: приватные API, ссылки на чужие записи и роли лобби изолированы", async () => {
  const a = await register("owner"),
    b = await register("player");
  try {
    const ca = await campaignPost(
      request(a.token, "/api/campaigns", {
        action: "create",
        data: {
          ...emptyCampaign("5e_2024"),
          name: "A PRIVATE",
          notes: "SECRET_A",
        },
      }),
    );
    assert.equal(ca.status, 200);
    const campaign = await ca.json();
    assert.deepEqual(
      await (await campaignGet(request(b.token, "/api/campaigns"))).json(),
      [],
    );
    const denied = await campaignPost(
      request(b.token, "/api/campaigns", {
        action: "archive",
        id: campaign.id,
        version: 1,
        archived: true,
      }),
    );
    assert.equal(denied.status, 404);
    const cd = characterSchema.parse({
      name: "A CHARACTER",
      edition: "5e_2024",
      method: "Manual",
      speciesRaceId: randomUUID(),
      backgroundId: randomUUID(),
      abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      classes: [{ classId: randomUUID(), level: 1, hpRolls: [6] }],
    });
    const char = await db.character.create({
      data: {
        id: randomUUID(),
        ownerId: a.id,
        name: cd.name,
        edition: cd.edition,
        data: json(cd),
      },
    });
    assert.deepEqual(
      await (
        await characterGet(request(b.token, "/api/characters?edition=5e_2024"))
      ).json(),
      [],
    );
    assert.equal(
      (
        await characterPost(
          request(b.token, "/api/characters", {
            action: "archive",
            id: char.id,
            version: 1,
            archived: true,
          }),
        )
      ).status,
      404,
    );
    const attach = await campaignPost(
      request(b.token, "/api/campaigns", {
        action: "create",
        data: {
          ...emptyCampaign("5e_2024"),
          name: "Steal",
          characterIds: [char.id],
        },
      }),
    );
    assert.equal(attach.status, 400);
    const battle = await battlePost(
      request(a.token, "/api/battles", {
        action: "create",
        name: "A Battle",
        edition: "5e_2024",
        campaignId: campaign.id,
      }),
    );
    assert.equal(battle.status, 200);
    const br = await battle.json();
    assert.deepEqual(
      await (await battleGet(request(b.token, "/api/battles"))).json(),
      [],
    );
    assert.equal(
      (
        await battlePost(
          request(b.token, "/api/battles", {
            action: "notes",
            id: br.id,
            version: 1,
            text: "attack",
          }),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await battlePost(
          request(b.token, "/api/battles", {
            action: "create",
            name: "Steal",
            edition: "5e_2024",
            campaignId: campaign.id,
          }),
        )
      ).status,
      400,
    );
    const col = await saveCollection(
      {
        version: 0,
        data: {
          name: "A collection",
          description: "",
          ids: [],
          archived: false,
        },
      },
      a.id,
    );
    assert.deepEqual(await listCollections(b.id), []);
    await assert.rejects(
      saveCollection(
        {
          id: col.id,
          version: 1,
          data: { name: "Stolen", description: "", ids: [], archived: false },
        },
        b.id,
      ),
    );
    assert.equal(
      (await workshopPost(request(b.token, "/api/workshop", {}))).status,
      403,
    );
    const settings = {
      name: "A lobby",
      campaignId: campaign.id,
      characterIds: [char.id],
      notes: "LOBBY_SECRET",
    };
    const lobby = await lobbyCommand(a.req, {
      action: "create",
      data: settings,
    });
    assert.ok(lobby.id && lobby.invite);
    assert.equal((await lobbyIndex(b.req)).lobbies.length, 0);
    await assert.rejects(lobbyView(b.req, lobby.id), /Нет доступа/);
    for (const action of [
      { action: "invite", id: lobby.id },
      { action: "close", id: lobby.id, closed: true },
      { action: "save", id: lobby.id, version: 1, data: settings },
    ])
      await assert.rejects(lobbyCommand(b.req, action), /не найдено/);
    await assert.rejects(
      lobbyCommand(b.req, { action: "create", data: settings }),
      /персонажей/,
    );
    await lobbyCommand(b.req, {
      action: "join",
      invite: lobby.invite,
      name: "Player",
    });
    const view = await lobbyView(b.req, lobby.id);
    assert.equal(view.role, "Игрок");
    assert.equal(view.master, undefined);
    assert.equal(view.characters.length, 1);
    assert.ok(!JSON.stringify(view).includes("SECRET"));
    assert.ok((await lobbyView(a.req, lobby.id)).master);
    assert.equal((await lobbyIndex(b.req)).lobbies.length, 1);
    await lobbyCommand(b.req, { action: "leave", id: lobby.id });
    await assert.rejects(lobbyView(b.req, lobby.id), /Нет доступа/);
    assert.equal(
      (await characterGet(request("", "/api/characters?edition=5e_2024")))
        .status,
      401,
    );
  } finally {
    await cleanup(a.id);
    await cleanup(b.id);
  }
});
test("Первоначальный администратор: ключ, перенос старых данных, отключение старой сессии", async () => {
  const username = "admin" + randomUUID().slice(0, 8);
  const legacy = new Request("http://localhost:3000/", {
    headers: { cookie: `${HOST_COOKIE}=${hostSession()}` },
  });
  assert.ok(await identity(legacy));
  const old = await db.campaign.create({
    data: {
      id: randomUUID(),
      name: "Legacy",
      editionMode: "5e_2024",
      data: json({ ...emptyCampaign("5e_2024"), name: "Legacy" }),
    },
  });
  let id: string | null = null;
  try {
    const result = await accountCommand(request(), {
      action: "register",
      username,
      displayName: "Admin",
      password,
      setupKey: process.env.DND_HOST_KEY,
    });
    const user = await identity(request(result.token));
    assert.equal(user?.role, "admin");
    assert.ok(user?.id);
    id = user.id;
    assert.equal(
      (await db.campaign.findUniqueOrThrow({ where: { id: old.id } })).ownerId,
      id,
    );
    assert.equal(await identity(legacy), null);
    await assert.rejects(
      accountCommand(request(), {
        action: "register",
        username: username + "2",
        displayName: "Admin2",
        password,
        setupKey: process.env.DND_HOST_KEY,
      }),
      /уже выполнена/,
    );
  } finally {
    // Restore pre-existing fixtures; never make a later test an accidental new owner.
    if (id) {
      await db.character.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      });
      await db.campaign.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      });
      await db.encounter.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      });
      await db.collection.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      });
      await db.lobby.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      });
      await cleanup(id);
    }
    await db.campaign.delete({ where: { id: old.id } });
    await db.authLimit.deleteMany({
      where: { key: "installation-admin-claimed" },
    });
  }
});
