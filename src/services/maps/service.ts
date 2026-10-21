import { z } from "zod";
import { db } from "@/database/client";
import { json } from "@/database/repository";
import { mapSchema, type MapRecord } from "@/entities/map";
import { AuthError } from "@/services/accounts/service";
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      id: z.string().uuid().optional(),
      version: z.number().int().nonnegative(),
      campaignId: z.string().uuid().nullable(),
      data: mapSchema,
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
function record(row: {
  id: string;
  version: number;
  archived: boolean;
  campaignId: string | null;
  data: unknown;
}): MapRecord {
  return {
    id: row.id,
    version: row.version,
    archived: row.archived,
    campaignId: row.campaignId,
    data: mapSchema.parse(row.data),
  };
}
export async function listMaps(ownerId: string | null) {
  return (
    await db.adventureMap.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    })
  ).map(record);
}
export async function mapCommand(input: unknown, ownerId: string | null) {
  const b = command.parse(input);
  return db.$transaction(async (tx) => {
    const old = b.id
      ? await tx.adventureMap.findFirst({ where: { id: b.id, ownerId } })
      : null;
    if (b.id && !old) throw new AuthError("Карта не найдена.", 404);
    if ((old?.version ?? 0) !== b.version)
      throw new AuthError(
        "Карта изменена в другом окне. Откройте её заново.",
        409,
      );
    if (
      b.action === "save" &&
      b.campaignId &&
      !(await tx.campaign.findFirst({
        where: { id: b.campaignId, ownerId, archived: false },
      }))
    )
      throw new AuthError("Кампания недоступна.", 404);
    if (!old) {
      if (b.action !== "save") throw new AuthError("Карта не найдена.", 404);
      if ((await tx.adventureMap.count({ where: { ownerId } })) >= 200)
        throw new AuthError("Достигнут лимит 200 карт, включая архив.", 400);
      return record(
        await tx.adventureMap.create({
          data: {
            ownerId,
            name: b.data.name,
            data: json(b.data),
            campaignId: b.campaignId,
          },
        }),
      );
    }
    const changed = await tx.adventureMap.updateMany({
      where: { id: old.id, ownerId, version: b.version },
      data:
        b.action === "archive"
          ? { archived: b.archived, version: { increment: 1 } }
          : {
              name: b.data.name,
              data: json(b.data),
              campaignId: b.campaignId,
              version: { increment: 1 },
            },
    });
    if (changed.count !== 1)
      throw new AuthError("Конфликт сохранения. Откройте карту заново.", 409);
    return record(
      await tx.adventureMap.findUniqueOrThrow({
        where: { id: old.id, ownerId },
      }),
    );
  });
}
