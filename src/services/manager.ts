import { db } from "@/database/client";
import {
  contentInclude,
  sources,
  terms,
  toContent,
} from "@/database/repository";
import { validateRussian, validateTerminology } from "@/localization/validate";
import { buildSearchText } from "@/imports/pipeline";
export async function overview() {
  const [spells, monsters, approved, drafts, books, imports, references] =
    await Promise.all([
      db.content.count({
        where: { kind: "Spell", translationStatus: "Approved" },
      }),
      db.content.count({
        where: { kind: "Monster", translationStatus: "Approved" },
      }),
      db.content.count({ where: { translationStatus: "Approved" } }),
      db.content.count({ where: { translationStatus: { not: "Approved" } } }),
      sources(),
      db.importBatch.findMany({ take: 8, orderBy: { importedAt: "desc" } }),
      db.content.count({
        where: { kind: "Reference", translationStatus: "Approved" },
      }),
    ]);
  return {
    spells,
    monsters,
    approved,
    drafts,
    sources: books,
    imports,
    references,
  };
}
export async function auditDatabase() {
  const [rows, dictionary, relations] = await Promise.all([
    db.content.findMany({ include: contentInclude }),
    terms(),
    db.contentRelation.findMany(),
  ]);
  const localization = validateRussian(rows.map(toContent));
  const issues = validateTerminology(dictionary);
  const ids = new Set(rows.map((r) => r.id));
  for (const r of relations)
    if (!ids.has(r.sourceId) || !ids.has(r.targetId))
      issues.push({ path: r.id, message: "Разорванная ссылка." });
  return {
    count: rows.length,
    localization,
    issues,
    valid: !issues.length && !localization.length,
  };
}
export async function reindex() {
  const dictionary = await terms();
  const rows = await db.content.findMany({ include: contentInclude });
  await db.$transaction(
    rows.map((row) =>
      db.content.update({
        where: { id: row.id },
        data: { searchText: buildSearchText(toContent(row), dictionary) },
      }),
    ),
  );
  return { count: rows.length };
}
export async function exportDataset() {
  return {
    schemaVersion: 1,
    name: "Экспорт локальной базы",
    sources: await sources(),
    entries: (await db.content.findMany({ include: contentInclude })).map(
      toContent,
    ),
    terms: await terms(),
    relations: await db.contentRelation.findMany(),
  };
}
