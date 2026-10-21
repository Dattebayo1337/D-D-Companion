import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../database/client";
import { lobbyCommand, lobbyView } from "../services/lobby/service";
import { tabletopCommand, handoutImage } from "../services/lobby/tabletop";
import {
  HOST_COOKIE,
  PLAYER_COOKIE,
  hostSession,
} from "../services/lobby/auth";
import { treasuryBalances } from "../entities/tabletop";
const request = (cookie = "") =>
  new Request("http://localhost:3000/api/lobby", { headers: { cookie } });
const host = () => request(`${HOST_COOKIE}=${hostSession()}`);

test("Группа: черновики и изображения закрыты, публикация явная, журнал доступен игроку, казна только мастеру", async () => {
  const made = await lobbyCommand(host(), {
    action: "create",
    data: {
      name: "Группа",
      campaignId: null,
      characterIds: [],
      notes: "MASTER-SECRET",
    },
  });
  assert.ok(made.id && made.invite);
  const id = made.id;
  const joined = await lobbyCommand(request(), {
    action: "join",
    invite: made.invite,
    name: "Игрок журнала",
  });
  assert.ok(joined.token);
  const player = request(`${PLAYER_COOKIE}=${joined.token}`);
  const handout = {
    id: randomUUID(),
    title: "Слух",
    text: "DRAFT-SECRET",
    published: false,
    imageMapId: null,
  };
  const run = async (who: Request, operation: unknown) =>
    tabletopCommand(who, {
      action: "tabletop",
      id,
      version: (await lobbyView(who, id)).version,
      operation,
    });
  try {
    await run(host(), { type: "handout", data: handout });
    const hidden = await lobbyView(player, id);
    assert.doesNotMatch(JSON.stringify(hidden), /DRAFT-SECRET|MASTER-SECRET/);
    await assert.rejects(
      handoutImage(player, id, handout.id),
      /не опубликовано/,
    );
    await assert.rejects(
      run(player, { type: "handout", data: { ...handout, published: true } }),
      /только мастеру/,
    );
    await run(host(), {
      type: "handout",
      data: { ...handout, published: true },
    });
    assert.equal(
      (await lobbyView(player, id)).tabletop.handouts[0].text,
      handout.text,
    );
    const old = await lobbyView(player, id);
    await run(player, { type: "journal", text: "Нашли мост" });
    await assert.rejects(
      tabletopCommand(player, {
        action: "tabletop",
        id,
        version: old.version,
        operation: { type: "journal", text: "Устаревшая запись" },
      }),
      /изменились/,
    );
    const journal = (await lobbyView(host(), id)).tabletop.journal;
    assert.equal(journal.length, 1);
    assert.equal(journal[0].author, "Игрок журнала");
    await assert.rejects(
      run(player, {
        type: "ledger",
        item: "Золото",
        delta: 10,
        reason: "Добыча",
        recipient: "",
      }),
      /только мастеру/,
    );
    await run(host(), {
      type: "ledger",
      item: "Золото",
      delta: 10,
      reason: "Добыча",
      recipient: "",
    });
    await run(host(), {
      type: "ledger",
      item: "Золото",
      delta: -4,
      reason: "Покупка",
      recipient: "Бард",
    });
    await assert.rejects(
      run(host(), {
        type: "ledger",
        item: "Золото",
        delta: -7,
        reason: "Лишнее",
        recipient: "",
      }),
      /недостаточно/,
    );
    assert.deepEqual(
      treasuryBalances((await lobbyView(player, id)).tabletop.ledger),
      [{ item: "Золото", quantity: 6 }],
    );
    await run(host(), { type: "handout", data: handout });
    assert.equal((await lobbyView(player, id)).tabletop.handouts.length, 0);
    await assert.rejects(
      tabletopCommand(request(), {
        action: "tabletop",
        id,
        version: 1,
        operation: { type: "journal", text: "Чужой" },
      }),
      /Нет доступа/,
    );
    await lobbyCommand(host(), {
      action: "kick",
      id,
      memberId: hidden.participants[0].id,
    });
    await assert.rejects(
      run(player, { type: "journal", text: "После отзыва" }),
      /Нет доступа/,
    );
    await lobbyCommand(host(), { action: "close", id, closed: true });
    await assert.rejects(
      run(host(), { type: "journal", text: "Закрыто" }),
      /закрыто/,
    );
  } finally {
    await db.lobby.delete({ where: { id } });
  }
});

test("Материал: чужую PNG-карту нельзя прикрепить, опубликованное изображение доступно только участнику", async () => {
  const made = await lobbyCommand(host(), {
    action: "create",
    data: { name: "Карты", campaignId: null, characterIds: [], notes: "" },
  });
  assert.ok(made.id && made.invite);
  const joined = await lobbyCommand(request(), {
    action: "join",
    invite: made.invite,
    name: "Читатель",
  });
  assert.ok(joined.token);
  const player = request(`${PLAYER_COOKIE}=${joined.token}`);
  const map = await db.imageMap.create({
    data: {
      ownerId: null,
      data: {},
      image: new Uint8Array([1, 2, 3]),
      thumbnail: new Uint8Array([1]),
      width: 1,
      height: 1,
      size: 4,
    },
  });
  try {
    const h = {
      id: randomUUID(),
      title: "Изображение",
      text: "",
      published: true,
      imageMapId: map.id,
    };
    await tabletopCommand(host(), {
      action: "tabletop",
      id: made.id,
      version: 1,
      operation: { type: "handout", data: h },
    });
    const response = await handoutImage(player, made.id, h.id);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(
      new Uint8Array(await response.arrayBuffer()),
      new Uint8Array([1, 2, 3]),
    );
    await assert.rejects(handoutImage(request(), made.id, h.id), /Нет доступа/);
    await db.imageMap.update({
      where: { id: map.id },
      data: { ownerId: randomUUID() },
    });
    await assert.rejects(handoutImage(player, made.id, h.id), /недоступно/);
    await assert.rejects(
      tabletopCommand(host(), {
        action: "tabletop",
        id: made.id,
        version: 2,
        operation: { type: "handout", data: h },
      }),
      /недоступно/,
    );
  } finally {
    await db.lobby.delete({ where: { id: made.id } });
    await db.imageMap.delete({ where: { id: map.id } });
  }
});
