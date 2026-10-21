import { z } from "zod";
import {
  contentSchema,
  spellSchema,
  monsterSchema,
  referenceSchema,
  type Content,
  type EditionId,
  referenceCategories,
} from "./content";
export const workshopKinds = [
  "Spell",
  "Monster",
  ...referenceCategories,
] as const;
export type WorkshopKind = (typeof workshopKinds)[number];
export const authorSources = {
  "5e_2014": "ac010000-0000-4000-8000-000000002014",
  "5e_2024": "ac010000-0000-4000-8000-000000002024",
};
export function blankContent(
  kind: WorkshopKind,
  edition: EditionId,
  id: string,
  now = new Date().toISOString(),
): Content {
  const base = {
    id,
    edition,
    sourceBookId: authorSources[edition],
    nameRu: "",
    descriptionRu: "",
    source: "Авторская работа",
    license: "Авторский контент. Условия распространения определяет автор.",
    rulesVersion: edition.slice(3),
    translationStatus: "HumanReviewed",
    contentOrigin: "Homebrew",
    createdAt: now,
    updatedAt: now,
    contentVersion: 1,
  };
  return contentSchema.parse({
    ...base,
    kind: kind === "Spell" || kind === "Monster" ? kind : "Reference",
    ...(kind === "Spell"
      ? {
          spell: spellSchema.parse({
            level: 0,
            school: "Evocation",
            castingTime: "Action",
            rangeFeet: 30,
            components: ["V"],
            durationRu: "Мгновенная",
          }),
        }
      : kind === "Monster"
        ? {
            monster: monsterSchema.parse({
              size: "Medium",
              type: "Humanoid",
              armorClass: 10,
              hitPoints: 10,
              hitDice: "2d8+2",
              speed: { walk: 30 },
              abilities: {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10,
              },
              challengeRating: 0,
              xp: 10,
              proficiencyBonus: 2,
              alignmentRu: "Без мировоззрения",
              sensesRu: "Пассивная внимательность 10",
              languagesRu: "Общий",
            }),
          }
        : { reference: referenceSchema.parse({ category: kind }) }),
  });
}
export const collectionDataSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(10000),
    ids: z
      .array(z.string().uuid())
      .max(1000)
      .refine((v) => new Set(v).size === v.length, "Повторяющиеся записи"),
    archived: z.boolean(),
  })
  .strict();
export type CollectionRecord = z.infer<typeof collectionDataSchema> & {
  id: string;
  version: number;
};
