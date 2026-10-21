import type { Content, Issue, TermTranslation } from "@/entities/content";

function inspect(
  value: unknown,
  path: string,
  issues: Issue[],
  entityId: string,
) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => inspect(v, `${path}.${i}`, issues, entityId));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, v] of Object.entries(value)) {
    const p = `${path}.${key}`;
    if (
      [
        "classes",
        "subclasses",
        "conditions",
        "conditionImmunities",
        "environment",
      ].includes(key) &&
      Array.isArray(v)
    ) {
      v.forEach((label, index) => {
        if (
          typeof label === "string" &&
          (!/[а-яё]/i.test(label) || /[a-z]{2,}/i.test(label))
        )
          issues.push({
            path: `${p}.${index}`,
            entityId,
            message: "Свойство должно иметь русскую локализацию.",
          });
      });
    }
    if (key.endsWith("Ru") && typeof v === "string" && v) {
      if (/[a-z]{2,}/i.test(v))
        issues.push({
          path: p,
          entityId,
          message: "Английский текст в русском поле.",
        });
      if (
        /\{\{|\$\{|TODO|TBD|placeholder|перевод\s+здесь|^\s*заполнить\s*[.!]?$/i.test(
          v,
        )
      )
        issues.push({ path: p, entityId, message: "Необработанный шаблон." });
    }
    if (key === "nameRu" || key === "descriptionRu") {
      if (typeof v !== "string" || !v.trim() || !/[а-яё]/i.test(v))
        issues.push({
          path: p,
          entityId,
          message: "Отсутствует русская локализация.",
        });
    }
    inspect(v, p, issues, entityId);
  }
}
export function validateRussian(entries: Content[]): Issue[] {
  const issues: Issue[] = [];
  for (const entry of entries) {
    inspect(entry, entry.id, issues, entry.id);
    if (entry.translationStatus === "Missing")
      issues.push({
        path: `${entry.id}.translationStatus`,
        entityId: entry.id,
        message: "Отсутствует русская локализация.",
      });
    const required =
      entry.kind === "Spell"
        ? {
            durationRu: entry.spell.durationRu,
            ...(entry.spell.components.includes("M")
              ? { materialComponentRu: entry.spell.materialComponentRu }
              : {}),
          }
        : entry.kind === "Monster"
          ? {
              alignmentRu: entry.monster.alignmentRu,
              sensesRu: entry.monster.sensesRu,
              languagesRu: entry.monster.languagesRu,
            }
          : {};
    for (const [field, value] of Object.entries(required))
      if (!value.trim())
        issues.push({
          path: `${entry.id}.${field}`,
          entityId: entry.id,
          message: "Отсутствует русская локализация.",
        });
  }
  return issues;
}
export function validateTerminology(terms: TermTranslation[]): Issue[] {
  const seen = new Map<string, string>();
  return terms.flatMap((term) => {
    const key = `${term.edition}:${term.category}:${term.original.toLowerCase()}`;
    const previous = seen.get(key);
    seen.set(key, term.russian);
    if (!/[а-яё]/i.test(term.russian) || /[a-z]/i.test(term.russian))
      return [
        { path: term.id, message: "Термин должен иметь русский перевод." },
      ];
    return previous && previous !== term.russian
      ? [
          {
            path: term.id,
            message: `Конфликт переводов термина «${term.original}».`,
          },
        ]
      : [];
  });
}
