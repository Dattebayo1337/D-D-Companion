import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/database/client";
import { json } from "@/database/repository";
import { campaignSchema, type CampaignRecord } from "@/entities/campaign";
export class CampaignError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function record(row: {
  id: string;
  version: number;
  data: unknown;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CampaignRecord {
  return {
    ...row,
    data: campaignSchema.parse(row.data),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export async function listCampaigns(ownerId: string | null = null) {
  return (
    await db.campaign.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    })
  ).map(record);
}
const command = z
  .object({
    action: z.enum(["create", "save", "archive"]),
    id: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
    data: campaignSchema.optional(),
    archived: z.boolean().optional(),
  })
  .strict();
export async function campaignCommand(
  input: unknown,
  ownerId: string | null = null,
) {
  const b = command.parse(input);
  if (b.action !== "archive") {
    if (!b.data) throw new CampaignError("Не заполнена кампания.");
    const characters = await db.character.findMany({
      where: { id: { in: b.data.characterIds }, ownerId },
      select: { id: true, edition: true },
    });
    if (characters.length !== b.data.characterIds.length)
      throw new CampaignError("Один из персонажей не найден.");
    if (
      b.data.editionMode !== "Mixed" &&
      characters.some((c) => c.edition !== b.data!.editionMode)
    )
      throw new CampaignError(
        "Для персонажей разных редакций выберите смешанную кампанию.",
      );
  }
  if (b.action === "create")
    return record(
      await db.campaign.create({
        data: {
          id: randomUUID(),
          ownerId,
          name: b.data!.name,
          editionMode: b.data!.editionMode,
          data: json(b.data!),
        },
      }),
    );
  if (!b.id || !b.version)
    throw new CampaignError("Не указана версия кампании.");
  return db.$transaction(async (tx) => {
    const row = await tx.campaign.findUnique({ where: { id: b.id, ownerId } });
    if (!row) throw new CampaignError("Кампания не найдена.", 404);
    if (row.version !== b.version)
      throw new CampaignError(
        "Кампания изменена в другом окне. Сохраните черновик файлом и загрузите актуальную версию.",
        409,
      );
    if (row.archived && b.action !== "archive")
      throw new CampaignError("Сначала восстановите кампанию из архива.");
    if (b.action === "archive" && b.archived === undefined)
      throw new CampaignError("Не задано состояние архива.");
    const changed = await tx.campaign.updateMany({
      where: { id: b.id, version: b.version, ownerId },
      data:
        b.action === "archive"
          ? { archived: b.archived, version: { increment: 1 } }
          : {
              name: b.data!.name,
              editionMode: b.data!.editionMode,
              data: json(b.data!),
              version: { increment: 1 },
            },
    });
    if (changed.count !== 1)
      throw new CampaignError(
        "Конфликт сохранения. Загрузите актуальную версию.",
        409,
      );
    return record(
      await tx.campaign.findUniqueOrThrow({ where: { id: b.id, ownerId } }),
    );
  });
}
