import { HOST_COOKIE, hostSession } from "../services/lobby/auth";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { blankContent, workshopKinds } from "../entities/workshop";
import {
  saveAuthor,
  authorDataset,
  saveCollection,
  listAuthors,
} from "../services/workshop";
import {
  importDataset,
  parseDataset,
  validateAgainstDatabase,
} from "../imports/pipeline";
import {
  packDataset,
  unpackDataset,
  zipFiles,
  unzipFiles,
  datasetToCsv,
  csvToDataset,
} from "../imports/packages";
import { db } from "../database/client";
import { POST as authorPost } from "../app/api/workshop/route";
import { POST as packagePost } from "../app/api/workshop/packages/route";
const sample = () => ({
  ...blankContent("Spell", "5e_2024", randomUUID()),
  nameRu: "Песнь северной звезды",
  descriptionRu: "Свет освещает путь путешественнику.",
  translationStatus: "Approved" as const,
});
test("Мастерская: шаблоны всех типов, публикация, черновик и конфликт версий", async () => {
  for (const k of workshopKinds)
    assert.ok(blankContent(k, "5e_2014", randomUUID()).id);
  const entry = sample();
  const saved = await saveAuthor({ entry, expectedVersion: 0 });
  assert.equal(saved.contentVersion, 1);
  await assert.rejects(() =>
    saveAuthor({
      entry: { ...saved, nameRu: "Перезапись" },
      expectedVersion: 0,
    }),
  );
  const draft = await saveAuthor({
    entry: { ...saved, translationStatus: "HumanReviewed" },
    expectedVersion: 1,
  });
  assert.equal(draft.contentVersion, 2);
  assert.ok((await listAuthors("5e_2024")).some((e) => e.id === entry.id));
  const results = await Promise.allSettled([
    saveAuthor({
      entry: { ...draft, nameRu: "Первая правка" },
      expectedVersion: 2,
    }),
    saveAuthor({
      entry: { ...draft, nameRu: "Вторая правка" },
      expectedVersion: 2,
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("Мастерская: официальный оригинал защищён, публикация требует русский текст и класс подкласса", async () => {
  const dataset = parseDataset(
    readFileSync("data/srd/spells-2024.json", "utf8"),
  );
  await importDataset(dataset);
  const original = dataset.entries[0];
  await assert.rejects(() =>
    saveAuthor({
      entry: { ...original, nameRu: "Изменено" },
      expectedVersion: original.contentVersion,
    }),
  );
  await assert.rejects(() =>
    saveAuthor({
      entry: { ...sample(), descriptionRu: "" },
      expectedVersion: 0,
    }),
  );
  await assert.rejects(() =>
    saveAuthor({
      entry: {
        ...blankContent("Subclass", "5e_2024", randomUUID()),
        nameRu: "Мастер звезд",
        descriptionRu: "Путь ночного неба.",
      },
      expectedVersion: 0,
    }),
  );
  assert.equal(
    (await db.content.findUniqueOrThrow({ where: { id: original.id } })).nameRu,
    original.nameRu,
  );
});
test("Коллекции: сохранение порядка, дубликаты, отсутствующие карточки, версии и архив", async () => {
  const a = await saveAuthor({ entry: sample(), expectedVersion: 0 }),
    b = await saveAuthor({ entry: sample(), expectedVersion: 0 });
  const data = {
    name: "Северная подборка",
    description: "Для путешествия",
    ids: [a.id, b.id],
    archived: false,
  };
  const c = await saveCollection({ version: 0, data });
  const updated = await saveCollection({
    id: c.id,
    version: 1,
    data: { ...data, ids: [b.id, a.id], archived: true },
  });
  assert.deepEqual(updated.ids, [b.id, a.id]);
  assert.equal(updated.archived, true);
  await assert.rejects(() => saveCollection({ id: c.id, version: 1, data }));
  await assert.rejects(() =>
    saveCollection({ version: 0, data: { ...data, ids: [a.id, a.id] } }),
  );
  await assert.rejects(() =>
    saveCollection({ version: 0, data: { ...data, ids: [randomUUID()] } }),
  );
});
test("Пакеты: ZIP и CSV сохраняют структуру, кавычки, переносы и идемпотентность", async () => {
  const e = await saveAuthor({
    entry: { ...sample(), descriptionRu: 'Сияние, "звезда".\nНовая строка.' },
    expectedVersion: 0,
  });
  const d = await authorDataset([e.id]);
  const manifest = {
    name: "Звёзды",
    author: "Автор",
    version: "1.0.0",
    description: "",
    edition: "5e_2024" as const,
    dependencies: [],
  };
  assert.deepEqual(unpackDataset(packDataset(d, manifest)).data, d);
  assert.deepEqual(csvToDataset(datasetToCsv(d)), d);
  assert.equal(
    (await importDataset(unpackDataset(packDataset(d, manifest)).data)).skipped,
    1,
  );
  assert.equal((await validateAgainstDatabase(d)).valid, true);
});
test("Пакеты: повреждение ZIP, пути обхода, неподдерживаемые вложения и редакция отклоняются", async () => {
  for (const path of [
    "../manifest.json",
    "/manifest.json",
    "assets/run.js",
    "data/../evil",
  ]) {
    assert.throws(() => unzipFiles(zipFiles({ [path]: Buffer.from("x") })));
  }
  const d = await authorDataset();
  const b = packDataset(d, {
    name: "Тест",
    author: "",
    version: "1",
    description: "",
    edition: "Mixed",
    dependencies: [],
  });
  b[50] ^= 1;
  assert.throws(() => unpackDataset(b));
  assert.throws(() =>
    unpackDataset(
      packDataset(d, {
        name: "Тест",
        author: "",
        version: "1",
        description: "",
        edition: "5e_2014",
        dependencies: [],
      }),
    ),
  );
  assert.throws(() => csvToDataset("name,description\nx,y"));
});
test("API мастерской: чужой origin, неверный JSON и отсутствующая зависимость", async () => {
  const post = (url: string, value: unknown, origin = "http://localhost") =>
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        cookie: `${HOST_COOKIE}=${hostSession()}`,
      },
      body: JSON.stringify(value),
    });
  assert.equal(
    (
      await authorPost(
        post("http://localhost/api/workshop", {}, "https://other.test"),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await authorPost(
        new Request("http://localhost/api/workshop", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `${HOST_COOKIE}=${hostSession()}`,
          },
          body: "{",
        }),
      )
    ).status,
    400,
  );
  const d = await authorDataset();
  const bytes = packDataset(d, {
    name: "Тест",
    author: "",
    version: "1",
    description: "",
    edition: "Mixed",
    dependencies: [randomUUID()],
  });
  assert.equal(
    (
      await packagePost(
        post("http://localhost/api/workshop/packages", {
          action: "import",
          format: "dndpack",
          payload: bytes.toString("base64"),
        }),
      )
    ).status,
    400,
  );
});
