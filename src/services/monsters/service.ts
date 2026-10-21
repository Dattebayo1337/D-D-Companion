import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/database/client";
import { json } from "@/database/repository";
import { contentSchema } from "@/entities/content";
import { authorSources } from "@/entities/workshop";
import {
  customMonsterData,
  type PersonalMonster,
} from "@/entities/custom-monster";
import { AuthError } from "@/services/accounts/service";
export function customMonsterEntry(row: {
  id: string;
  data: unknown;
  version: number;
  archived: boolean;
}): PersonalMonster {
  const entry = contentSchema.parse(row.data);
  if (entry.kind !== "Monster") throw Error("Invalid personal monster record");
  return {
    ...entry,
    id: row.id,
    contentVersion: row.version,
    personal: true,
    personalArchived: row.archived,
  };
}
export async function ownMonster(id: string, ownerId: string | null) {
  const row = await db.customMonster.findFirst({
    where: { id, ownerId, archived: false },
  });
  return row ? customMonsterEntry(row) : null;
}
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      id: z.string().uuid().optional(),
      version: z.number().int().nonnegative(),
      data: customMonsterData,
    })
    .strict(),
  z
    .object({
      action: z.literal("archive"),
      id: z.string().uuid(),
      version: z.number().int().positive(),
      archived: z.boolean(),
    })
    .strict(),
]);
export async function customMonsterCommand(
  input: unknown,
  ownerId: string | null,
) {
  const b = command.parse(input);
  return db.$transaction(async (tx) => {
    const old = b.id
      ? await tx.customMonster.findUnique({ where: { id: b.id, ownerId } })
      : null;
    if (b.id && !old) throw new AuthError("Существо не найдено.", 404);
    if ((old?.version ?? 0) !== b.version)
      throw new AuthError(
        "Существо изменено в другом окне. Откройте актуальную версию перед сохранением.",
        409,
      );
    if (b.action === "archive") {
      const updated = await tx.customMonster.updateMany({
        where: { id: b.id, ownerId, version: b.version },
        data: { archived: b.archived, version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new AuthError(
          "Конфликт сохранения. Откройте карточку заново.",
          409,
        );
      return customMonsterEntry(
        await tx.customMonster.findUniqueOrThrow({
          where: { id: b.id, ownerId },
        }),
      );
    }
    if (old && old.edition !== b.data.edition)
      throw new AuthError(
        "Для другой редакции создайте отдельное существо.",
        400,
      );
    if (!old && (await tx.customMonster.count({ where: { ownerId } })) >= 500)
      throw new AuthError("Достигнут лимит 500 собственных существ.", 400);
    const id = old?.id ?? randomUUID(),
      now = new Date().toISOString();
    const entry = contentSchema.parse({
      id,
      kind: "Monster",
      ...b.data,
      monster: { ...b.data.monster, statBlockComplete: false },
      sourceBookId: authorSources[b.data.edition],
      source: b.data.source,
      license: b.data.license,
      rulesVersion: b.data.edition.slice(3),
      translationStatus: "Approved",
      contentOrigin: "Homebrew",
      contentVersion: b.version + 1,
      createdAt: old?.createdAt.toISOString() ?? now,
      updatedAt: now,
    });
    if (old) {
      const updated = await tx.customMonster.updateMany({
        where: { id, ownerId, version: b.version },
        data: {
          name: entry.nameRu,
          data: json(entry),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new AuthError(
          "Конфликт сохранения. Откройте карточку заново.",
          409,
        );
      return customMonsterEntry(
        await tx.customMonster.findUniqueOrThrow({ where: { id, ownerId } }),
      );
    }
    return customMonsterEntry(
      await tx.customMonster.create({
        data: {
          id,
          ownerId,
          edition: entry.edition,
          name: entry.nameRu,
          data: json(entry),
        },
      }),
    );
  });
}
