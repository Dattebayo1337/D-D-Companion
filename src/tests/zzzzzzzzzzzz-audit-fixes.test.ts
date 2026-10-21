import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { datasetSchema, type Spell } from "../entities/content";
import { compareContent } from "../domain/content-comparison";
import {
  contentVersions,
  versionCandidate,
} from "../services/content-versions";
import { importDataset } from "../imports/pipeline";
import { search, filtersSchema } from "../search/service";
import { isPublicRequest } from "../services/lobby/access";
import { db } from "../database/client";
import {
  applyPersonalTranslations,
  personalTranslations,
  savePersonalTranslation,
} from "../services/personal-translations";
import { GET as translationGet } from "../app/api/translations/route";
import { GET as versionsGet } from "../app/api/content/[id]/versions/route";
import { migrateReviewedSpellFields } from "../../scripts/migrate-reviewed-spell-fields";
import { contentInclude, json, toContent } from "../database/repository";

test("Сравнение редакций: явные связи, кандидаты и защита черновиков", async () => {
  const datasets = [2014, 2024].map((y) =>
    datasetSchema.parse(
      JSON.parse(readFileSync(`data/srd/spells-${y}.json`, "utf8")),
    ),
  );
  const entries = datasets.map((d, i) => {
    const base = d.entries.find(
      (e) => e.kind === "Spell" && e.nameOriginal === "Fireball",
    ) as Spell;
    return {
      ...base,
      id: randomUUID(),
      nameRu: "Проверочная сфера аудита",
      nameOriginal: "Audit Unique Orb",
      edition: i === 0 ? ("5e_2014" as const) : ("5e_2024" as const),
      spell: {
        ...base.spell,
        classes: ["Бард"],
        savingThrow: "DEX",
        rangeKind: "Distance",
        rangeFeet: 150,
      },
    };
  }) as Spell[];
  const draft = {
    ...entries[1],
    id: randomUUID(),
    translationStatus: "HumanReviewed" as const,
  };
  await importDataset(
    datasetSchema.parse({
      schemaVersion: 1,
      name: "Проверка сравнения",
      sources: datasets.flatMap((d) => d.sources),
      entries: [...entries, draft],
    }),
  );
  assert.equal(versionCandidate(entries[0], entries[1]), true);
  assert.equal(
    versionCandidate(entries[0], { ...entries[1], contentOrigin: "Homebrew" }),
    false,
  );
  assert.equal(
    versionCandidate(entries[0], { ...entries[1], edition: "5e_2014" }),
    false,
  );
  const result = await contentVersions(entries[0].id);
  assert.equal(result?.length, 1);
  assert.equal(result?.[0].entry.id, entries[1].id);
  assert.equal(result?.[0].match, "name");
  await db.contentRelation.create({
    data: {
      id: randomUUID(),
      sourceId: entries[1].id,
      targetId: entries[0].id,
      relationType: "RevisedVersion",
    },
  });
  assert.equal((await contentVersions(entries[0].id))?.[0].match, "relation");
  assert.equal(await contentVersions(draft.id), null);
  assert.equal(
    isPublicRequest(`/api/content/${entries[0].id}/versions`, "GET"),
    true,
  );
  assert.equal(
    isPublicRequest(`/api/content/${entries[0].id}/versions`, "POST"),
    false,
  );
  const changed = {
    ...entries[0],
    spell: {
      ...entries[0].spell,
      concentration: !entries[0].spell.concentration,
    },
  };
  assert.deepEqual(
    compareContent(entries[0], changed)
      .filter((r) => r.changed)
      .map((r) => r.label),
    ["Концентрация"],
  );
  const selected = await search(
    filtersSchema.parse({
      q: "Проверочная сфера аудита",
      edition: "5e_2014",
      spellClass: entries[0].spell.classes[0],
      castingTime: entries[0].spell.castingTime,
      savingThrow: entries[0].spell.savingThrow,
      minRange: entries[0].spell.rangeFeet,
      pageSize: 1,
    }),
  );
  assert.equal(selected.total, 1);
  assert.equal(selected.items[0].id, entries[0].id);
  assert.equal(
    (
      await search(
        filtersSchema.parse({
          q: "Проверочная сфера аудита",
          spellClass: "Несуществующий класс",
        }),
      )
    ).total,
    0,
  );
  assert.equal(
    (
      await search(
        filtersSchema.parse({ spellClass: "Бард", environment: "лес" }),
      )
    ).total,
    0,
  );
  assert.equal(
    (await search(filtersSchema.parse({ kind: "Spell", minSpeed: 0 }))).total,
    0,
  );

  const owner = randomUUID(),
    other = randomUUID();
  const input = {
    entityId: entries[0].id,
    field: "descriptionRu",
    customValue: "Моё личное пояснение заклинания.",
    expectedValue: null,
  };
  await savePersonalTranslation(input, owner);
  assert.equal(
    (await applyPersonalTranslations(entries[0], owner)).descriptionRu,
    input.customValue,
  );
  assert.equal(
    (await applyPersonalTranslations(entries[0], other)).descriptionRu,
    entries[0].descriptionRu,
  );
  assert.deepEqual(
    (await personalTranslations(entries[0].id, other)).overrides,
    [],
  );
  assert.equal(
    (await db.content.findUniqueOrThrow({ where: { id: entries[0].id } }))
      .descriptionRu,
    entries[0].descriptionRu,
  );
  await assert.rejects(
    savePersonalTranslation(
      { ...input, customValue: "Конфликтующий текст" },
      owner,
    ),
    (error: unknown) =>
      error instanceof Error && "status" in error && error.status === 409,
  );
  const revised = {
    ...entries[0],
    descriptionRu: "Новая версия исходного текста.",
  };
  const stale = await applyPersonalTranslations(revised, owner);
  assert.equal(stale.descriptionRu, revised.descriptionRu);
  assert.deepEqual(stale.personalText?.staleFields, ["descriptionRu"]);
  const response = await versionsGet(new Request("http://localhost"), {
    params: Promise.resolve({ id: entries[0].id }),
  });
  assert.equal(
    (await response.json()).original.descriptionRu,
    entries[0].descriptionRu,
  );
  assert.equal(
    (
      await translationGet(
        new Request(
          `http://localhost/api/translations?entityId=${entries[0].id}`,
        ),
      )
    ).status,
    401,
  );
  await savePersonalTranslation(
    { ...input, customValue: null, expectedValue: input.customValue },
    owner,
  );
  assert.deepEqual(
    (await personalTranslations(entries[0].id, owner)).overrides,
    [],
  );
});

test("Фильтры бестиария используют русские чувства, магию, окружение и выбранную скорость", async () => {
  const dataset = datasetSchema.parse(
    JSON.parse(readFileSync("data/examples/homebrew.json", "utf8")),
  );
  const base = dataset.entries.find((e) => e.kind === "Monster");
  assert.ok(base?.kind === "Monster");
  const entry = {
    ...base,
    id: randomUUID(),
    nameRu: "Проверочный лесной маг аудита",
    descriptionOriginal: "",
    monster: {
      ...base.monster,
      spellcastingRu: "Владеет заклинаниями.",
      sensesRu: "Тёмное зрение 60 футов",
      environment: ["Лес"],
      speed: { ...base.monster.speed, fly: 40, walk: 10 },
    },
  };
  await importDataset(datasetSchema.parse({ ...dataset, entries: [entry] }));
  const filters = {
    q: entry.nameRu,
    kind: "Monster",
    environment: "лес",
    movement: "fly",
    minSpeed: 30,
    sense: "darkvision",
    spellcaster: "true",
  };
  assert.equal((await search(filtersSchema.parse(filters))).total, 1);
  assert.equal(
    (await search(filtersSchema.parse({ ...filters, minSpeed: 50 }))).total,
    0,
  );
  assert.equal(
    (await search(filtersSchema.parse({ ...filters, movement: "walk" }))).total,
    0,
  );
  assert.equal(
    (await search(filtersSchema.parse({ ...filters, spellcaster: "false" })))
      .total,
    0,
  );
});

test("Миграция полей SRD атомарна, сохраняет ревизии и не повторяет изменения", async () => {
  const review = JSON.parse(
    readFileSync("data/srd/spell-fields-reviewed.json", "utf8"),
  );
  const entries: Spell[] = [];
  for (const year of [2014, 2024]) {
    const data = datasetSchema.parse(
      JSON.parse(readFileSync(`data/srd/spells-${year}.json`, "utf8")),
    );
    const selected = data.entries.filter(
      (e): e is Spell => e.kind === "Spell" && e.contentVersion === 2,
    );
    await importDataset({ ...data, entries: selected });
    entries.push(...selected);
  }
  // Restore only test fixtures to the original revision in this isolated test database.
  for (const entry of entries) {
    const original = structuredClone(entry.spell);
    for (const key of Object.keys(
      review.editions[entry.edition === "5e_2014" ? 2014 : 2024][
        entry.nameOriginal
      ],
    )) {
      Object.assign(original, {
        [key]: ["savingThrow", "attackType", "damageType"].includes(key)
          ? null
          : "",
      });
    }
    await db.contentRevision.deleteMany({
      where: { contentId: entry.id, contentVersion: 2 },
    });
    await db.spell.update({
      where: { contentId: entry.id },
      data: { details: json(original), savingThrow: null, damageType: null },
    });
    await db.content.update({
      where: { id: entry.id },
      data: { contentVersion: 1, updatedAt: entry.createdAt },
    });
  }
  const changed = entries.at(-1)!;
  await db.content.update({
    where: { id: changed.id },
    data: { descriptionRu: "Независимая правка исходного текста." },
  });
  await assert.rejects(
    migrateReviewedSpellFields(),
    /Исходная запись изменена/,
  );
  assert.equal(
    (await db.content.findUniqueOrThrow({ where: { id: entries[0].id } }))
      .contentVersion,
    1,
  );
  await db.content.update({
    where: { id: changed.id },
    data: { descriptionRu: changed.descriptionRu },
  });
  assert.deepEqual(await migrateReviewedSpellFields(), {
    updated: 16,
    skipped: 0,
  });
  assert.deepEqual(await migrateReviewedSpellFields(), {
    updated: 0,
    skipped: 16,
  });
  for (const entry of entries) {
    assert.deepEqual(
      toContent(
        await db.content.findUniqueOrThrow({
          where: { id: entry.id },
          include: contentInclude,
        }),
      ),
      entry,
    );
    assert.equal(
      await db.contentRevision.count({
        where: { contentId: entry.id, contentVersion: 2 },
      }),
      1,
    );
  }
});
