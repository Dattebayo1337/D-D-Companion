import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/database/client";
import { contentInclude, toContent } from "@/database/repository";
import {
  creatureTypes,
  referenceCategories,
  damages,
  editionSchema,
  schools,
  sizes,
  abilities,
} from "@/entities/content";
import { normalize, searchScore } from "./normalize";

export const filtersSchema = z.object({
  scope: z.enum(["all", "mine", "public", "archived"]).optional(),
  q: z.string().max(200).default(""),
  category: z.enum(referenceCategories).optional(),
  kind: z.enum(["Spell", "Monster", "Reference"]).optional(),
  edition: editionSchema.optional(),
  level: z.coerce.number().int().min(0).max(9).optional(),
  school: z.enum(schools).optional(),
  ritual: z.enum(["true", "false"]).optional(),
  concentration: z.enum(["true", "false"]).optional(),
  spellClass: z.string().trim().min(1).max(100).optional(),
  subclass: z.string().trim().min(1).max(150).optional(),
  castingTime: z
    .enum(["Action", "BonusAction", "Reaction", "Minute", "Hour", "Special"])
    .optional(),
  savingThrow: z.enum(abilities).optional(),
  attackType: z.enum(["Melee", "Ranged"]).optional(),
  rangeKind: z
    .enum(["Distance", "Self", "Touch", "Sight", "Unlimited", "Special"])
    .optional(),
  minRange: z.coerce.number().min(0).max(10000000).optional(),
  environment: z.string().trim().min(1).max(100).optional(),
  minSpeed: z.coerce.number().min(0).max(10000000).optional(),
  type: z.enum(creatureTypes).optional(),
  size: z.enum(sizes).optional(),
  cr: z.coerce.number().min(0).max(30).optional(),
  sourceBookId: z.string().uuid().optional(),
  damageType: z.enum(damages).optional(),
  movement: z.enum(["walk", "fly", "swim", "climb", "burrow"]).optional(),
  resistance: z.enum(damages).optional(),
  immunity: z.enum(damages).optional(),
  legendary: z.enum(["true", "false"]).optional(),
  spellcaster: z.enum(["true", "false"]).optional(),
  sense: z
    .enum(["darkvision", "blindsight", "tremorsense", "truesight"])
    .optional(),
  parentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(18),
});
export type SearchFilters = z.infer<typeof filtersSchema>;
export interface SearchEngine {
  find(query: string): Promise<string[]>;
}
export class SqliteSearchEngine implements SearchEngine {
  async find(query: string) {
    // Scan only compact persisted search documents, not stat blocks. Swap engine for large catalogs.
    const docs = await db.content.findMany({
      where: { translationStatus: "Approved" },
      select: { id: true, searchText: true, nameRu: true, nameOriginal: true },
    });
    return docs
      .map((d) => {
        const score = searchScore(d.searchText, query);
        const title = normalize(d.nameRu + " " + d.nameOriginal);
        return {
          id: d.id,
          score:
            score > 0
              ? score +
                5 * searchScore(title, query) +
                ([normalize(d.nameRu), normalize(d.nameOriginal)].includes(
                  normalize(query),
                )
                  ? 1000
                  : 0)
              : 0,
        };
      })
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((d) => d.id);
  }
}
export class PostgresSearchEngine implements SearchEngine {
  async find(query: string) {
    const q = normalize(query);
    const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id" FROM "Content"
      WHERE "translationStatus" = 'Approved' AND (
        to_tsvector('russian', "searchText") @@ plainto_tsquery('russian', ${q})
        OR "searchText" ILIKE ${"%" + q + "%"}
        OR word_similarity(${q}, "searchText") > 0.35)
      ORDER BY ts_rank_cd(to_tsvector('russian', "searchText"), plainto_tsquery('russian', ${q})) DESC, "nameRu" ASC`);
    return rows.map((r) => r.id);
  }
}
export async function search(filters: SearchFilters, skipOverride?: number) {
  const spellOnly = [
    filters.level,
    filters.school,
    filters.ritual,
    filters.concentration,
    filters.damageType,
    filters.spellClass,
    filters.subclass,
    filters.castingTime,
    filters.savingThrow,
    filters.attackType,
    filters.rangeKind,
    filters.minRange,
  ].some((v) => v !== undefined);
  const monsterOnly = [
    filters.cr,
    filters.type,
    filters.size,
    filters.movement,
    filters.resistance,
    filters.immunity,
    filters.legendary,
    filters.spellcaster,
    filters.sense,
    filters.environment,
    filters.minSpeed,
  ].some((v) => v !== undefined);
  if (
    (spellOnly && monsterOnly) ||
    (spellOnly && filters.kind && filters.kind !== "Spell") ||
    (monsterOnly && filters.kind && filters.kind !== "Monster")
  )
    return {
      items: [],
      total: 0,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  const offset = skipOverride ?? (filters.page - 1) * filters.pageSize;
  const engine: SearchEngine =
    process.env.DATABASE_PROVIDER === "postgresql"
      ? new PostgresSearchEngine()
      : new SqliteSearchEngine();
  const ranked = filters.q.trim() ? await engine.find(filters.q) : undefined;
  const spell = {
    level: filters.level,
    school: filters.school,
    ritual: filters.ritual ? filters.ritual === "true" : undefined,
    concentration: filters.concentration
      ? filters.concentration === "true"
      : undefined,
    damageType: filters.damageType,
  };
  const monster = {
    challengeRating: filters.cr,
    type: filters.type,
    size: filters.size,
  };
  const where: Prisma.ContentWhereInput = {
    translationStatus: "Approved",
    editionId: filters.edition,
    kind: filters.kind,
    sourceBookId: filters.sourceBookId,
    ...(filters.category || filters.parentId
      ? {
          reference: {
            is: { category: filters.category, parentId: filters.parentId },
          },
        }
      : {}),
    ...(ranked ? { id: { in: ranked } } : {}),
    ...(Object.values(spell).some((v) => v !== undefined)
      ? { spell: { is: spell } }
      : {}),
    ...(Object.values(monster).some((v) => v !== undefined)
      ? { monster: { is: monster } }
      : {}),
  };
  if (
    filters.spellClass ||
    filters.subclass ||
    filters.castingTime ||
    filters.savingThrow ||
    filters.attackType ||
    filters.rangeKind ||
    filters.minRange !== undefined
  ) {
    if (filters.kind && filters.kind !== "Spell")
      return {
        items: [],
        total: 0,
        page: filters.page,
        pageSize: filters.pageSize,
      };
    const rows = await db.content.findMany({
      where: { ...where, kind: "Spell" },
      include: contentInclude,
    });
    const items = rows.map(toContent).filter((e) => {
      if (e.kind !== "Spell") return false;
      const s = e.spell;
      return (
        (!filters.spellClass ||
          s.classes.some(
            (c) => normalize(c) === normalize(filters.spellClass!),
          )) &&
        (!filters.subclass ||
          s.subclasses.some(
            (c) => normalize(c) === normalize(filters.subclass!),
          )) &&
        (!filters.castingTime || s.castingTime === filters.castingTime) &&
        (!filters.savingThrow || s.savingThrow === filters.savingThrow) &&
        (!filters.attackType || s.attackType === filters.attackType) &&
        (!filters.rangeKind || s.rangeKind === filters.rangeKind) &&
        (filters.minRange === undefined ||
          (s.rangeKind === "Distance" && s.rangeFeet >= filters.minRange))
      );
    });
    const rank = new Map(ranked?.map((id, i) => [id, i]));
    items.sort((a, b) =>
      ranked
        ? (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)
        : a.nameRu.localeCompare(b.nameRu, "ru") || a.id.localeCompare(b.id),
    );
    return {
      items: items.slice(offset, offset + filters.pageSize),
      total: items.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }
  if (
    filters.movement ||
    filters.resistance ||
    filters.immunity ||
    filters.legendary ||
    filters.spellcaster ||
    filters.sense ||
    filters.environment ||
    filters.minSpeed !== undefined
  ) {
    const rows = await db.content.findMany({
      where: { ...where, kind: "Monster" },
      include: contentInclude,
    });
    const filtered = rows.map(toContent).filter((e) => {
      if (e.kind !== "Monster") return false;
      const m = e.monster;
      if (
        filters.environment &&
        !m.environment.some((v) =>
          normalize(v).includes(normalize(filters.environment!)),
        )
      )
        return false;
      if (
        filters.minSpeed !== undefined &&
        m.speed[filters.movement ?? "walk"] < filters.minSpeed
      )
        return false;
      if (filters.movement && m.speed[filters.movement] <= 0) return false;
      if (filters.resistance && !m.resistances.includes(filters.resistance))
        return false;
      if (filters.immunity && !m.immunities.includes(filters.immunity))
        return false;
      if (
        filters.legendary &&
        m.legendaryActions.length > 0 !== (filters.legendary === "true")
      )
        return false;
      if (
        filters.spellcaster &&
        Boolean(
          m.spellcastingRu.trim() ||
            /\*\*_(?:Innate )?Spellcasting[.(]/i.test(e.descriptionOriginal) ||
            /(?:использование заклинаний|врожд[её]нное колдовство)/i.test(
              m.traits.map((f) => f.nameRu + " " + f.descriptionRu).join(" "),
            ),
        ) !==
          (filters.spellcaster === "true")
      )
        return false;
      if (
        filters.sense &&
        !e.descriptionOriginal.toLowerCase().includes(filters.sense) &&
        !normalize(m.sensesRu).includes(
          normalize(
            {
              darkvision: "тёмное зрение",
              blindsight: "слепое зрение",
              tremorsense: "чувство вибрации",
              truesight: "истинное зрение",
            }[filters.sense],
          ),
        )
      )
        return false;
      return true;
    });
    const rank = new Map(ranked?.map((id, i) => [id, i]));
    filtered.sort((a, b) =>
      ranked
        ? (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)
        : a.nameRu.localeCompare(b.nameRu, "ru"),
    );
    return {
      items: filtered.slice(offset, offset + filters.pageSize),
      total: filtered.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }
  const total = await db.content.count({ where });
  if (ranked) {
    const eligible = new Set(
      (await db.content.findMany({ where, select: { id: true } })).map(
        (r) => r.id,
      ),
    );
    const pageIds = ranked
      .filter((id) => eligible.has(id))
      .slice(offset, offset + filters.pageSize);
    const matches = await db.content.findMany({
      where: { id: { in: pageIds } },
      include: contentInclude,
    });
    const order = new Map(pageIds.map((id, i) => [id, i]));
    matches.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return {
      items: matches.map(toContent),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }
  const rows = await db.content.findMany({
    where,
    include: contentInclude,
    orderBy: [{ nameRu: "asc" }, { id: "asc" }],
    skip: offset,
    take: filters.pageSize,
  });
  return {
    items: rows.map(toContent),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
