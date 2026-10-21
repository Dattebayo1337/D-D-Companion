import { z } from "zod";
export const imageMapCategories = [
  "Мир",
  "Континент",
  "Регион",
  "Город",
  "Локация",
  "Другое",
] as const;
export const imageMapSchema = z
  .object({
    name: z.string().trim().min(1, "Укажите название карты.").max(160),
    description: z.string().max(4000),
    category: z.enum(imageMapCategories),
    notes: z.string().max(20000),
    campaignId: z.string().uuid().nullable(),
  })
  .strict();
export type ImageMapData = z.infer<typeof imageMapSchema>;
export type ImageMapRecord = {
  id: string;
  version: number;
  archived: boolean;
  width: number;
  height: number;
  size: number;
  data: ImageMapData;
};
export const MAX_PNG_BYTES = 10 * 1024 * 1024;
export const imageMapUrl = (id: string, thumbnail = false) =>
  `/api/map-images/${id}${thumbnail ? "?thumbnail=1" : ""}`;
