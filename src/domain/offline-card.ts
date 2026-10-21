import { contentSchema, type Content } from "@/entities/content";
import { contentSummary } from "./content-summary";
import {
  abilityLabels,
  castingLabels,
  componentLabels,
  damageLabels,
  schoolLabels,
  sizeLabels,
  typeLabels,
} from "@/localization/labels";
export function offlineCard(input: Content) {
  const e = contentSchema.parse(input);
  if (e.translationStatus !== "Approved")
    throw new Error("Можно сохранить только опубликованную карточку.");
  const blocks: { title: string; text: string }[] = [];
  const add = (title: string, value: string | number) => {
    if (String(value).trim()) blocks.push({ title, text: String(value) });
  };
  add("Кратко", contentSummary(e).text);
  add("Описание", e.descriptionRu);
  if (e.kind === "Reference") {
    for (const p of e.reference.properties) add(p.nameRu, p.valueRu);
    for (const f of e.reference.features)
      add(
        `${f.level ? `${f.level}-й уровень · ` : ""}${f.nameRu}`,
        f.descriptionRu,
      );
    for (const p of e.reference.progression)
      add(
        `Уровень ${p.level} · мастерство +${p.proficiencyBonus}`,
        `${p.featuresRu}\n${p.resourcesRu}\nЯчейки по кругам: ${p.spellSlots.join(" / ")}`,
      );
  } else if (e.kind === "Spell") {
    const s = e.spell;
    add(
      "Параметры",
      `Уровень ${s.level} · ${schoolLabels[s.school]}\nВремя: ${s.castingTimeRu || castingLabels[s.castingTime]}\nДальность: ${s.rangeRu || (s.rangeKind === "Distance" ? `${s.rangeFeet} фт.` : { Self: "На себя", Touch: "Касание", Sight: "Видимость", Unlimited: "Неограниченная", Special: "Особая" }[s.rangeKind])}\nДлительность: ${s.durationRu}\nКомпоненты: ${s.components.map((c) => componentLabels[c]).join(", ")}\n${s.materialComponentRu}\n${s.concentration ? "Концентрация. " : ""}${s.ritual ? "Ритуал." : ""}`,
    );
    add("Цель", s.targetRu);
    add("На больших уровнях", s.higherLevelsRu);
    add("Классы", s.classes.join(", "));
    add("Подклассы", s.subclasses.join(", "));
  } else {
    const m = e.monster;
    add(
      "Боевые параметры",
      `${sizeLabels[m.size]} · ${typeLabels[m.type]} · ${m.subtypeRu}\n${m.alignmentRu}\nКД ${m.armorClass} ${m.armorTypeRu} · Хиты ${m.hitPoints} (${m.hitDice})\nОпасность ${m.challengeRating} · Опыт ${m.xp} · Мастерство +${m.proficiencyBonus}\n${Object.entries(
        m.abilities,
      )
        .map(
          ([k, v]) => `${abilityLabels[k as keyof typeof abilityLabels]} ${v}`,
        )
        .join(
          " · ",
        )}\nСкорость (фт.): ходьба ${m.speed.walk}, полёт ${m.speed.fly}, плавание ${m.speed.swim}, лазание ${m.speed.climb}, копание ${m.speed.burrow}`,
    );
    for (const [title, value] of [
      ["Спасброски", m.savingThrowsRu],
      ["Навыки", m.skillsRu],
      ["Чувства", m.sensesRu],
      ["Языки", m.languagesRu],
      ["Заклинания", m.spellcastingRu],
      ["Иммунитет к состояниям", m.conditionImmunities.join(", ")],
      ["Сопротивления", m.resistances.map((d) => damageLabels[d]).join(", ")],
      ["Иммунитеты", m.immunities.map((d) => damageLabels[d]).join(", ")],
      ["Уязвимости", m.vulnerabilities.map((d) => damageLabels[d]).join(", ")],
    ])
      add(title, value);
    for (const [label, rows] of [
      ["Особенности", m.traits],
      ["Действия", m.actions],
      ["Бонусные действия", m.bonusActions],
      ["Реакции", m.reactions],
      ["Легендарные действия", m.legendaryActions],
      ["Логово", m.lairActions],
      ["Регион", m.regionalEffects],
    ] as const)
      for (const f of rows) add(`${label} · ${f.nameRu}`, f.descriptionRu);
    if (!m.statBlockComplete)
      add("Полнота", "Статблок в источнике данных неполный.");
  }
  if (e.contentOrigin === "MetadataOnly")
    add("Полнота", "Справочный обзор, не полный текст правил.");
  return {
    id: e.id,
    name: e.nameRu,
    edition: e.edition,
    version: e.contentVersion,
    savedAt: new Date().toISOString(),
    source: e.source,
    license: e.license,
    blocks,
  };
}
