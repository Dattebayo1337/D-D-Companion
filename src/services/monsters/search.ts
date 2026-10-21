import { db } from "@/database/client";
import { customMonsterEntry } from "./service";
import { search, type SearchFilters } from "@/search/service";
import { normalize, searchScore, searchDocument } from "@/search/normalize";
import type { PersonalMonster } from "@/entities/custom-monster";
function matches(e: PersonalMonster, f: SearchFilters) {
  const m = e.monster;
  if (
    f.category ||
    f.parentId ||
    (f.kind && f.kind !== "Monster") ||
    f.level !== undefined ||
    f.school ||
    f.ritual ||
    f.concentration ||
    f.damageType ||
    f.spellClass ||
    f.subclass ||
    f.castingTime ||
    f.savingThrow ||
    f.attackType ||
    f.rangeKind ||
    f.minRange !== undefined
  )
    return false;
  if (
    f.environment &&
    !m.environment.some((v) => normalize(v).includes(normalize(f.environment!)))
  )
    return false;
  if (f.minSpeed !== undefined && m.speed[f.movement ?? "walk"] < f.minSpeed)
    return false;
  if (
    (f.edition && e.edition !== f.edition) ||
    (f.sourceBookId && e.sourceBookId !== f.sourceBookId)
  )
    return false;
  if (
    (f.type && m.type !== f.type) ||
    (f.size && m.size !== f.size) ||
    (f.cr !== undefined && m.challengeRating !== f.cr)
  )
    return false;
  if (
    (f.movement && m.speed[f.movement] <= 0) ||
    (f.resistance && !m.resistances.includes(f.resistance)) ||
    (f.immunity && !m.immunities.includes(f.immunity))
  )
    return false;
  if (f.legendary && m.legendaryActions.length > 0 !== (f.legendary === "true"))
    return false;
  if (
    f.spellcaster &&
    Boolean(m.spellcastingRu.trim()) !== (f.spellcaster === "true")
  )
    return false;
  const senses = {
    darkvision: "тёмное зрение",
    blindsight: "слепое зрение",
    tremorsense: "чувство вибрации",
    truesight: "истинное зрение",
  };
  if (f.sense && !normalize(m.sensesRu).includes(normalize(senses[f.sense])))
    return false;
  if (
    f.q.trim() &&
    searchScore(
      searchDocument([e.nameRu, e.descriptionRu, JSON.stringify(m)]),
      f.q,
    ) <= 0
  )
    return false;
  return true;
}
export async function searchWithCustom(
  filters: SearchFilters,
  ownerId: string | null | undefined,
) {
  if (filters.scope === "public") return search(filters);
  const possible =
    (!filters.kind || filters.kind === "Monster") &&
    !filters.category &&
    !filters.parentId;
  const own =
    ownerId !== undefined && possible
      ? (
          await db.customMonster.findMany({
            where: {
              ownerId,
              edition: filters.edition,
              archived: filters.scope === "archived",
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
          })
        )
          .map(customMonsterEntry)
          .filter((e) => matches(e, filters))
      : [];
  const offset = (filters.page - 1) * filters.pageSize;
  if (filters.scope === "mine" || filters.scope === "archived")
    return {
      items: own.slice(offset, offset + filters.pageSize),
      total: own.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  if (!own.length) return search(filters);
  const personal = own.slice(offset, offset + filters.pageSize);
  const remaining = filters.pageSize - personal.length;
  const shared = await search(
    { ...filters, pageSize: Math.max(1, remaining) },
    Math.max(0, offset - own.length),
  );
  return {
    items: [...personal, ...(remaining ? shared.items : [])],
    total: own.length + shared.total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
