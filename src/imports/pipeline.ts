import { randomUUID } from "node:crypto";
import {
  datasetSchema,
  type Audit,
  type Content,
  type Dataset,
  type Issue,
} from "@/entities/content";
import { validateRussian, validateTerminology } from "@/localization/validate";
import { db } from "@/database/client";
import { contentInclude, json, toContent } from "@/database/repository";
import { searchDocument } from "@/search/normalize";
export const MAX_IMPORT_BYTES = 32 * 1024 * 1024;
export class DatasetError extends Error {
  constructor(public issues: Issue[]) {
    super("Набор данных не прошёл проверку.");
  }
}
export function parseDataset(raw: string): Dataset {
  if (Buffer.byteLength(raw, "utf8") > MAX_IMPORT_BYTES)
    throw new DatasetError([
      { path: "file", message: "Размер файла превышает 32 МБ." },
    ]);
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new DatasetError([{ path: "file", message: "Некорректный JSON." }]);
  }
  const result = datasetSchema.safeParse(input);
  if (!result.success)
    throw new DatasetError(
      result.error.issues.map((i) => ({
        path: i.path.join("."),
        message:
          "Неверное поле, тип, значение или отсутствует обязательное свойство.",
      })),
    );
  return result.data;
}
export function auditDataset(
  data: Dataset,
  knownSources: Map<string, string> = new Map(),
  knownIds: Set<string> = new Set(),
  knownEntries: Map<string, Content> = new Map(),
): Audit {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const row of [
    ...data.sources,
    ...data.entries,
    ...data.terms,
    ...data.relations,
  ]) {
    if (seen.has(row.id))
      issues.push({ path: row.id, message: "Повторяющийся идентификатор." });
    seen.add(row.id);
  }
  const books = new Map([
    ...knownSources,
    ...data.sources.map((s) => [s.id, s.edition] as const),
  ]);
  const ids = new Set([...knownIds, ...data.entries.map((e) => e.id)]);
  for (const entry of data.entries) {
    if (!books.has(entry.sourceBookId))
      issues.push({ path: entry.id, message: "Источник не найден." });
    else if (books.get(entry.sourceBookId) !== entry.edition)
      issues.push({
        path: entry.id,
        message: "Редакция записи отличается от редакции источника.",
      });
    if (new Date(entry.updatedAt) < new Date(entry.createdAt))
      issues.push({
        path: entry.id,
        message: "Дата обновления раньше даты создания.",
      });
  }
  for (const entry of data.entries) {
    if (entry.kind !== "Reference" || !entry.reference.parentId) continue;
    const parent =
      data.entries.find((e) => e.id === entry.reference.parentId) ??
      knownEntries.get(entry.reference.parentId);
    if (
      !ids.has(entry.reference.parentId) ||
      entry.reference.parentId === entry.id ||
      !parent ||
      (parent &&
        (parent.edition !== entry.edition ||
          parent.kind !== "Reference" ||
          parent.reference.category !== "Class"))
    )
      issues.push({
        path: entry.id,
        message: "Некорректная связь подкласса с классом.",
      });
  }
  for (const relation of data.relations) {
    if (!ids.has(relation.sourceId) || !ids.has(relation.targetId))
      issues.push({
        path: relation.id,
        message: "Разорванная ссылка между записями.",
      });
    if (relation.sourceId === relation.targetId)
      issues.push({
        path: relation.id,
        message: "Запись не может ссылаться сама на себя.",
      });
  }
  issues.push(...validateTerminology(data.terms));
  const localization = validateRussian(data.entries);
  const approved = new Set(
    data.entries
      .filter((e) => e.translationStatus === "Approved")
      .map((e) => e.id),
  );
  issues.push(
    ...localization.filter((i) => i.entityId && approved.has(i.entityId)),
  );
  return {
    valid: issues.length === 0,
    issues,
    localization,
    count: data.entries.length,
  };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function buildSearchText(entry: Content, terms: Dataset["terms"]) {
  const values = [
    entry.nameRu,
    entry.nameOriginal,
    entry.descriptionRu,
    ...entry.aliases,
    ...entry.tags,
  ];
  const base = values.join(" ").toLowerCase();
  for (const term of terms)
    if (
      term.edition === entry.edition &&
      [term.russian, term.original, ...term.aliases].some((v) =>
        base.includes(v.toLowerCase()),
      )
    )
      values.push(term.russian, term.original, ...term.aliases);
  return searchDocument(values);
}
export async function validateAgainstDatabase(data: Dataset): Promise<Audit> {
  const [books, entries] = await Promise.all([
    db.sourceBook.findMany(),
    db.content.findMany({ include: contentInclude }),
  ]);
  return auditDataset(
    data,
    new Map(books.map((s) => [s.id, s.editionId])),
    new Set(entries.map((e) => e.id)),
    new Map(entries.map((e) => [e.id, toContent(e)])),
  );
}
export async function importDataset(data: Dataset) {
  return db.$transaction(
    async (tx) => {
      const [books, current, oldTerms] = await Promise.all([
        tx.sourceBook.findMany(),
        tx.content.findMany({ include: contentInclude }),
        tx.termTranslation.findMany(),
      ]);
      const audit = auditDataset(
        data,
        new Map(books.map((s) => [s.id, s.editionId])),
        new Set(current.map((e) => e.id)),
        new Map(current.map((e) => [e.id, toContent(e)])),
      );
      if (!audit.valid) throw new DatasetError(audit.issues);
      // Books are immutable metadata; changing them requires a new UUID.
      for (const book of data.sources) {
        const old = books.find((b) => b.id === book.id);
        if (old) {
          const { editionId, ...rest } = old;
          if (canonical({ ...rest, edition: editionId }) !== canonical(book))
            throw new DatasetError([
              {
                path: book.id,
                message:
                  "Источник с этим UUID уже существует и отличается. Используйте новый UUID.",
              },
            ]);
        }
      }
      const pending: Content[] = [];
      let skipped = 0;
      for (const entry of data.entries) {
        const old = current.find((c) => c.id === entry.id);
        if (old) {
          if (canonical(toContent(old)) === canonical(entry)) {
            skipped++;
            continue;
          }
          if (
            old.kind !== entry.kind ||
            old.editionId !== entry.edition ||
            old.contentOrigin !== entry.contentOrigin ||
            old.sourceBookId !== entry.sourceBookId ||
            old.createdAt.toISOString() !== entry.createdAt
          )
            throw new DatasetError([
              {
                path: entry.id,
                message:
                  "Нельзя менять тип, редакцию, происхождение, источник или дату создания существующей записи.",
              },
            ]);
          if (
            entry.contentVersion <= old.contentVersion ||
            new Date(entry.updatedAt) < old.updatedAt
          )
            throw new DatasetError([
              {
                path: entry.id,
                message:
                  "Конфликт версии. Увеличьте contentVersion и дату обновления.",
              },
            ]);
          if (["SRD", "Licensed"].includes(old.contentOrigin))
            throw new DatasetError([
              {
                path: entry.id,
                message:
                  "Официальная запись защищена. Для новой ревизии используйте новый UUID и связь редакций; для правок создайте авторскую копию.",
              },
            ]);
        }
        pending.push(entry);
      }
      for (const term of data.terms) {
        const collision = oldTerms.find(
          (t) =>
            t.id === term.id ||
            (t.editionId === term.edition &&
              t.category === term.category &&
              t.original === term.original),
        );
        if (
          collision &&
          (collision.id !== term.id ||
            collision.russian !== term.russian ||
            collision.original !== term.original ||
            collision.category !== term.category ||
            collision.editionId !== term.edition)
        )
          throw new DatasetError([
            { path: term.id, message: "Конфликт терминологического словаря." },
          ]);
      }
      for (const edition of ["5e_2014", "5e_2024"])
        await tx.edition.upsert({
          where: { id: edition },
          create: {
            id: edition,
            nameRu: edition === "5e_2014" ? "Правила 2014" : "Правила 2024",
          },
          update: {},
        });
      for (const { edition, ...book } of data.sources)
        await tx.sourceBook.upsert({
          where: { id: book.id },
          create: { ...book, editionId: edition },
          update: {},
        });
      for (const { edition, ...term } of data.terms)
        await tx.termTranslation.upsert({
          where: { id: term.id },
          create: { ...term, editionId: edition },
          update: {
            aliases: term.aliases,
            notes: term.notes,
            updatedAt: term.updatedAt,
          },
        });
      const allTerms = [
        ...oldTerms.map((t) => ({
          ...t,
          edition: t.editionId,
          aliases: t.aliases as string[],
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        ...data.terms,
      ] as Dataset["terms"];
      const batchId = randomUUID();
      await tx.importBatch.create({
        data: { id: batchId, name: data.name, count: pending.length },
      });
      for (const entry of pending) {
        const { edition, ...rest } = entry;
        const {
          spell: _spell,
          monster: _monster,
          reference: _reference,
          ...base
        } = {
          ...rest,
          spell: entry.kind === "Spell" ? entry.spell : undefined,
          monster: entry.kind === "Monster" ? entry.monster : undefined,
          reference: entry.kind === "Reference" ? entry.reference : undefined,
        };
        void _spell;
        void _monster;
        void _reference;
        const record = {
          ...base,
          editionId: edition,
          searchText: buildSearchText(entry, allTerms),
        };
        await tx.content.upsert({
          where: { id: entry.id },
          create: record,
          update: record,
        });
        if (entry.kind === "Spell") {
          const {
            level,
            school,
            ritual,
            concentration,
            castingTime,
            rangeFeet,
            damageType,
            savingThrow,
          } = entry.spell;
          const details = {
            level,
            school,
            ritual,
            concentration,
            castingTime,
            rangeFeet,
            damageType,
            savingThrow,
            details: json(entry.spell),
          };
          await tx.spell.upsert({
            where: { contentId: entry.id },
            create: { contentId: entry.id, ...details },
            update: details,
          });
        } else if (entry.kind === "Monster") {
          const { challengeRating, type, size, armorClass, hitPoints } =
            entry.monster;
          const details = {
            challengeRating,
            type,
            size,
            armorClass,
            hitPoints,
            details: json(entry.monster),
          };
          await tx.monster.upsert({
            where: { contentId: entry.id },
            create: { contentId: entry.id, ...details },
            update: details,
          });
        }
        if (entry.kind === "Reference") {
          const details = {
            category: entry.reference.category,
            parentId: entry.reference.parentId,
            details: json(entry.reference),
          };
          await tx.reference.upsert({
            where: { contentId: entry.id },
            create: { contentId: entry.id, ...details },
            update: details,
          });
        }
        await tx.contentRevision.create({
          data: {
            contentId: entry.id,
            contentVersion: entry.contentVersion,
            snapshot: json(entry),
            importBatchId: batchId,
          },
        });
      }
      for (const relation of data.relations) {
        const existing = await tx.contentRelation.findUnique({
          where: { id: relation.id },
        });
        if (existing && canonical(existing) !== canonical(relation))
          throw new DatasetError([
            {
              path: relation.id,
              message: "Конфликт связи с существующим UUID.",
            },
          ]);
        await tx.contentRelation.upsert({
          where: { id: relation.id },
          create: relation,
          update: {},
        });
      }
      // A terminology change can affect records outside this batch.
      if (data.terms.length)
        for (const row of await tx.content.findMany({
          include: contentInclude,
        }))
          await tx.content.update({
            where: { id: row.id },
            data: { searchText: buildSearchText(toContent(row), allTerms) },
          });
      return {
        imported: pending.length,
        skipped,
        batchId,
        localization: audit.localization,
      };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}
