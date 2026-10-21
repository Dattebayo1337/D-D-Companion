import sharp from "sharp";
import { z } from "zod";
import { db } from "@/database/client";
import { json } from "@/database/repository";
import { AuthError } from "@/services/accounts/service";
import {
  imageMapSchema,
  MAX_PNG_BYTES,
  type ImageMapRecord,
} from "@/entities/image-map";
const fields = {
  id: true,
  version: true,
  archived: true,
  width: true,
  height: true,
  size: true,
  data: true,
} as const;
function record(row: {
  id: string;
  version: number;
  archived: boolean;
  width: number;
  height: number;
  size: number;
  data: unknown;
}): ImageMapRecord {
  return { ...row, data: imageMapSchema.parse(row.data) };
}
export async function listImageMaps(ownerId: string | null) {
  return (
    await db.imageMap.findMany({
      where: { ownerId },
      select: fields,
      orderBy: { updatedAt: "desc" },
    })
  ).map(record);
}
export async function validatePng(bytes: Uint8Array) {
  if (bytes.length > MAX_PNG_BYTES)
    throw new AuthError("PNG должен быть не больше 10 МБ.", 413);
  if (
    bytes.length < 33 ||
    !Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    throw new AuthError("Выберите настоящий файл PNG.", 400);
  try {
    const source = sharp(bytes, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
    });
    const meta = await source.metadata();
    if (
      meta.format !== "png" ||
      !meta.width ||
      !meta.height ||
      meta.width > 8192 ||
      meta.height > 8192 ||
      (meta.pages ?? 1) > 1
    )
      throw Error("Unsupported image");
    // Decode and re-encode rather than trusting the filename/header; omit embedded metadata.
    const image = await source.png().toBuffer();
    if (image.length > 20 * 1024 * 1024)
      throw Error("Expanded image too large");
    const thumbnail = await sharp(image)
      .resize({
        width: 480,
        height: 320,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    return {
      image: new Uint8Array(image),
      thumbnail: new Uint8Array(thumbnail),
      width: meta.width,
      height: meta.height,
      size: image.length + thumbnail.length,
    };
  } catch {
    throw new AuthError(
      "PNG повреждён или слишком большой. Нужен статичный PNG: до 8192 пикселей по стороне и до 16 мегапикселей.",
      400,
    );
  }
}
export async function createImageMap(
  input: unknown,
  bytes: Uint8Array,
  ownerId: string | null,
) {
  const data = imageMapSchema.parse(input),
    image = await validatePng(bytes);
  return db.$transaction(async (tx) => {
    if (
      data.campaignId &&
      !(await tx.campaign.findFirst({
        where: { id: data.campaignId, ownerId, archived: false },
      }))
    )
      throw new AuthError("Кампания недоступна.", 404);
    const usage = await tx.imageMap.aggregate({
      where: { ownerId },
      _sum: { size: true },
      _count: true,
    });
    if (
      usage._count >= 200 ||
      (usage._sum.size ?? 0) + image.size > 200 * 1024 * 1024
    )
      throw new AuthError(
        "Лимит PNG-карт: 200 карт и 200 МБ на аккаунт, включая архив.",
        400,
      );
    return record(
      await tx.imageMap.create({
        data: { ownerId, data: json(data), ...image },
        select: fields,
      }),
    );
  });
}
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      id: z.string().uuid(),
      version: z.number().int().positive(),
      data: imageMapSchema,
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
export async function imageMapCommand(input: unknown, ownerId: string | null) {
  const b = command.parse(input);
  return db.$transaction(async (tx) => {
    const old = await tx.imageMap.findFirst({
      where: { id: b.id, ownerId },
      select: fields,
    });
    if (!old) throw new AuthError("Карта не найдена.", 404);
    if (old.version !== b.version)
      throw new AuthError(
        "Карта изменена в другом окне. Откройте её заново.",
        409,
      );
    if (
      b.action === "save" &&
      b.data.campaignId &&
      !(await tx.campaign.findFirst({
        where: { id: b.data.campaignId, ownerId, archived: false },
      }))
    )
      throw new AuthError("Кампания недоступна.", 404);
    const result = await tx.imageMap.updateMany({
      where: { id: b.id, ownerId, version: b.version },
      data: {
        ...(b.action === "save"
          ? { data: json(b.data) }
          : { archived: b.archived }),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new AuthError("Конфликт сохранения. Откройте карту заново.", 409);
    return record(
      await tx.imageMap.findUniqueOrThrow({
        where: { id: b.id, ownerId },
        select: fields,
      }),
    );
  });
}
