import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { db } from "../src/database/client";
import {
  contentInclude,
  json,
  terms,
  toContent,
} from "../src/database/repository";
import { datasetSchema, type Spell } from "../src/entities/content";
import { buildSearchText } from "../src/imports/pipeline";

// Maintainer migration, deliberately not exposed through the public import API.
// Only the exact original snapshots of these 16 reviewed records are accepted.
export async function migrateReviewedSpellFields() {
  const review = JSON.parse(
    readFileSync("data/srd/spell-fields-reviewed.json", "utf8"),
  ) as {
    editions: Record<string, Record<string, Partial<Spell["spell"]>>>;
  };
  const vocabulary = await terms();
  const entries = [2014, 2024].flatMap((year) => {
    const dataset = datasetSchema.parse(
      JSON.parse(readFileSync(`data/srd/spells-${year}.json`, "utf8")),
    );
    return dataset.entries.filter(
      (e): e is Spell =>
        e.kind === "Spell" && !!review.editions[year][e.nameOriginal],
    );
  });
  if (entries.length !== 16)
    throw new Error("Ожидалось 16 проверенных записей.");
  return db.$transaction(async (tx) => {
    const pending: Spell[] = [];
    for (const entry of entries) {
      const row = await tx.content.findUnique({
        where: { id: entry.id },
        include: contentInclude,
      });
      if (!row)
        throw new Error(`Сначала импортируйте базу SRD: ${entry.nameRu}.`);
      const current = toContent(row);
      if (isDeepStrictEqual(current, entry)) continue;
      const original: Spell = structuredClone(entry);
      original.contentVersion = 1;
      original.updatedAt = original.createdAt;
      const fields =
        review.editions[entry.edition === "5e_2014" ? 2014 : 2024][
          entry.nameOriginal
        ];
      for (const key of Object.keys(fields)) {
        if (["savingThrow", "attackType", "damageType"].includes(key))
          Object.assign(original.spell, { [key]: null });
        else if (["damage", "healing", "higherLevelsRu"].includes(key))
          Object.assign(original.spell, { [key]: "" });
        else throw new Error(`Поле не разрешено миграцией: ${key}`);
      }
      if (!isDeepStrictEqual(current, original))
        throw new Error(
          `Исходная запись изменена: ${entry.nameRu} ${entry.edition}. Нужна отдельная сверка.`,
        );
      pending.push(entry);
    }
    if (!pending.length) return { updated: 0, skipped: entries.length };
    const batch = await tx.importBatch.create({
      data: {
        name: "Проверенные поля SRD — аудит 2026-10-02",
        count: pending.length,
      },
    });
    for (const entry of pending) {
      await tx.spell.update({
        where: { contentId: entry.id },
        data: {
          details: json(entry.spell),
          damageType: entry.spell.damageType,
          savingThrow: entry.spell.savingThrow,
        },
      });
      await tx.content.update({
        where: { id: entry.id },
        data: {
          contentVersion: entry.contentVersion,
          updatedAt: entry.updatedAt,
          searchText: buildSearchText(entry, vocabulary),
        },
      });
      await tx.contentRevision.create({
        data: {
          contentId: entry.id,
          contentVersion: entry.contentVersion,
          snapshot: json(entry),
          importBatchId: batch.id,
        },
      });
    }
    return {
      updated: pending.length,
      skipped: entries.length - pending.length,
    };
  });
}
if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/migrate-reviewed-spell-fields.ts")
) {
  migrateReviewedSpellFields()
    .then(console.log)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
