import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/database/client";
import { contentInclude, toContent } from "@/database/repository";
import {
  contentSchema,
  sourceSchema,
  type Content,
  type Dataset,
} from "@/entities/content";
import { authorSources, collectionDataSchema } from "@/entities/workshop";
import { DatasetError, importDataset } from "@/imports/pipeline";
const fail = (message: string): never => {
  throw new DatasetError([{ path: "Мастерская", message }]);
};
export const authorBooks = Object.entries(authorSources).map(
  ([edition, id]) => ({
    id,
    edition: edition as Content["edition"],
    shortName: `Автор ${edition.slice(3)}`,
    fullNameRu: `Мастерская автора — ${edition.slice(3)}`,
    fullNameOriginal: "",
    publisher: "",
    releaseDate: null,
    contentType: "Homebrew" as const,
    licenseType: "Условия автора каждой записи",
  }),
);
export async function saveAuthor(input: unknown) {
  const { entry, expectedVersion } = z
    .object({
      entry: contentSchema,
      expectedVersion: z.number().int().nonnegative(),
    })
    .strict()
    .parse(input);
  if (entry.contentOrigin !== "Homebrew")
    fail("Редактирование оригинала запрещено. Создайте авторскую копию.");
  if (
    entry.kind === "Reference" &&
    entry.reference.category === "Subclass" &&
    !entry.reference.parentId
  )
    fail("Выберите родительский класс подкласса.");
  if (!["Approved", "HumanReviewed"].includes(entry.translationStatus))
    fail("Выберите черновик или публикацию.");
  const old = await db.content.findUnique({ where: { id: entry.id } });
  if ((old?.contentVersion ?? 0) !== expectedVersion)
    fail(
      "Конфликт версии. Откройте сохранённую запись заново; черновик можно скачать.",
    );
  if (old && old.contentOrigin !== "Homebrew")
    fail("Оригинал защищён от изменений.");
  if (!old && entry.sourceBookId !== authorSources[entry.edition])
    fail("Новая запись должна использовать источник мастерской.");
  const now = new Date().toISOString();
  const saved = {
    ...entry,
    contentVersion: expectedVersion + 1,
    updatedAt: now,
    createdAt: old?.createdAt.toISOString() ?? now,
  };
  await importDataset({
    schemaVersion: 1,
    name: "Сохранение авторской карточки",
    sources: authorBooks.filter((b) => b.id === entry.sourceBookId),
    entries: [saved],
    terms: [],
    relations: [],
  });
  return saved;
}
export async function authorDataset(ids?: string[]): Promise<Dataset> {
  const entries = (
    await db.content.findMany({
      where: { contentOrigin: "Homebrew", ...(ids ? { id: { in: ids } } : {}) },
      include: contentInclude,
    })
  ).map(toContent);
  const bookIds = [...new Set(entries.map((e) => e.sourceBookId))];
  const sources = (
    await db.sourceBook.findMany({ where: { id: { in: bookIds } } })
  ).map(({ editionId, ...b }) =>
    sourceSchema.parse({ ...b, edition: editionId }),
  );
  return {
    schemaVersion: 1,
    name: "Авторские материалы",
    sources,
    entries,
    terms: [],
    relations: [],
  };
}
export async function listAuthors(edition: string) {
  return (
    await db.content.findMany({
      where: { contentOrigin: "Homebrew", editionId: edition },
      include: contentInclude,
      orderBy: { updatedAt: "desc" },
    })
  ).map(toContent);
}
export async function listCollections(ownerId: string | null = null) {
  return (
    await db.collection.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    })
  ).map((r) => ({
    id: r.id,
    version: r.version,
    ...collectionDataSchema.parse(r.data),
  }));
}
export async function saveCollection(
  input: unknown,
  ownerId: string | null = null,
) {
  const { id, version, data } = z
    .object({
      id: z.string().uuid().optional(),
      version: z.number().int().nonnegative(),
      data: collectionDataSchema,
    })
    .strict()
    .parse(input);
  return db.$transaction(async (tx) => {
    if (
      (await tx.content.count({ where: { id: { in: data.ids } } })) +
        (await tx.customMonster.count({
          where: { id: { in: data.ids }, ownerId, archived: false },
        })) !==
      data.ids.length
    )
      fail("Некоторые карточки коллекции больше не существуют.");
    if (!id) {
      if (version !== 0) fail("Неверная версия новой коллекции.");
      const r = await tx.collection.create({
        data: { id: randomUUID(), ownerId, data },
      });
      return { id: r.id, version: r.version, ...data };
    }
    const result = await tx.collection.updateMany({
      where: { id, version, ownerId },
      data: { data, version: { increment: 1 } },
    });
    if (!result.count)
      fail("Коллекция изменилась в другом окне. Обновите список.");
    return { id, version: version + 1, ...data };
  });
}
