import { z } from "zod";
import { editionSchema } from "./content";
const uuid = z.string().uuid(),
  hp = z.number().int().min(0).max(1000000);
export const combatantSchema = z
  .object({
    id: uuid,
    name: z.string().trim().min(1).max(160),
    kind: z.enum(["monster", "character", "npc", "manual"]),
    sourceId: uuid.nullable(),
    edition: editionSchema,
    side: z.enum(["ally", "enemy", "neutral"]),
    maxHp: hp.refine((n) => n > 0),
    hp,
    tempHp: hp,
    ac: z.number().int().min(0).max(100),
    initiative: z.number().int().min(-100).max(100),
    initiativeMod: z.number().int().min(-50).max(50),
    conditions: z
      .array(z.object({ id: uuid, name: z.string().max(160) }).strict())
      .max(30),
    concentration: z.string().max(200),
    concentrationDC: z.number().int().min(10).max(1000000).nullable(),
    deathSaves: z.boolean(),
    deathState: z.enum(["alive", "dying", "stable", "dead"]),
    success: z.number().int().min(0).max(3),
    failure: z.number().int().min(0).max(3),
    notes: z.string().max(4000),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.hp > p.maxHp)
      ctx.addIssue({ code: "custom", message: "Текущие хиты выше максимума." });
    if (new Set(p.conditions.map((c) => c.id)).size !== p.conditions.length)
      ctx.addIssue({ code: "custom", message: "Повтор состояния." });
  });
export const battleSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    edition: editionSchema,
    status: z.enum(["preparing", "running", "finished"]),
    round: z.number().int().min(1).max(100000),
    turn: z.number().int().min(0).max(99),
    participants: z.array(combatantSchema).max(100),
    notes: z.string().max(20000),
    log: z
      .array(
        z
          .object({
            id: uuid,
            time: z.string().datetime(),
            text: z.string().max(2000),
          })
          .strict(),
      )
      .max(300),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (new Set(b.participants.map((p) => p.id)).size !== b.participants.length)
      ctx.addIssue({ code: "custom", message: "Повтор участника." });
    if (b.turn >= Math.max(1, b.participants.length))
      ctx.addIssue({ code: "custom", message: "Неверный номер хода." });
    if (b.status === "running" && !b.participants.length)
      ctx.addIssue({ code: "custom", message: "Нет участников боя." });
  });
export type Combatant = z.infer<typeof combatantSchema>;
export type BattleData = z.infer<typeof battleSchema>;
export type BattleRecord = {
  id: string;
  version: number;
  campaignId: string | null;
  archived: boolean;
  data: BattleData;
  createdAt: string;
  updatedAt: string;
};
export const sideLabels = {
  ally: "Союзник",
  enemy: "Противник",
  neutral: "Нейтральный",
};
export const deathLabels = {
  alive: "В строю",
  dying: "При смерти",
  stable: "Стабилен",
  dead: "Мёртв",
};
export const battleLabels = {
  preparing: "Подготовка",
  running: "Идёт бой",
  finished: "Завершён",
};
export function newCombatant(
  id: string,
  name: string,
  edition: Combatant["edition"],
): Combatant {
  return {
    id,
    name,
    edition,
    kind: "manual",
    sourceId: null,
    side: "enemy",
    maxHp: 1,
    hp: 1,
    tempHp: 0,
    ac: 10,
    initiative: 0,
    initiativeMod: 0,
    conditions: [],
    concentration: "",
    concentrationDC: null,
    deathSaves: false,
    deathState: "alive",
    success: 0,
    failure: 0,
    notes: "",
  };
}
