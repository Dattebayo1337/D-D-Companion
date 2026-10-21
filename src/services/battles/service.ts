import { customMonsterEntry } from "@/services/monsters/service";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/database/client";
import { json, contentInclude, toContent } from "@/database/repository";
import {
  battleSchema,
  newCombatant,
  type BattleRecord,
  type BattleData,
  type Combatant,
} from "@/entities/battle";
import { editionSchema } from "@/entities/content";
import { characterSchema } from "@/entities/character";
import { campaignSchema } from "@/entities/campaign";
import { deriveCharacter } from "@/domain/rules/character";
import {
  combatDamage,
  combatHeal,
  deathSave,
  startBattle,
  moveTurn,
} from "@/domain/rules/battle";
export class BattleError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const manualSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    maxHp: z.number().int().min(1).max(1000000),
    hp: z.number().int().min(0).max(1000000),
    ac: z.number().int().min(0).max(100),
    initiative: z.number().int().min(-100).max(100),
    initiativeMod: z.number().int().min(-50).max(50),
    side: z.enum(["ally", "enemy", "neutral"]),
    deathSaves: z.boolean(),
    notes: z.string().max(4000),
  })
  .strict();
const command = z
  .object({
    action: z.enum([
      "create",
      "add",
      "edit",
      "remove",
      "reorder",
      "rollInitiative",
      "start",
      "next",
      "previous",
      "round",
      "prepare",
      "finish",
      "damage",
      "heal",
      "tempHp",
      "condition",
      "concentration",
      "concentrationPass",
      "concentrationFail",
      "deathSave",
      "stabilize",
      "revive",
      "markDead",
      "notes",
      "archive",
    ]),
    id: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(160).optional(),
    edition: editionSchema.optional(),
    campaignId: z.string().uuid().nullable().optional(),
    participantId: z.string().uuid().optional(),
    sourceId: z.string().uuid().optional(),
    kind: z.enum(["monster", "character", "npc", "manual"]).optional(),
    count: z.number().int().min(1).max(30).optional(),
    manual: manualSchema.optional(),
    amount: z.number().int().min(0).max(1000000).optional(),
    critical: z.boolean().optional(),
    text: z.string().max(20000).optional(),
    enabled: z.boolean().optional(),
    conditionId: z.string().uuid().optional(),
    archived: z.boolean().optional(),
    direction: z.enum(["up", "down"]).optional(),
    opponents: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            count: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .max(50)
      .optional(),
  })
  .strict();
function record(r: {
  id: string;
  version: number;
  campaignId: string | null;
  archived: boolean;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}): BattleRecord {
  return {
    ...r,
    data: battleSchema.parse(r.data),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
export async function listBattles(ownerId: string | null = null) {
  return (
    await db.encounter.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    })
  ).map(record);
}
async function fromSource(
  tx: Prisma.TransactionClient,
  kind: "monster" | "character",
  id: string,
  edition: Combatant["edition"],
  mixed: boolean,
  ownerId: string | null,
): Promise<Combatant> {
  if (kind === "monster") {
    const row = await tx.content.findUnique({
      where: { id },
      include: contentInclude,
    });
    const personal = !row
      ? await tx.customMonster.findFirst({
          where: { id, ownerId, archived: false },
        })
      : null;
    if ((!row || row.translationStatus !== "Approved") && !personal)
      throw new BattleError("Существо недоступно.");
    const e = personal ? customMonsterEntry(personal) : toContent(row!);
    if (e.kind !== "Monster")
      throw new BattleError("Выберите существо из бестиария.");
    if (!mixed && e.edition !== edition)
      throw new BattleError("Редакция существа не совпадает с боем.");
    const initiativeMod = Number(
      e.descriptionRu.match(/\*\*Инициатива:\*\*\s*([+-]?\d+)/i)?.[1] ??
        Math.floor((e.monster.abilities.DEX - 10) / 2),
    );
    return {
      ...newCombatant(randomUUID(), e.nameRu, e.edition),
      kind,
      sourceId: id,
      maxHp: Math.max(1, e.monster.hitPoints),
      hp: Math.max(1, e.monster.hitPoints),
      ac: e.monster.armorClass,
      initiativeMod,
    };
  }
  const row = await tx.character.findUnique({ where: { id, ownerId } });
  if (!row || row.archived) throw new BattleError("Персонаж недоступен.");
  const c = characterSchema.parse(row.data);
  if (!mixed && c.edition !== edition)
    throw new BattleError("Редакция персонажа не совпадает с боем.");
  const stats = deriveCharacter(c),
    hp = Math.min(stats.maxHp, c.hp);
  const conditions = await tx.content.findMany({
    where: { id: { in: c.conditionIds }, translationStatus: "Approved" },
    select: { id: true, nameRu: true },
  });
  const spell = c.concentrationId
    ? await tx.content.findUnique({
        where: { id: c.concentrationId },
        select: { nameRu: true },
      })
    : null;
  return {
    ...newCombatant(randomUUID(), c.name, c.edition),
    kind,
    sourceId: id,
    side: "ally",
    hp,
    maxHp: stats.maxHp,
    ac: stats.ac,
    tempHp: c.tempHp,
    initiativeMod: stats.initiative,
    deathSaves: true,
    deathState:
      hp > 0
        ? "alive"
        : c.deathSaves.failure >= 3
          ? "dead"
          : c.deathSaves.success >= 3
            ? "stable"
            : "dying",
    success: hp > 0 || c.deathSaves.success >= 3 ? 0 : c.deathSaves.success,
    failure: hp > 0 || c.deathSaves.success >= 3 ? 0 : c.deathSaves.failure,
    conditions: conditions.map((v) => ({ id: v.id, name: v.nameRu })),
    concentration: hp > 0 ? (spell?.nameRu ?? "") : "",
  };
}
function log(data: BattleData, text: string) {
  data.log = [
    ...data.log,
    { id: randomUUID(), time: new Date().toISOString(), text },
  ].slice(-300);
}
export async function battleCommand(
  input: unknown,
  ownerId: string | null = null,
) {
  const b = command.parse(input);
  return db.$transaction(async (tx) => {
    if (b.action === "create") {
      if (!b.name || !b.edition)
        throw new BattleError("Заполните название и редакцию боя.");
      const campaign = b.campaignId
        ? await tx.campaign.findUnique({ where: { id: b.campaignId, ownerId } })
        : null;
      if (b.campaignId && (!campaign || campaign.archived))
        throw new BattleError("Кампания недоступна.");
      const mode = campaign
        ? campaignSchema.parse(campaign.data).editionMode
        : null;
      if (mode && mode !== "Mixed" && mode !== b.edition)
        throw new BattleError("Редакция боя не совпадает с кампанией.");
      let data: BattleData = {
        name: b.name,
        edition: b.edition,
        status: "preparing",
        round: 1,
        turn: 0,
        participants: [],
        notes: b.text ?? "",
        log: [],
      };
      if ((b.opponents ?? []).reduce((n, o) => n + o.count, 0) > 100)
        throw new BattleError("В бою допускается до 100 участников.");
      if (
        new Set((b.opponents ?? []).map((o) => o.id)).size !==
        (b.opponents ?? []).length
      )
        throw new BattleError(
          "Объедините повторяющихся противников в одну строку.",
        );
      for (const opponent of b.opponents ?? []) {
        const p = await fromSource(
          tx,
          "monster",
          opponent.id,
          b.edition,
          mode === "Mixed",
          ownerId,
        );
        for (let i = 0; i < opponent.count; i++)
          data.participants.push({
            ...p,
            id: randomUUID(),
            name: opponent.count > 1 ? `${p.name} ${i + 1}` : p.name,
          });
      }
      log(data, "Бой создан.");
      data = battleSchema.parse(data);
      return record(
        await tx.encounter.create({
          data: {
            id: randomUUID(),
            ownerId,
            name: data.name,
            edition: data.edition,
            campaignId: b.campaignId ?? null,
            data: json(data),
          },
        }),
      );
    }
    if (!b.id || !b.version) throw new BattleError("Не указана версия боя.");
    const row = await tx.encounter.findUnique({ where: { id: b.id, ownerId } });
    if (!row) throw new BattleError("Бой не найден.", 404);
    if (row.version !== b.version)
      throw new BattleError(
        "Бой изменён в другом окне. Обновите его перед следующим действием.",
        409,
      );
    if (row.archived && b.action !== "archive")
      throw new BattleError("Сначала восстановите бой из архива.");
    let data = battleSchema.parse(row.data),
      archived = row.archived;
    const preparing = ["add", "remove", "reorder", "rollInitiative", "start"];
    if (preparing.includes(b.action) && data.status !== "preparing")
      throw new BattleError(
        "Изменять состав и порядок можно в режиме подготовки.",
      );
    if (
      data.status === "finished" &&
      !["prepare", "archive", "notes"].includes(b.action)
    )
      throw new BattleError(
        "Бой завершён. Вернитесь к подготовке для изменений.",
      );
    const index = data.participants.findIndex((p) => p.id === b.participantId),
      p = data.participants[index];
    const needsParticipant = [
      "edit",
      "remove",
      "reorder",
      "damage",
      "heal",
      "tempHp",
      "condition",
      "concentration",
      "concentrationPass",
      "concentrationFail",
      "deathSave",
      "stabilize",
      "revive",
      "markDead",
    ];
    if (needsParticipant.includes(b.action) && !p)
      throw new BattleError("Участник не найден.");
    let message = "";
    const amount = b.amount ?? 0;
    switch (b.action) {
      case "add": {
        const campaign = row.campaignId
          ? await tx.campaign.findUnique({
              where: { id: row.campaignId, ownerId },
            })
          : null;
        const c = campaign ? campaignSchema.parse(campaign.data) : null;
        if (!b.kind) throw new BattleError("Не указан тип участника.");
        let item: Combatant;
        if (b.kind === "monster" || b.kind === "character") {
          if (!b.sourceId)
            throw new BattleError("Не выбран источник участника.");
          if (
            b.kind === "character" &&
            data.participants.some(
              (p) => p.kind === "character" && p.sourceId === b.sourceId,
            )
          )
            throw new BattleError("Этот персонаж уже участвует в бою.");
          item = await fromSource(
            tx,
            b.kind,
            b.sourceId,
            data.edition,
            c?.editionMode === "Mixed",
            ownerId,
          );
        } else {
          if (!b.manual)
            throw new BattleError("Заполните параметры участника.");
          const npc =
            b.kind === "npc"
              ? c?.entries.find(
                  (e) => e.id === b.sourceId && e.kind === "npc" && !e.archived,
                )
              : null;
          if (b.kind === "npc" && !npc)
            throw new BattleError("NPC не найден в кампании боя.");
          item = {
            ...newCombatant(randomUUID(), b.manual.name, data.edition),
            ...b.manual,
            kind: b.kind,
            sourceId: npc?.id ?? null,
          };
          item.deathState =
            item.hp > 0 ? "alive" : item.deathSaves ? "dying" : "dead";
        }
        const count = b.kind === "monster" ? (b.count ?? 1) : 1;
        if (data.participants.length + count > 100)
          throw new BattleError("В бою допускается до 100 участников.");
        for (let i = 0; i < count; i++) {
          let name = item.name,
            n = 1;
          while (data.participants.some((p) => p.name === name))
            name = `${item.name} ${++n}`;
          data.participants.push({ ...item, id: randomUUID(), name });
        }
        message = `Добавлен участник: ${item.name} × ${count}.`;
        break;
      }
      case "edit": {
        if (!b.manual) throw new BattleError("Нет параметров участника.");
        if (
          data.status !== "preparing" &&
          (b.manual.initiative !== p.initiative ||
            b.manual.initiativeMod !== p.initiativeMod)
        )
          throw new BattleError("Меняйте инициативу в подготовке.");
        const q = { ...p, ...b.manual };
        if (q.hp !== p.hp || q.deathSaves !== p.deathSaves) {
          if (q.hp > 0) {
            q.deathState = "alive";
            q.success = 0;
            q.failure = 0;
          } else {
            q.deathState = q.deathSaves ? "dying" : "dead";
            q.concentration = "";
            q.concentrationDC = null;
          }
        }
        data.participants[index] = q;
        message = `Параметры ${p.name} изменены вручную.`;
        break;
      }
      case "remove":
        data.participants.splice(index, 1);
        data.turn = 0;
        message = `Участник ${p.name} убран из боя.`;
        break;
      case "reorder": {
        const next = index + (b.direction === "up" ? -1 : 1);
        if (next >= 0 && next < data.participants.length)
          [data.participants[index], data.participants[next]] = [
            data.participants[next],
            p,
          ];
        message = `Изменён порядок ${p.name} при равной инициативе.`;
        break;
      }
      case "rollInitiative":
        for (const item of data.participants)
          item.initiative = randomInt(1, 21) + item.initiativeMod;
        message = "Инициатива брошена для всех участников.";
        break;
      case "start":
        data = startBattle(data);
        message =
          "Начат первый раунд. Равная инициатива — по порядку подготовки.";
        break;
      case "next":
      case "previous":
      case "round":
        data = moveTurn(data, b.action);
        message = `Раунд ${data.round}: ход ${data.participants[data.turn].name}.`;
        break;
      case "prepare":
        data.status = "preparing";
        data.turn = 0;
        message =
          "Возврат к подготовке. Хиты и состояния сохранены; новый старт начнёт первый раунд.";
        break;
      case "finish":
        data.status = "finished";
        message = "Бой завершён.";
        break;
      case "damage":
        data.participants[index] = combatDamage(p, amount, b.critical);
        message = `${p.name}: урон ${amount}${b.critical ? " (критическое попадание)" : ""}; осталось ${data.participants[index].hp} хитов.`;
        break;
      case "heal":
        data.participants[index] = combatHeal(p, amount);
        message = `${p.name}: лечение ${amount}; ${data.participants[index].hp}/${p.maxHp} хитов.`;
        break;
      case "tempHp":
        p.tempHp = amount;
        message = `${p.name}: временные хиты заменены на ${amount}.`;
        break;
      case "condition": {
        if (!b.conditionId || b.enabled === undefined)
          throw new BattleError("Не выбрано состояние.");
        const condition = await tx.content.findUnique({
          where: { id: b.conditionId },
          include: { reference: true },
        });
        if (
          !condition ||
          condition.translationStatus !== "Approved" ||
          condition.reference?.category !== "Condition" ||
          condition.editionId !== p.edition
        )
          throw new BattleError("Состояние недоступно в редакции участника.");
        p.conditions = p.conditions.filter((c) => c.id !== condition.id);
        if (b.enabled)
          p.conditions.push({ id: condition.id, name: condition.nameRu });
        if (
          b.enabled &&
          /Incapacitated|Paralyzed|Petrified|Stunned|Unconscious/i.test(
            condition.nameOriginal,
          )
        ) {
          p.concentration = "";
          p.concentrationDC = null;
        }
        message = `${p.name}: ${b.enabled ? "добавлено" : "снято"} состояние «${condition.nameRu}».`;
        break;
      }
      case "concentration":
        if (b.text && p.conditions.length) {
          const blocking = await tx.content.findMany({
            where: { id: { in: p.conditions.map((c) => c.id) } },
            select: { nameOriginal: true },
          });
          if (
            blocking.some((c) =>
              /Incapacitated|Paralyzed|Petrified|Stunned|Unconscious/i.test(
                c.nameOriginal,
              ),
            )
          )
            throw new BattleError(
              "Текущее состояние участника не позволяет концентрироваться.",
            );
        }
        if (p.hp === 0 || p.deathState === "dead")
          throw new BattleError("При 0 хитах концентрация невозможна.");
        p.concentration = (b.text ?? "").slice(0, 200);
        p.concentrationDC = null;
        message = `${p.name}: ${p.concentration ? `концентрация — ${p.concentration}` : "концентрация завершена"}.`;
        break;
      case "concentrationPass":
        p.concentrationDC = null;
        message = `${p.name}: концентрация сохранена.`;
        break;
      case "concentrationFail":
        p.concentration = "";
        p.concentrationDC = null;
        message = `${p.name}: концентрация прервана.`;
        break;
      case "deathSave": {
        const roll = randomInt(1, 21);
        data.participants[index] = deathSave(p, roll);
        message = `${p.name}: спасбросок от смерти — ${roll} на к20.`;
        break;
      }
      case "stabilize":
        if (p.hp !== 0 || p.deathState === "dead")
          throw new BattleError(
            "Стабилизировать можно живого участника при 0 хитах.",
          );
        p.deathState = "stable";
        p.success = 0;
        p.failure = 0;
        message = `${p.name} стабилизирован.`;
        break;
      case "revive":
        if (amount < 1)
          throw new BattleError("Укажите хиты после воскрешения.");
        p.hp = Math.min(p.maxHp, amount);
        p.deathState = "alive";
        p.success = 0;
        p.failure = 0;
        message = `${p.name}: восстановлена жизнь, ${p.hp} хитов (решение мастера).`;
        break;
      case "markDead":
        p.hp = 0;
        p.deathState = "dead";
        p.concentration = "";
        p.concentrationDC = null;
        message = `${p.name} отмечен погибшим.`;
        break;
      case "notes":
        if (b.name) data.name = b.name;
        data.notes = b.text ?? data.notes;
        message = "Заметки боя сохранены.";
        break;
      case "archive":
        if (b.archived === undefined)
          throw new BattleError("Не задано состояние архива.");
        archived = b.archived;
        message = archived ? "Бой отправлен в архив." : "Бой восстановлен.";
        break;
    }
    log(data, message);
    data = battleSchema.parse(data);
    const changed = await tx.encounter.updateMany({
      where: { id: row.id, version: row.version, ownerId },
      data: {
        data: json(data),
        name: data.name,
        archived,
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1)
      throw new BattleError(
        "Бой изменён в другом окне. Обновите страницу.",
        409,
      );
    return record(
      await tx.encounter.findUniqueOrThrow({ where: { id: row.id, ownerId } }),
    );
  });
}
