import { db } from "@/database/client";
import { contentInclude, toContent } from "@/database/repository";
import type { Content } from "@/entities/content";

const key = (value: string) =>
  value.trim().toLocaleLowerCase("en").replace(/ё/g, "е");
export function versionCandidate(a: Content, b: Content): boolean {
  if (a.id === b.id || a.edition === b.edition || a.kind !== b.kind)
    return false;
  if (
    a.kind === "Reference" &&
    b.kind === "Reference" &&
    a.reference.category !== b.reference.category
  )
    return false;
  if (a.contentOrigin === "Homebrew" || b.contentOrigin === "Homebrew")
    return false;
  // Exact names only: fuzzy search can confuse unrelated rules and book variants.
  const names = [a.nameOriginal, a.nameRu, ...a.aliases]
    .filter(Boolean)
    .map(key);
  return [b.nameOriginal, b.nameRu, ...b.aliases]
    .filter(Boolean)
    .some((n) => names.includes(key(n)));
}
export async function contentVersions(id: string) {
  const source = await db.content.findFirst({
    where: { id, translationStatus: "Approved" },
    include: contentInclude,
  });
  if (!source) return null;
  const entry = toContent(source);
  const relations = await db.contentRelation.findMany({
    where: {
      OR: [{ sourceId: id }, { targetId: id }],
      relationType: {
        in: ["RevisedVersion", "LegacyVersion", "Equivalent", "Replacement"],
      },
    },
  });
  const linked = new Set(
    relations.map((r) => (r.sourceId === id ? r.targetId : r.sourceId)),
  );
  const rows = await db.content.findMany({
    where: {
      translationStatus: "Approved",
      kind: entry.kind,
      editionId: { not: entry.edition },
      ...(entry.kind === "Reference"
        ? { reference: { is: { category: entry.reference.category } } }
        : {}),
    },
    include: contentInclude,
    orderBy: [{ nameRu: "asc" }, { id: "asc" }],
  });
  const parents =
    entry.kind === "Reference" && entry.reference.category === "Subclass"
      ? new Map(
          (
            await db.content.findMany({
              where: {
                reference: { is: { category: "Class" } },
                translationStatus: "Approved",
              },
              include: contentInclude,
            })
          ).map((r) => [r.id, toContent(r)]),
        )
      : null;
  return rows
    .map(toContent)
    .filter((other) => {
      if (linked.has(other.id)) return true;
      if (!versionCandidate(entry, other)) return false;
      if (parents && entry.kind === "Reference" && other.kind === "Reference") {
        const a = parents.get(entry.reference.parentId ?? ""),
          b = parents.get(other.reference.parentId ?? "");
        return Boolean(a && b && versionCandidate(a, b));
      }
      return true;
    })
    .map((other) => ({
      entry: other,
      match: linked.has(other.id) ? ("relation" as const) : ("name" as const),
    }));
}
