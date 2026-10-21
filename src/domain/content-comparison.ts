import type { Content } from "@/entities/content";
import {
  abilityLabels,
  castingLabels,
  componentLabels,
  damageLabels,
  schoolLabels,
  sizeLabels,
  typeLabels,
} from "@/localization/labels";
import { plainText } from "./content-summary";
export function comparisonFields(entry: Content): Record<string, string> {
  const fields: Record<string, string> = {
    Название: entry.nameRu,
    Описание: entry.descriptionRu,
  };
  if (entry.kind === "Reference") {
    const occurrences = new Map<string, number>();
    for (const p of entry.reference.properties) {
      const count = (occurrences.get(p.nameRu) ?? 0) + 1;
      occurrences.set(p.nameRu, count);
      fields[`Свойство: ${p.nameRu}${count > 1 ? ` (${count})` : ""}`] =
        p.valueRu;
    }
    fields["Умения по уровням"] = entry.reference.features
      .map(
        (f) =>
          `${f.level === null ? "" : `${f.level}-й уровень · `}${f.nameRu}\n${f.descriptionRu}`,
      )
      .join("\n\n");
    fields["Развитие класса"] = entry.reference.progression
      .map(
        (r) =>
          `${r.level}: +${r.proficiencyBonus}; ${r.featuresRu}; ${r.resourcesRu}; ячейки: ${r.spellSlots.join(" / ")}`,
      )
      .join("\n");
  } else if (entry.kind === "Spell") {
    const s = entry.spell;
    Object.assign(fields, {
      Уровень: String(s.level),
      Школа: schoolLabels[s.school],
      Время: s.castingTimeRu || castingLabels[s.castingTime],
      Дальность:
        s.rangeKind === "Distance"
          ? `${s.rangeFeet} футов`
          : s.rangeRu ||
            {
              Self: "На себя",
              Touch: "Касание",
              Sight: "В пределах видимости",
              Unlimited: "Неограниченная",
              Special: "Особая",
            }[s.rangeKind],
      Компоненты: s.components.map((c) => componentLabels[c]).join(", "),
      Материалы: s.materialComponentRu,
      "Стоимость материалов":
        s.materialCost === null ? "Не указана" : String(s.materialCost),
      "Материалы расходуются": s.materialConsumed ? "Да" : "Нет",
      Длительность: s.durationRu,
      Концентрация: s.concentration ? "Да" : "Нет",
      Ритуал: s.ritual ? "Да" : "Нет",
      Классы: s.classes.join(", "),
      Подклассы: s.subclasses.join(", "),
      Цель: s.targetRu,
      Урон: `${s.damage} ${s.damageType ? damageLabels[s.damageType] : ""}`.trim(),
      Лечение: s.healing,
      Спасбросок: s.savingThrow ? abilityLabels[s.savingThrow] : "",
      Атака: s.attackType
        ? s.attackType === "Melee"
          ? "Рукопашная"
          : "Дальнобойная"
        : "",
      "Усиление заклинания": s.higherLevelsRu,
    });
  } else {
    const m = entry.monster;
    Object.assign(fields, {
      Размер: sizeLabels[m.size],
      Тип: typeLabels[m.type],
      Мировоззрение: m.alignmentRu,
      "Класс доспеха": String(m.armorClass),
      Хиты: `${m.hitPoints} (${m.hitDice})`,
      Опасность: String(m.challengeRating),
      Опыт: String(m.xp),
      "Бонус мастерства": String(m.proficiencyBonus),
      Чувства: m.sensesRu,
      Языки: m.languagesRu,
      Спасброски: m.savingThrowsRu,
      Навыки: m.skillsRu,
      Заклинания: m.spellcastingRu,
      "Иммунитеты к состояниям": m.conditionImmunities.join(", "),
    });
    for (const [a, v] of Object.entries(m.abilities))
      fields[abilityLabels[a as keyof typeof abilityLabels]] = String(v);
    for (const [k, label] of Object.entries({
      walk: "Ходьба",
      fly: "Полёт",
      swim: "Плавание",
      climb: "Лазание",
      burrow: "Копание",
    }))
      fields[label] = `${m.speed[k as keyof typeof m.speed]} футов`;
    for (const [label, list] of [
      ["Сопротивления", m.resistances],
      ["Иммунитеты", m.immunities],
      ["Уязвимости", m.vulnerabilities],
    ] as const)
      fields[label] = list.map((d) => damageLabels[d]).join(", ");
    for (const [label, list] of [
      ["Особенности", m.traits],
      ["Действия", m.actions],
      ["Бонусные действия", m.bonusActions],
      ["Реакции", m.reactions],
      ["Легендарные действия", m.legendaryActions],
      ["Действия логова", m.lairActions],
      ["Региональные эффекты", m.regionalEffects],
    ] as const)
      fields[label] = list
        .map((f) => `${f.nameRu}\n${f.descriptionRu}`)
        .join("\n\n");
  }
  return fields;
}
export function compareContent(a: Content, b: Content) {
  const left = comparisonFields(a),
    right = comparisonFields(b);
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .map((label) => ({
      label,
      left: left[label] ?? "",
      right: right[label] ?? "",
      changed: plainText(left[label] ?? "") !== plainText(right[label] ?? ""),
    }))
    .filter((r) => r.left || r.right);
}
