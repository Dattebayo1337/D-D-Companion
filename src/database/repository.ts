import { Prisma } from "@prisma/client";
import {
  contentSchema,
  type Content,
  sourceSchema,
  termSchema,
} from "@/entities/content";
import { db } from "./client";
export const contentInclude = {
  spell: true,
  monster: true,
  reference: true,
} satisfies Prisma.ContentInclude;
type Row = Prisma.ContentGetPayload<{ include: typeof contentInclude }>;
export function toContent(row: Row): Content {
  const {
    editionId,
    searchText: _searchText,
    spell,
    monster,
    reference,
    ...base
  } = row;
  void _searchText;
  return contentSchema.parse({
    ...base,
    edition: editionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.kind === "Spell"
      ? { spell: spell?.details }
      : row.kind === "Monster"
        ? { monster: monster?.details }
        : { reference: reference?.details }),
  });
}
export async function sources() {
  return (await db.sourceBook.findMany({ orderBy: { fullNameRu: "asc" } })).map(
    ({ editionId, ...s }) => sourceSchema.parse({ ...s, edition: editionId }),
  );
}
export async function terms() {
  return (await db.termTranslation.findMany()).map(({ editionId, ...t }) =>
    termSchema.parse({
      ...t,
      edition: editionId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }),
  );
}
export const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
