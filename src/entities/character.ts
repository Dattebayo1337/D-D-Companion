import { z } from "zod";
import { abilities, editionSchema } from "./content";
export const skillAbilities = {
  Acrobatics: "DEX",
  AnimalHandling: "WIS",
  Arcana: "INT",
  Athletics: "STR",
  Deception: "CHA",
  History: "INT",
  Insight: "WIS",
  Intimidation: "CHA",
  Investigation: "INT",
  Medicine: "WIS",
  Nature: "INT",
  Perception: "WIS",
  Performance: "CHA",
  Persuasion: "CHA",
  Religion: "INT",
  SleightOfHand: "DEX",
  Stealth: "DEX",
  Survival: "WIS",
} as const;
export const skillLabels: Record<keyof typeof skillAbilities, string> = {
  Acrobatics: "Акробатика",
  AnimalHandling: "Уход за животными",
  Arcana: "Магия",
  Athletics: "Атлетика",
  Deception: "Обман",
  History: "История",
  Insight: "Проницательность",
  Intimidation: "Запугивание",
  Investigation: "Анализ",
  Medicine: "Медицина",
  Nature: "Природа",
  Perception: "Внимательность",
  Performance: "Выступление",
  Persuasion: "Убеждение",
  Religion: "Религия",
  SleightOfHand: "Ловкость рук",
  Stealth: "Скрытность",
  Survival: "Выживание",
};
const scores = z
  .object({
    STR: z.number().int().min(1).max(30),
    DEX: z.number().int().min(1).max(30),
    CON: z.number().int().min(1).max(30),
    INT: z.number().int().min(1).max(30),
    WIS: z.number().int().min(1).max(30),
    CHA: z.number().int().min(1).max(30),
  })
  .strict();
const uuid = z.string().uuid(),
  count = z.number().int().min(0).max(1000000),
  text = z.string().max(20000);
export const characterSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    edition: editionSchema,
    speciesRaceId: uuid,
    backgroundId: uuid,
    method: z.enum(["Standard", "PointBuy", "Manual", "Roll"]),
    abilities: scores,
    abilityBonuses: z
      .record(z.enum(abilities), z.number().int().min(0).max(20))
      .default({}),
    classes: z
      .array(
        z
          .object({
            classId: uuid,
            subclassId: uuid.nullable().default(null),
            level: z.number().int().min(1).max(20),
            hpRolls: z.array(z.number().int().min(1).max(12)).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    skills: z
      .record(
        z.enum(
          Object.keys(skillAbilities) as [
            keyof typeof skillAbilities,
            ...(keyof typeof skillAbilities)[],
          ],
        ),
        z.number().int().min(0).max(2),
      )
      .default({}),
    extraSaves: z.array(z.enum(abilities)).max(6).default([]),
    alignment: text.default(""),
    experience: count.default(0),
    hp: count.default(0),
    tempHp: count.default(0),
    spentHitDice: z.record(uuid, count).default({}),
    slotsSpent: z.array(count).length(9).default(Array(9).fill(0)),
    pactSpent: count.default(0),
    resourcesUsed: z.record(z.string().max(160), count).default({}),
    inventory: z
      .array(
        z
          .object({
            id: uuid,
            contentId: uuid,
            quantity: z.number().int().min(1).max(10000),
            equipped: z.boolean().default(false),
            attuned: z.boolean().default(false),
          })
          .strict(),
      )
      .max(500)
      .default([]),
    spells: z
      .array(
        z
          .object({
            spellId: uuid,
            classId: uuid,
            status: z.enum(["Known", "Prepared", "Always"]),
          })
          .strict(),
      )
      .max(1000)
      .default([]),
    featIds: z.array(uuid).max(100).default([]),
    conditionIds: z.array(uuid).max(30).default([]),
    concentrationId: uuid.nullable().default(null),
    exhaustion: z.number().int().min(0).max(6).default(0),
    currency: z
      .object({
        CP: count.default(0),
        SP: count.default(0),
        EP: count.default(0),
        GP: count.default(0),
        PP: count.default(0),
      })
      .strict()
      .default({}),
    languages: text.default(""),
    proficiencies: text.default(""),
    notes: text.default(""),
    adjustments: z
      .object({
        maxHp: z.number().int().min(-1000).max(1000).default(0),
        ac: z.number().int().min(0).max(100).nullable().default(null),
        initiative: z.number().int().min(-50).max(50).default(0),
        speed: z.number().int().min(0).max(1000).default(30),
      })
      .strict()
      .default({}),
    deathSaves: z
      .object({
        success: z.number().int().min(0).max(3),
        failure: z.number().int().min(0).max(3),
      })
      .strict()
      .default({ success: 0, failure: 0 }),
  })
  .strict();
export type CharacterData = z.infer<typeof characterSchema>;
export type CharacterRecord = {
  id: string;
  version: number;
  data: CharacterData;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
