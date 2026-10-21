import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { db } from "@/database/client";
import { parseDataset, importDataset, DatasetError } from "@/imports/pipeline";
import { filtersSchema, search } from "@/search/service";
import { auditDatabase, exportDataset, reindex } from "@/services/manager";
import { checkOrigin, readBody } from "@/shared/http";
const fixture = () =>
  parseDataset(readFileSync("data/examples/homebrew.json", "utf8"));
after(async () => {
  await db.$disconnect();
});
test("Миграция создаёт внешние ключи, импорт создаёт данные и ревизии", async () => {
  const result = await importDataset(fixture());
  assert.equal(result.imported, 7);
  assert.equal(await db.content.count(), 7);
  assert.equal(await db.contentRevision.count(), 7);
  await assert.rejects(() =>
    db.sourceBook.delete({ where: { id: fixture().sources[0].id } }),
  );
});
test("Повторный импорт идемпотентен", async () => {
  const result = await importDataset(fixture());
  assert.equal(result.imported, 0);
  assert.equal(result.skipped, 7);
  assert.equal(await db.contentRevision.count(), 7);
});
test("Фильтры редакции и типа работают в одной базе", async () => {
  const result = await search(
    filtersSchema.parse({ kind: "Spell", edition: "5e_2024" }),
  );
  assert.equal(result.total, 2);
  assert.ok(
    result.items.every((x) => x.kind === "Spell" && x.edition === "5e_2024"),
  );
});
test("Серверный поиск учитывает aliases, формы и транслитерацию", async () => {
  for (const q of ["дракона", "Ink Drake", "chernilnyy", "дракан"]) {
    const result = await search(filtersSchema.parse({ q }));
    assert.equal(result.total, 1, q);
    assert.equal(result.items[0].nameRu, "Чернильный дракончик");
  }
});
test("Пагинация и фильтры механики ограничивают результат", async () => {
  const r = await search(
    filtersSchema.parse({ kind: "Spell", ritual: "true", pageSize: 1 }),
  );
  assert.equal(r.total, 1);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].nameRu, "Шёпот страниц");
});
test("Обновление создаёт ревизию, старый снимок сохраняется", async () => {
  const d = fixture();
  d.entries = [d.entries[0]];
  d.entries[0].contentVersion = 2;
  d.entries[0].updatedAt = "2026-09-18T00:00:00.000Z";
  d.entries[0].descriptionRu += " Дополнение автора.";
  const r = await importDataset(d);
  assert.equal(r.imported, 1);
  assert.equal(
    await db.contentRevision.count({ where: { contentId: d.entries[0].id } }),
    2,
  );
  const old = await db.contentRevision.findFirst({
    where: { contentId: d.entries[0].id, contentVersion: 1 },
  });
  assert.equal((old?.snapshot as { contentVersion: number }).contentVersion, 1);
});
test("Откат версии и подмена происхождения отклоняются", async () => {
  await assert.rejects(() => importDataset(fixture()), DatasetError);
  const d = fixture();
  d.entries = [d.entries[1]];
  d.entries[0].contentOrigin = "SRD";
  d.entries[0].contentVersion = 2;
  await assert.rejects(() => importDataset(d), DatasetError);
});
test("Ошибка связи откатывает целую транзакцию", async () => {
  const count = await db.content.count();
  const d = fixture();
  d.entries = [{ ...d.entries[2], id: "30000000-0000-4000-8000-000000000001" }];
  d.relations = [
    {
      id: "30000000-0000-4000-8000-000000000002",
      sourceId: d.entries[0].id,
      targetId: "30000000-0000-4000-8000-000000000003",
      relationType: "Related",
    },
  ];
  await assert.rejects(() => importDataset(d), DatasetError);
  assert.equal(await db.content.count(), count);
});
test("Поздняя ошибка внутри транзакции откатывает новые записи и ревизии", async () => {
  const d = fixture();
  d.entries = [];
  d.relations = [
    {
      id: "40000000-0000-4000-8000-000000000001",
      sourceId: fixture().entries[0].id,
      targetId: fixture().entries[1].id,
      relationType: "Related",
    },
  ];
  await importDataset(d);
  const count = await db.content.count();
  const batches = await db.importBatch.count();
  const invalid = fixture();
  invalid.entries = [
    { ...invalid.entries[2], id: "40000000-0000-4000-8000-000000000002" },
  ];
  invalid.relations = [{ ...d.relations[0], relationType: "Equivalent" }];
  await assert.rejects(() => importDataset(invalid), DatasetError);
  assert.equal(await db.content.count(), count);
  assert.equal(await db.importBatch.count(), batches);
});
test("Неутверждённые записи доступны менеджеру, но скрыты из справочника", async () => {
  const d = fixture();
  d.entries = [
    {
      ...d.entries[1],
      id: "50000000-0000-4000-8000-000000000001",
      translationStatus: "Missing",
      nameRu: "",
    },
  ];
  await importDataset(d);
  const r = await search(filtersSchema.parse({ q: "Whispering Pages" }));
  assert.equal(r.total, 1);
  const audit = await auditDatabase();
  assert.ok(audit.localization.some((i) => i.entityId === d.entries[0].id));
});
test("Официальная запись защищена от изменения при повторном импорте", async () => {
  const d = fixture();
  d.entries = [
    {
      ...d.entries[2],
      id: "60000000-0000-4000-8000-000000000001",
      contentOrigin: "SRD",
    },
  ];
  await importDataset(d);
  d.entries[0].contentVersion = 2;
  await assert.rejects(() => importDataset(d), DatasetError);
});
test("Экспорт соответствует импортному контракту; переиндексация сохраняет поиск", async () => {
  const data = await exportDataset();
  assert.equal(
    parseDataset(JSON.stringify(data)).entries.length,
    await db.content.count(),
  );
  assert.equal((await reindex()).count, await db.content.count());
  assert.equal(
    (await search(filtersSchema.parse({ q: "Путевой фонарь" }))).total,
    1,
  );
});
test("Запросы записи с другого сайта отклоняются", () => {
  assert.throws(
    () =>
      checkOrigin(
        new Request("http://localhost:3000/api/manager", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    DatasetError,
  );
});
test("Внутренний hostname Next.js не отклоняет исходный loopback Origin", () => {
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("http://localhost:3000/api/manager", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  assert.throws(
    () =>
      checkOrigin(
        new Request("http://localhost:3000/api/manager", {
          headers: {
            host: "127.0.0.1:3000",
            origin: "https://evil.example",
            "x-forwarded-host": "evil.example",
          },
        }),
      ),
    DatasetError,
  );
});
test("Импорт проверяет MIME и размер потока", async () => {
  await assert.rejects(
    () =>
      readBody(
        new Request("http://localhost/api/manager", {
          method: "POST",
          headers: { "content-type": "text/html" },
          body: "{}",
        }),
      ),
    DatasetError,
  );
  const body = await readBody(
    new Request("http://localhost/api/manager", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(body, "{}");
});
