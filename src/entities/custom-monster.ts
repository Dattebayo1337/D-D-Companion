import { z } from "zod";
import {
  editionSchema,
  monsterSchema,
  type Content,
  type Monster,
} from "./content";
export const customMonsterData = z
  .object({
    nameRu: z.string().trim().min(1, "Укажите название.").max(200),
    descriptionRu: z.string().trim().max(50000),
    edition: editionSchema,
    source: z.string().trim().min(1).max(1000).default("Мой бестиарий"),
    license: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .default("Личный авторский материал"),
    monster: monsterSchema.extend({
      challengeRating: z
        .number()
        .refine(
          (v) =>
            [0, 0.125, 0.25, 0.5].includes(v) ||
            (Number.isInteger(v) && v >= 1 && v <= 30),
          "Опасность: 0, 1/8, 1/4, 1/2 или целое число от 1 до 30.",
        ),
      xp: z.number().int().min(0).max(1000000),
    }),
  })
  .strict();
export type PersonalMonster = Monster & {
  personal: true;
  personalArchived: boolean;
};
export function isPersonalMonster(entry: Content): entry is PersonalMonster {
  return (
    entry.kind === "Monster" && "personal" in entry && entry.personal === true
  );
}
