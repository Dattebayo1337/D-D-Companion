import { z } from "zod";
import { db } from "@/database/client";
import type { Content } from "@/entities/content";
import { AuthError } from "./accounts/service";
export const translationInput = z
  .object({
    entityId: z.string().uuid(),
    field: z.enum(["nameRu", "descriptionRu"]),
    customValue: z.string().trim().min(1).max(50000).nullable(),
    expectedValue: z.string().nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.customValue !== null &&
      (!/[а-яё]/i.test(v.customValue) ||
        (v.field === "nameRu" && v.customValue.length > 500))
    )
      ctx.addIssue({
        code: "custom",
        message: "Введите русский текст допустимой длины.",
      });
  });
export async function personalTranslations(entityId: string, userId: string) {
  const original = await db.content.findFirst({
    where: { id: entityId, translationStatus: "Approved" },
    select: { nameRu: true, descriptionRu: true },
  });
  if (!original) throw new AuthError("Запись не найдена.", 404);
  const overrides = await db.localizationOverride.findMany({
    where: { entityId, userId, field: { in: ["nameRu", "descriptionRu"] } },
    select: { field: true, customValue: true, originalValue: true },
  });
  return { original, overrides };
}
export async function savePersonalTranslation(input: unknown, userId: string) {
  const v = translationInput.parse(input);
  await db.$transaction(async (tx) => {
    const original = await tx.content.findFirst({
      where: { id: v.entityId, translationStatus: "Approved" },
      select: { nameRu: true, descriptionRu: true },
    });
    if (!original) throw new AuthError("Запись не найдена.", 404);
    const where = { entityId: v.entityId, field: v.field, userId };
    const existing = await tx.localizationOverride.findUnique({
      where: { entityId_field_userId: where },
    });
    if ((existing?.customValue ?? null) !== v.expectedValue)
      throw new AuthError(
        "Личный текст изменён в другом окне. Откройте редактор заново.",
        409,
      );
    if (v.customValue === null) {
      await tx.localizationOverride.deleteMany({ where });
      return;
    }
    await tx.localizationOverride.upsert({
      where: { entityId_field_userId: where },
      create: {
        ...where,
        customValue: v.customValue,
        originalValue: original[v.field],
      },
      update: { customValue: v.customValue, originalValue: original[v.field] },
    });
  });
  return personalTranslations(v.entityId, userId);
}
export type PersonalizedContent = Content & {
  personalText?: { fields: string[]; staleFields: string[] };
};
export async function applyPersonalTranslations(
  entry: Content,
  userId: string,
): Promise<PersonalizedContent> {
  const rows = await db.localizationOverride.findMany({
    where: {
      entityId: entry.id,
      userId,
      field: { in: ["nameRu", "descriptionRu"] },
    },
  });
  const output: PersonalizedContent = {
    ...entry,
    personalText: { fields: [], staleFields: [] },
  };
  for (const row of rows) {
    if (row.field !== "nameRu" && row.field !== "descriptionRu") continue;
    // A source revision must not silently be hidden by a stale personal translation.
    if (row.originalValue !== entry[row.field]) {
      output.personalText!.staleFields.push(row.field);
      continue;
    }
    output[row.field] = row.customValue;
    output.personalText!.fields.push(row.field);
  }
  return output;
}
