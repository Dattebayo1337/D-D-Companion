import { randomUUID, randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/database/client";
import { contentInclude, toContent, json } from "@/database/repository";
import { characterSchema, type CharacterRecord } from "@/entities/character";
import {
  deriveCharacter,
  validateCharacter,
  restCharacter,
  gainLevel,
} from "@/domain/rules/character";
export class CharacterError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function catalog(edition: string) {
  return (
    await db.content.findMany({
      where: {
        editionId: edition,
        translationStatus: "Approved",
        kind: { in: ["Reference", "Spell"] },
      },
      include: contentInclude,
      orderBy: { nameRu: "asc" },
    })
  ).map(toContent);
}
function record(row: {
  id: string;
  version: number;
  data: unknown;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CharacterRecord {
  return {
    ...row,
    data: characterSchema.parse(row.data),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export async function listCharacters(
  edition: string,
  ownerId: string | null = null,
) {
  return (
    await db.character.findMany({
      where: { edition, ownerId },
      orderBy: { updatedAt: "desc" },
    })
  ).map(record);
}
const command = z
  .object({
    action: z.enum([
      "create",
      "save",
      "damage",
      "heal",
      "tempHp",
      "short",
      "long",
      "hitDie",
      "level",
      "resource",
      "cast",
      "archive",
    ]),
    id: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
    data: characterSchema.optional(),
    amount: z.number().int().min(0).max(100000).optional(),
    key: z.string().max(160).optional(),
    slot: z.number().int().min(0).max(9).optional(),
    pact: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .strict();
export async function characterCommand(
  input: unknown,
  ownerId: string | null = null,
) {
  const b = command.parse(input);
  if (b.action === "create") {
    if (!b.data) throw new CharacterError("Не заполнен персонаж.");
    const data = b.data;
    const entries = await catalog(data.edition);
    const issues = validateCharacter(
      data,
      new Map(entries.map((e) => [e.id, e])),
    );
    if (issues.length) throw new CharacterError(issues.join("\n"));
    data.hp = deriveCharacter(data).maxHp;
    return record(
      await db.character.create({
        data: {
          id: randomUUID(),
          ownerId,
          name: data.name,
          edition: data.edition,
          data: json(data),
        },
      }),
    );
  }
  if (!b.id || !b.version)
    throw new CharacterError("Не указана версия персонажа.");
  const row = await db.character.findUnique({ where: { id: b.id, ownerId } });
  if (!row) throw new CharacterError("Персонаж не найден.", 404);
  if (row.version !== b.version)
    throw new CharacterError(
      "Персонаж изменён в другом окне. Откройте лист заново.",
      409,
    );
  let c = characterSchema.parse(row.data);
  let archived = row.archived;
  if (row.archived && b.action !== "archive")
    throw new CharacterError("Сначала восстановите персонажа из архива.");
  const stats = deriveCharacter(c);
  const amount = b.amount ?? 1;
  switch (b.action) {
    case "save":
      if (!b.data) throw new CharacterError("Нет данных.");
      if (b.data.edition !== c.edition)
        throw new CharacterError(
          "Редакцию существующего персонажа менять нельзя.",
        );
      c = b.data;
      break;
    case "damage": {
      const absorbed = Math.min(c.tempHp, amount);
      c.tempHp -= absorbed;
      c.hp = Math.max(0, c.hp - (amount - absorbed));
      if (c.hp === 0) c.concentrationId = null;
      break;
    }
    case "heal":
      c.hp = Math.min(stats.maxHp, c.hp + amount);
      if (c.hp > 0) c.deathSaves = { success: 0, failure: 0 };
      break;
    case "tempHp":
      c.tempHp = Math.max(c.tempHp, amount);
      break;
    case "short":
    case "long":
      try {
        c = restCharacter(c, b.action);
      } catch (e) {
        throw new CharacterError((e as Error).message);
      }
      break;
    case "hitDie": {
      const die = stats.hitDice.find((x) => x.classId === b.key);
      if (!die || die.remaining < 1)
        throw new CharacterError("Нет доступной кости хитов.");
      if (c.edition === "5e_2024" && c.hp < 1)
        throw new CharacterError("Требуется хотя бы 1 хит.");
      c.spentHitDice[die.classId] = (c.spentHitDice[die.classId] ?? 0) + 1;
      c.hp = Math.min(
        stats.maxHp,
        c.hp +
          Math.max(
            c.edition === "5e_2024" ? 1 : 0,
            randomInt(1, die.die + 1) + stats.mods.CON,
          ),
      );
      break;
    }
    case "level":
      try {
        c = gainLevel(c, b.key ?? "", b.amount);
      } catch (e) {
        throw new CharacterError((e as Error).message);
      }
      break;
    case "resource": {
      const r = stats.resources.find((x) => x.key === b.key);
      if (!r || amount > r.max)
        throw new CharacterError("Недопустимый расход ресурса.");
      c.resourcesUsed[r.key] = amount;
      break;
    }
    case "cast": {
      const known = c.spells.find(
        (s) => s.spellId === b.key && s.status !== "Known",
      );
      if (!known)
        throw new CharacterError(
          "Отметьте заклинание подготовленным или всегда доступным.",
        );
      const row = await db.content.findUnique({
        where: { id: b.key },
        include: contentInclude,
      });
      const e = row ? toContent(row) : null;
      if (e?.kind !== "Spell") throw new CharacterError("Нет заклинания.");
      if (e.spell.level > 0) {
        const slot = b.pact ? stats.pact.level : (b.slot ?? 0);
        if (slot < e.spell.level)
          throw new CharacterError("Слишком низкий уровень ячейки.");
        if (b.pact) {
          if (c.pactSpent >= stats.pact.max)
            throw new CharacterError("Нет ячеек магии договора.");
          c.pactSpent++;
        } else {
          if (slot < 1 || c.slotsSpent[slot - 1] >= stats.slots[slot - 1])
            throw new CharacterError("Нет доступной ячейки.");
          c.slotsSpent[slot - 1]++;
        }
      }
      if (e.spell.concentration) c.concentrationId = e.id;
      break;
    }
    case "archive":
      archived = b.archived ?? true;
      break;
  }
  const entries = await catalog(c.edition);
  const issues = validateCharacter(c, new Map(entries.map((e) => [e.id, e])));
  if (issues.length) throw new CharacterError(issues.join("\n"));
  c.hp = Math.min(c.hp, deriveCharacter(c).maxHp);
  const updated = await db.character.updateMany({
    where: { id: row.id, version: b.version, ownerId },
    data: { name: c.name, data: json(c), archived, version: { increment: 1 } },
  });
  if (updated.count !== 1)
    throw new CharacterError("Конфликт сохранения. Откройте лист заново.", 409);
  return record(
    (await db.character.findUnique({ where: { id: row.id, ownerId } }))!,
  );
}
export function rollAbilities() {
  return Array.from({ length: 6 }, () => {
    const dice = Array.from({ length: 4 }, () => randomInt(1, 7));
    return {
      dice,
      total: dice
        .toSorted((a, b) => b - a)
        .slice(0, 3)
        .reduce((a, b) => a + b, 0),
    };
  });
}
