import registry from "../../../data/rules/character-rules.json" with { type: "json" };
import type { CharacterData } from "@/entities/character";
import { skillAbilities } from "@/entities/character";
import type { Content, EditionId } from "@/entities/content";
export type ClassRule = {
  id: string;
  name: string;
  nameRu: string;
  edition: string;
  hitDie: number;
  saves: string[];
  skillChoices: string;
  rows: { level: number; slots: number[]; values: Record<string, string> }[];
};
export const classRules = registry.classes as Record<string, ClassRule>;
const armorRules = registry.armor as Record<
  string,
  {
    nameRu: string;
    base: number;
    dex: boolean;
    maxDex: number | null;
    shield: boolean;
  }
>;
export const modifier = (score: number) => Math.floor((score - 10) / 2);
export function classSpellLevel(classId: string, level: number) {
  const rule = classRules[classId];
  if (!rule) return 0;
  const row = rule.rows[level - 1];
  return rule.name === "Warlock"
    ? Number(row.values["Slot Level"]?.match(/\d+/)?.[0] ?? 0)
    : row.slots.reduce((max, slots, i) => (slots > 0 ? i + 1 : max), 0);
}
export function pointCost(scores: number[]) {
  const costs: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };
  return scores.reduce((s, n) => s + (costs[n] ?? Infinity), 0);
}
export const totalLevel = (c: CharacterData) =>
  c.classes.reduce((s, x) => s + x.level, 0);
export function finalAbilities(c: CharacterData) {
  return Object.fromEntries(
    Object.entries(c.abilities).map(([k, v]) => [
      k,
      v + (c.abilityBonuses[k as keyof typeof c.abilities] ?? 0),
    ]),
  ) as CharacterData["abilities"];
}
const number = (s: string | undefined) => Number(s?.match(/\d+/)?.[0] ?? 0);
export function spellSlots(c: CharacterData) {
  const casters = c.classes.filter(
    (x) =>
      classRules[x.classId].name !== "Warlock" &&
      classRules[x.classId].rows[x.level - 1].slots.some((n) => n > 0),
  );
  if (casters.length === 0) return Array(9).fill(0) as number[];
  if (casters.length === 1)
    return [...classRules[casters[0].classId].rows[casters[0].level - 1].slots];
  const level = casters.reduce(
    (n, x) =>
      n +
      (["Paladin", "Ranger"].includes(classRules[x.classId].name)
        ? c.edition === "5e_2024"
          ? Math.ceil(x.level / 2)
          : Math.floor(x.level / 2)
        : x.level),
    0,
  );
  const full = Object.values(classRules).find(
    (x) => x.edition === c.edition && x.name === "Wizard",
  )!;
  return [...full.rows[Math.max(1, level) - 1].slots];
}
export type Resource = {
  key: string;
  name: string;
  max: number;
  short: number;
  long: boolean;
};
export function resources(c: CharacterData): Resource[] {
  const result: Resource[] = [];
  const scores = finalAbilities(c);
  for (const x of c.classes) {
    const rule = classRules[x.classId],
      v = rule.rows[x.level - 1].values,
      modern = c.edition === "5e_2024";
    const add = (
      key: string,
      name: string,
      max: number,
      short = 0,
      long = true,
    ) => {
      if (max > 0)
        result.push({ key: x.classId + ":" + key, name, max, short, long });
    };
    switch (rule.name) {
      case "Barbarian":
        add("rage", "Ярость", number(v.Rages), modern ? 1 : 0);
        break;
      case "Bard":
        add(
          "inspiration",
          "Бардовское вдохновение",
          Math.max(1, modifier(scores.CHA)),
          x.level >= 5 ? 1000 : 0,
        );
        break;
      case "Cleric":
        if (x.level >= 2)
          add(
            "channel",
            "Божественный канал",
            modern
              ? number(v["Channel Divinity"])
              : x.level >= 18
                ? 3
                : x.level >= 6
                  ? 2
                  : 1,
            modern ? 1 : 1000,
          );
        break;
      case "Druid":
        if (x.level >= 2)
          add(
            "wildshape",
            "Дикий облик",
            modern ? number(v["Wild Shape"]) : 2,
            modern ? 1 : 1000,
          );
        break;
      case "Fighter":
        add(
          "secondwind",
          "Второе дыхание",
          modern ? number(v["Second Wind"]) : 1,
          modern ? 1 : 1000,
        );
        if (x.level >= 2)
          add("surge", "Всплеск действий", x.level >= 17 ? 2 : 1, 1000);
        if (x.level >= 9)
          add(
            "indomitable",
            "Несгибаемый",
            x.level >= 17 ? 3 : x.level >= 13 ? 2 : 1,
          );
        break;
      case "Monk":
        if (x.level >= 2)
          add("focus", modern ? "Очки фокуса" : "Очки ци", x.level, 1000);
        break;
      case "Paladin":
        add("layhands", "Наложение рук", x.level * 5);
        if (x.level >= 3)
          add(
            "channel",
            "Божественный канал",
            modern ? number(v["Channel Divinity"]) : 1,
            modern ? 1 : 1000,
          );
        break;
      case "Sorcerer":
        if (x.level >= 2) add("sorcery", "Очки чародейства", x.level);
        break;
    }
  }
  return result;
}
export function deriveCharacter(c: CharacterData) {
  const level = totalLevel(c),
    scores = finalAbilities(c),
    mods = Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, modifier(v)]),
    ) as Record<keyof typeof scores, number>;
  const proficiency = 2 + Math.floor((level - 1) / 4);
  let maxHp = c.adjustments.maxHp;
  c.classes.forEach((x, ci) =>
    x.hpRolls.forEach((roll, li) => {
      maxHp += Math.max(
        1,
        (ci === 0 && li === 0 ? classRules[x.classId].hitDie : roll) + mods.CON,
      );
    }),
  );
  maxHp = Math.max(1, maxHp);
  let ac = 10 + mods.DEX;
  const worn = c.inventory.filter((i) => i.equipped && armorRules[i.contentId]);
  const armor = worn.find((i) => !armorRules[i.contentId].shield);
  const shield = worn.some((i) => armorRules[i.contentId].shield);
  if (armor) {
    const a = armorRules[armor.contentId];
    ac = a.base + (a.dex ? Math.min(mods.DEX, a.maxDex ?? mods.DEX) : 0);
  } else if (classRules[c.classes[0].classId].name === "Barbarian")
    ac += mods.CON;
  else if (classRules[c.classes[0].classId].name === "Monk" && !shield)
    ac += mods.WIS;
  if (shield) ac += 2;
  if (c.adjustments.ac !== null) ac = c.adjustments.ac;
  const first = classRules[c.classes[0].classId];
  const saves = Object.fromEntries(
    Object.keys(scores).map((a) => [
      a,
      mods[a as keyof typeof mods] +
        (first.saves.includes(a) ||
        c.extraSaves.includes(a as keyof typeof mods)
          ? proficiency
          : 0),
    ]),
  );
  const jack = c.classes.some(
    (x) => classRules[x.classId].name === "Bard" && x.level >= 2,
  );
  const skills = Object.fromEntries(
    Object.entries(skillAbilities).map(([skill, ability]) => [
      skill,
      mods[ability] +
        ((c.skills[skill as keyof typeof skillAbilities] ?? 0) > 0
          ? proficiency * c.skills[skill as keyof typeof skillAbilities]!
          : jack
            ? Math.floor(proficiency / 2)
            : 0),
    ]),
  );
  const warlock = c.classes.find(
    (x) => classRules[x.classId].name === "Warlock",
  );
  const pv = warlock
    ? classRules[warlock.classId].rows[warlock.level - 1].values
    : {};
  return {
    level,
    proficiency,
    scores,
    mods,
    maxHp,
    ac,
    initiative: mods.DEX + c.adjustments.initiative,
    speed: c.adjustments.speed,
    saves,
    skills,
    passivePerception: 10 + skills.Perception,
    slots: spellSlots(c),
    pact: { max: number(pv["Spell Slots"]), level: number(pv["Slot Level"]) },
    hitDice: c.classes.map((x) => ({
      classId: x.classId,
      die: classRules[x.classId].hitDie,
      max: x.level,
      remaining: Math.max(0, x.level - (c.spentHitDice[x.classId] ?? 0)),
    })),
    resources: resources(c),
  };
}
export function validateCharacter(
  c: CharacterData,
  content: Map<string, Content>,
) {
  const issues: string[] = [];
  const scores = Object.values(c.abilities);
  if (
    c.method === "Standard" &&
    scores.toSorted((a, b) => a - b).join(",") !== "8,10,12,13,14,15"
  )
    issues.push(
      "Стандартный набор: 15, 14, 13, 12, 10, 8, каждое значение один раз.",
    );
  if (c.method === "PointBuy" && pointCost(scores) > 27)
    issues.push("Покупка характеристик: значения 8–15, бюджет 27 очков.");
  if (c.method === "Roll" && scores.some((n) => n < 3 || n > 18))
    issues.push("Броски характеристик дают значения от 3 до 18.");
  if (Object.values(finalAbilities(c)).some((n) => n > 30))
    issues.push("Характеристика с поправками не может превышать 30.");
  if (totalLevel(c) > 20) issues.push("Общий уровень не может превышать 20.");
  if (new Set(c.classes.map((x) => x.classId)).size !== c.classes.length)
    issues.push("Классы не должны повторяться.");
  const check = (id: string, category: string) => {
    const e = content.get(id);
    if (
      !e ||
      e.edition !== c.edition ||
      e.translationStatus !== "Approved" ||
      (category === "Spell"
        ? e.kind !== "Spell"
        : e.kind !== "Reference" || e.reference.category !== category)
    )
      issues.push(
        "Выберите запись правильной категории и редакции: " + category,
      );
    return e;
  };
  check(c.speciesRaceId, "SpeciesRace");
  check(c.backgroundId, "Background");
  for (const x of c.classes) {
    check(x.classId, "Class");
    const rule = classRules[x.classId];
    if (!rule) {
      issues.push("Механика выбранного класса пока не подключена.");
      continue;
    }
    if (x.hpRolls.length !== x.level || x.hpRolls.some((n) => n > rule.hitDie))
      issues.push("Кости хитов должны соответствовать уровню и классу.");
    if (x.subclassId) {
      const sub = check(x.subclassId, "Subclass");
      if (sub?.kind === "Reference" && sub.reference.parentId !== x.classId)
        issues.push("Подкласс не принадлежит классу.");
      const min =
        sub?.kind === "Reference"
          ? Math.min(...sub.reference.features.map((f) => f.level ?? 20))
          : 20;
      if (x.level < min)
        issues.push("Уровень класса недостаточен для подкласса.");
    }
  }
  if (c.classes.length > 1) {
    const abilities = finalAbilities(c);
    const requirements: Record<string, string[][]> = {
      Barbarian: [["STR"]],
      Bard: [["CHA"]],
      Cleric: [["WIS"]],
      Druid: [["WIS"]],
      Fighter: [["STR", "DEX"]],
      Monk: [["DEX"], ["WIS"]],
      Paladin: [["STR"], ["CHA"]],
      Ranger: [["DEX"], ["WIS"]],
      Rogue: [["DEX"]],
      Sorcerer: [["CHA"]],
      Warlock: [["CHA"]],
      Wizard: [["INT"]],
    };
    for (const x of c.classes) {
      const rule = classRules[x.classId];
      if (
        rule &&
        requirements[rule.name].some(
          (group) =>
            !group.some((a) => abilities[a as keyof typeof abilities] >= 13),
        )
      )
        issues.push("Не выполнены требования мультикласса: " + rule.nameRu);
    }
  }
  for (const i of c.inventory) {
    const e = content.get(i.contentId);
    if (
      !e ||
      e.edition !== c.edition ||
      e.kind !== "Reference" ||
      !["Weapon", "Armor", "Equipment", "MagicItem"].includes(
        e.reference.category,
      )
    )
      issues.push("Неверный предмет инвентаря.");
  }
  if (c.inventory.filter((i) => i.attuned).length > 3)
    issues.push("Можно настроиться максимум на три предмета.");
  if (
    c.inventory.filter(
      (i) =>
        i.equipped &&
        armorRules[i.contentId] &&
        !armorRules[i.contentId].shield,
    ).length > 1 ||
    c.inventory.filter((i) => i.equipped && armorRules[i.contentId]?.shield)
      .length > 1
  )
    issues.push("Можно надеть один доспех и один щит.");
  for (const id of c.featIds) check(id, "Feat");
  for (const id of c.conditionIds) check(id, "Condition");
  for (const s of c.spells) {
    const spell = check(s.spellId, "Spell");
    const owner = c.classes.find((x) => x.classId === s.classId);
    if (
      spell?.kind === "Spell" &&
      owner &&
      s.status === "Prepared" &&
      spell.spell.level > classSpellLevel(owner.classId, owner.level)
    )
      issues.push(
        "Круг подготовленного заклинания выше доступного этому классу.",
      );
    if (!c.classes.some((x) => x.classId === s.classId))
      issues.push("Заклинание должно быть связано с классом персонажа.");
  }
  if (
    new Set(c.spells.map((s) => s.classId + ":" + s.spellId)).size !==
    c.spells.length
  )
    issues.push("Заклинание уже записано для этого класса.");
  if (
    c.concentrationId &&
    !c.spells.some((s) => s.spellId === c.concentrationId)
  )
    issues.push("Сначала прекратите концентрацию на удаляемом заклинании.");
  return [...new Set(issues)];
}
export function restCharacter(input: CharacterData, kind: "short" | "long") {
  const c = structuredClone(input),
    stats = deriveCharacter(c);
  if (c.hp < 1 && (kind === "long" || c.edition === "5e_2024"))
    throw new Error("Для отдыха требуется хотя бы 1 хит.");
  if (kind === "long") {
    c.hp = stats.maxHp;
    c.concentrationId = null;
    c.tempHp = 0;
    c.slotsSpent = Array(9).fill(0);
    c.pactSpent = 0;
    c.exhaustion = Math.max(0, c.exhaustion - 1);
    c.deathSaves = { success: 0, failure: 0 };
    let recovery =
      c.edition === "5e_2024"
        ? stats.level
        : Math.max(1, Math.floor(stats.level / 2));
    for (const x of [...stats.hitDice].sort((a, b) => b.die - a.die)) {
      const spent = c.spentHitDice[x.classId] ?? 0;
      const regain = Math.min(spent, recovery);
      c.spentHitDice[x.classId] = spent - regain;
      recovery -= regain;
    }
  } else c.pactSpent = 0;
  for (const r of stats.resources) {
    const spent = c.resourcesUsed[r.key] ?? 0;
    if (kind === "long" && r.long) c.resourcesUsed[r.key] = 0;
    else if (kind === "short")
      c.resourcesUsed[r.key] = Math.max(0, spent - r.short);
  }
  return c;
}
export function gainLevel(
  input: CharacterData,
  classId: string,
  roll?: number,
) {
  const c = structuredClone(input),
    rule = classRules[classId];
  if (!rule || rule.edition !== c.edition)
    throw new Error("Неверная редакция класса.");
  const old = deriveCharacter(c);
  if (old.level >= 20) throw new Error("Достигнут 20-й уровень.");
  const hp = roll ?? Math.floor(rule.hitDie / 2) + 1;
  if (!Number.isInteger(hp) || hp < 1 || hp > rule.hitDie)
    throw new Error("Неверный бросок кости хитов.");
  const found = c.classes.find((x) => x.classId === classId);
  if (found) {
    found.level++;
    found.hpRolls.push(hp);
  } else c.classes.push({ classId, subclassId: null, level: 1, hpRolls: [hp] });
  c.hp += deriveCharacter(c).maxHp - old.maxHp;
  return c;
}
export const castingAbility = (name: string): "INT" | "WIS" | "CHA" =>
  ["Wizard"].includes(name)
    ? "INT"
    : ["Cleric", "Druid", "Ranger"].includes(name)
      ? "WIS"
      : "CHA";
export const sameEdition = (a: EditionId, b: EditionId) => a === b;
