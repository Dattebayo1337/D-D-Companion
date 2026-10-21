import type { Content } from "@/entities/content";
import {
  castingLabels,
  schoolLabels,
  typeLabels,
  damageLabels,
} from "@/localization/labels";

export function plainText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*\|[\s:|\-]+\|\s*$/gm, "")
    .replace(/\|/g, " · ")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
/** Extract an actual passage, never infer or invent mechanics. */
export function shortPassage(text: string, limit = 360) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !/^(?:#{1,6}\s|\||!\[|Таблица[:\s])/i.test(s));
  const prose = blocks.find(
    (s) =>
      plainText(s).length > 35 &&
      !/^(?:Источник|Редкость|Класс:|Уровни|\*?\*?Предварительн)/i.test(s) &&
      !/^\*[^*]+\*$/.test(s),
  );
  const value = plainText(prose || blocks[0] || text);
  const sentences = value.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [value];
  let result = "";
  for (const sentence of sentences.slice(0, 2)) {
    if ((result + sentence).length > limit) break;
    result += sentence;
  }
  if (result.trim()) return result.trim();
  if (value.length <= limit) return value;
  return value.slice(0, limit).replace(/\s+\S*$/, "") + "…";
}
export function contentSummary(entry: Content) {
  if (entry.kind === "Monster") {
    const m = entry.monster;
    const features = [...m.traits, ...m.actions].flatMap((feature) => {
      const names = Array.from(
        feature.descriptionRu.matchAll(/(?:^|\n)\*\*_?([^*\n]+?)_?\*\*/g),
        (match) => plainText(match[1]).replace(/[.:]$/, ""),
      );
      return names.length
        ? names
        : /^(Действия|Особенности|Свойства)$/.test(feature.nameRu)
          ? []
          : [feature.nameRu];
    });
    return {
      text: `${typeLabels[m.type]}. Опасность ${m.challengeRating}; ${m.xp} опыта.`,
      facts: [
        { label: "Защита", value: `КД ${m.armorClass}` },
        { label: "Живучесть", value: `${m.hitPoints} хитов` },
        ...(features.length
          ? [
              {
                label: "Приёмы и особенности",
                value: [...new Set(features)].slice(0, 5).join(" · "),
              },
            ]
          : []),
        ...(m.legendaryActions.length
          ? [{ label: "Особенность", value: "Легендарные действия" }]
          : []),
        ...(m.immunities.length
          ? [
              {
                label: "Иммунитеты",
                value: m.immunities.map((d) => damageLabels[d]).join(", "),
              },
            ]
          : []),
      ],
    };
  }
  if (entry.kind === "Spell") {
    const s = entry.spell;
    return {
      text: shortPassage(entry.descriptionRu),
      facts: [
        {
          label: "Магия",
          value: `${s.level ? `${s.level}-й уровень` : "Заговор"} · ${schoolLabels[s.school]}`,
        },
        {
          label: "Применение",
          value: s.castingTimeRu || castingLabels[s.castingTime],
        },
        ...(s.concentration
          ? [{ label: "Важно", value: "Требует концентрации" }]
          : []),
        ...(s.ritual ? [{ label: "Вариант", value: "Ритуал" }] : []),
      ],
    };
  }
  const classOverviews: Record<string, string> = {
    Варвар:
      "Воин ближнего боя, который полагается на ярость, силу и стойкость. Подходит для давления на противника и удержания передней линии.",
    Бард: "Универсальный заклинатель и мастер навыков. Поддерживает союзников, влияет на противников и помогает группе в общении.",
    Жрец: "Божественный заклинатель с поддержкой, защитой и атакующей магией. Выбор домена определяет его особую роль в группе.",
    Друид:
      "Заклинатель природы с превращениями и контролем поля боя. Совмещает магическую поддержку, исследование и взаимодействие с миром природы.",
    Воин: "Мастер оружия и боевых приёмов. Подходит для устойчивого урона, защиты и настройки стиля боя через специализацию.",
    Монах:
      "Подвижный боец, сочетающий безоружные удары и особые техники. Полагается на движение, точность и управление внутренним ресурсом.",
    Паладин:
      "Воин священной клятвы. Сочетает оружие, защиту союзников, лечение и божественную магию.",
    Следопыт:
      "Охотник и исследователь с оружием и магией природы. Помогает группе выслеживать цели и действовать в опасной местности.",
    Плут: "Специалист по навыкам, скрытности и точным атакам. Ищет выгодную позицию и использует уязвимости противника.",
    Чародей:
      "Носитель врождённой магии. Изменяет применение заклинаний с помощью метамагии и управляет ограниченным запасом магического ресурса.",
    Колдун:
      "Заклинатель, получивший силу через связь с покровителем. Настраивает способности воззваниями и использует магию договора.",
    Волшебник:
      "Изучает магию и собирает заклинания в книге. Силен разнообразием магических решений и подготовкой к ожидаемым задачам.",
  };
  return {
    text:
      (entry.contentOrigin === "SRD" &&
        entry.reference.category === "Class" &&
        classOverviews[entry.nameRu]) ||
      shortPassage(
        entry.reference.category === "Condition"
          ? entry.descriptionRu
              .split(/\n\s*\n/)
              .filter((block) => !/^Пока вы находитесь в состоянии/i.test(block.trim()))
              .map((block) => block.replace(/^\*\*_?[^*]+_?\*\*\s*/, ""))
              .slice(0, 2)
              .join(" ")
          : entry.descriptionRu,
      ),
    facts: entry.reference.properties
      .filter((p) => p.valueRu)
      .slice(0, 4)
      .map((p) => ({ label: p.nameRu, value: plainText(p.valueRu) })),
  };
}
