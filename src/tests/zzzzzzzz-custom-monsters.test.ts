import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../database/client";
import { digest, secretToken } from "../services/lobby/auth";
import { ACCOUNT_COOKIE } from "../services/accounts/service";
import { POST } from "../app/api/custom-monsters/route";
import { GET as list } from "../app/api/content/route";
import { GET as detail } from "../app/api/content/[id]/route";
import { blankContent } from "../entities/workshop";
import type { Monster } from "../entities/content";
import { customMonsterCommand } from "../services/monsters/service";
import { searchWithCustom } from "../services/monsters/search";
import { search, filtersSchema } from "../search/service";
import { battleCommand } from "../services/battles/service";
import { saveCollection } from "../services/workshop";
const data = () => ({
  nameRu: "Сумеречный дракон теста",
  descriptionRu: "Хранит древние тайны.",
  edition: "5e_2024" as const,
  monster: {
    ...(blankContent("Monster", "5e_2024", randomUUID()) as Monster).monster,
    type: "Dragon" as const,
    hitPoints: 42,
    challengeRating: 2,
    xp: 450,
    speed: { walk: 30, fly: 60, swim: 0, climb: 0, burrow: 0 },
    sensesRu: "Тёмное зрение 60 футов",
    actions: [{ nameRu: "Пламя", descriptionRu: "Огненный урон 2d6." }],
  },
});
const req = (token = "", body?: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/custom-monsters", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      cookie: `${ACCOUNT_COOKIE}=${token}`,
      "Content-Type": "application/json",
      origin,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function account() {
  const id = randomUUID(),
    token = secretToken();
  await db.account.create({
    data: {
      id,
      username: "monster_" + id.slice(0, 8),
      displayName: "Тест",
      passwordHash: "test-fixture",
      recoveryHash: "test-fixture",
    },
  });
  await db.accountSession.create({
    data: {
      accountId: id,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  return { id, token };
}
async function cleanup(id: string) {
  await db.customMonster.deleteMany({ where: { ownerId: id } });
  await db.encounter.deleteMany({ where: { ownerId: id } });
  await db.collection.deleteMany({ where: { ownerId: id } });
  await db.account.delete({ where: { id } });
}
test("Мои монстры: создание, редактирование, конфликт версии и архив", async () => {
  const a = await account();
  try {
    const created = await POST(
      req(a.token, { action: "save", version: 0, data: data() }),
    );
    assert.equal(created.status, 200);
    const entry = await created.json();
    assert.equal(entry.personal, true);
    assert.equal(entry.monster.actions[0].nameRu, "Пламя");
    assert.equal(entry.monster.statBlockComplete, false);
    assert.equal(await db.content.count({ where: { id: entry.id } }), 0);
    const saved = await customMonsterCommand(
      {
        action: "save",
        id: entry.id,
        version: 1,
        data: { ...data(), nameRu: "Новая версия" },
      },
      a.id,
    );
    assert.equal(saved.contentVersion, 2);
    await assert.rejects(
      customMonsterCommand(
        { action: "save", id: entry.id, version: 1, data: data() },
        a.id,
      ),
      (e) => (e as { status: number }).status === 409,
    );
    await assert.rejects(
      customMonsterCommand(
        {
          action: "save",
          id: entry.id,
          version: 2,
          data: { ...data(), edition: "5e_2014" },
        },
        a.id,
      ),
      /редакции/,
    );
    const archived = await customMonsterCommand(
      { action: "archive", id: entry.id, version: 2, archived: true },
      a.id,
    );
    assert.equal(archived.personalArchived, true);
    assert.equal(
      (await searchWithCustom(filtersSchema.parse({ scope: "mine" }), a.id))
        .total,
      0,
    );
    assert.equal(
      (await searchWithCustom(filtersSchema.parse({ scope: "archived" }), a.id))
        .total,
      1,
    );
    assert.equal(
      (
        await detail(req(a.token), {
          params: Promise.resolve({ id: entry.id }),
        })
      ).status,
      404,
    );
    const restored = await customMonsterCommand(
      { action: "archive", id: entry.id, version: 3, archived: false },
      a.id,
    );
    assert.equal(restored.contentVersion, 4);
    assert.equal(restored.personalArchived, false);
  } finally {
    await cleanup(a.id);
  }
});
test("Мои монстры: другой аккаунт и гость не читают, не меняют и не используют записи", async () => {
  const a = await account(),
    b = await account();
  try {
    const entry = await customMonsterCommand(
      { action: "save", version: 0, data: data() },
      a.id,
    );
    for (const token of ["", b.token]) {
      assert.equal(
        (
          await detail(req(token), {
            params: Promise.resolve({ id: entry.id }),
          })
        ).status,
        404,
      );
      const r = await list(
        new Request(
          "http://localhost:3000/api/content?scope=mine&kind=Monster",
          { headers: { cookie: `${ACCOUNT_COOKIE}=${token}` } },
        ),
      );
      assert.equal((await r.json()).total, 0);
    }
    assert.equal(
      (
        await detail(req(a.token), {
          params: Promise.resolve({ id: entry.id }),
        })
      ).status,
      200,
    );
    assert.equal(
      (await POST(req("", { action: "save", version: 0, data: data() })))
        .status,
      401,
    );
    assert.equal(
      (
        await POST(
          req(b.token, {
            action: "save",
            id: entry.id,
            version: 1,
            data: data(),
          }),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await POST(
          req(b.token, {
            action: "archive",
            id: entry.id,
            version: 1,
            archived: true,
          }),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await POST(
          req(a.token, {
            action: "save",
            version: 0,
            data: data(),
            ownerId: b.id,
          }),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await POST(
          req(
            a.token,
            { action: "save", version: 0, data: data() },
            "https://other.test",
          ),
        )
      ).status,
      400,
    );
    await assert.rejects(
      battleCommand(
        {
          action: "create",
          name: "Чужой бой",
          edition: "5e_2024",
          opponents: [{ id: entry.id, count: 1 }],
        },
        b.id,
      ),
      /недоступно/,
    );
    await assert.rejects(
      saveCollection(
        {
          version: 0,
          data: {
            name: "Чужая коллекция",
            description: "",
            ids: [entry.id],
            archived: false,
          },
        },
        b.id,
      ),
    );
  } finally {
    await cleanup(a.id);
    await cleanup(b.id);
  }
});
test("Мои монстры: фильтры и пагинация общей библиотеки не теряют записи", async () => {
  const a = await account();
  try {
    for (let i = 0; i < 4; i++)
      await customMonsterCommand(
        {
          action: "save",
          version: 0,
          data: { ...data(), nameRu: `Сумеречный дракон ${i}` },
        },
        a.id,
      );
    const own = await searchWithCustom(
      filtersSchema.parse({
        scope: "mine",
        q: "drakon",
        cr: 2,
        type: "Dragon",
        movement: "fly",
        sense: "darkvision",
        edition: "5e_2024",
      }),
      a.id,
    );
    assert.equal(own.total, 4);
    for (const filter of [
      { edition: "5e_2014" },
      { type: "Beast" },
      { cr: 3 },
      { immunity: "Cold" },
      { legendary: "true" },
      { spellcaster: "true" },
      { movement: "swim" },
      { kind: "Spell" },
    ])
      assert.equal(
        (
          await searchWithCustom(
            filtersSchema.parse({ scope: "mine", ...filter }),
            a.id,
          )
        ).total,
        0,
      );
    const f = filtersSchema.parse({ kind: "Monster", pageSize: 3 });
    const pub = await search({ ...f, pageSize: 6 });
    const first = await searchWithCustom(f, a.id),
      second = await searchWithCustom({ ...f, page: 2 }, a.id),
      third = await searchWithCustom({ ...f, page: 3 }, a.id);
    assert.equal(first.total, pub.total + 4);
    assert.equal(first.items.length, 3);
    const all = [...first.items, ...second.items, ...third.items];
    assert.equal(new Set(all.map((e) => e.id)).size, all.length);
    assert.deepEqual(
      all.slice(4).map((e) => e.id),
      pub.items.slice(0, 5).map((e) => e.id),
    );
    assert.equal(
      (await searchWithCustom({ ...f, scope: "public" }, a.id)).total,
      pub.total,
    );
    assert.equal((await searchWithCustom(f, undefined)).total, pub.total);
  } finally {
    await cleanup(a.id);
  }
});
test("Мои монстры: боевой снимок, коллекции и отклонение неверных характеристик", async () => {
  const a = await account();
  try {
    const entry = await customMonsterCommand(
      { action: "save", version: 0, data: data() },
      a.id,
    );
    const battle = await battleCommand(
      {
        action: "create",
        name: "Тест боя",
        edition: "5e_2024",
        opponents: [{ id: entry.id, count: 2 }],
      },
      a.id,
    );
    assert.equal(battle.data.participants.length, 2);
    assert.equal(battle.data.participants[0].hp, 42);
    await saveCollection(
      {
        version: 0,
        data: {
          name: "Мои существа",
          description: "",
          ids: [entry.id],
          archived: false,
        },
      },
      a.id,
    );
    await customMonsterCommand(
      {
        action: "save",
        id: entry.id,
        version: 1,
        data: { ...data(), monster: { ...data().monster, hitPoints: 80 } },
      },
      a.id,
    );
    const snapshot = await db.encounter.findUniqueOrThrow({
      where: { id: battle.id },
    });
    assert.ok(JSON.stringify(snapshot.data).includes('"hp":42'));
    await customMonsterCommand(
      { action: "archive", id: entry.id, version: 2, archived: true },
      a.id,
    );
    await assert.rejects(
      battleCommand(
        {
          action: "create",
          name: "Архив",
          edition: "5e_2024",
          opponents: [{ id: entry.id, count: 1 }],
        },
        a.id,
      ),
      /недоступно/,
    );
    for (const patch of [
      { hitPoints: 0 },
      { armorClass: -1 },
      { challengeRating: 0.3 },
      { xp: -5 },
    ])
      assert.equal(
        (
          await POST(
            req(a.token, {
              action: "save",
              version: 0,
              data: { ...data(), monster: { ...data().monster, ...patch } },
            }),
          )
        ).status,
        400,
      );
    assert.equal(
      (
        await POST(
          req(a.token, {
            action: "save",
            version: 0,
            data: { ...data(), nameRu: "  " },
          }),
        )
      ).status,
      400,
    );
  } finally {
    await cleanup(a.id);
  }
});
