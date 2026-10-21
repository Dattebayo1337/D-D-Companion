import type { Content } from "@/entities/content";
import { contentSummary, plainText } from "./content-summary";

export function readingContent(entry: Content) {
  const summary = contentSummary(entry);
  const description = plainText(entry.descriptionRu);
  // Some packages include abilities in the prose; others store them separately.
  const features = entry.kind === "Reference"
    ? entry.reference.features.filter((f) =>
        plainText(f.descriptionRu) && !description.includes(plainText(f.descriptionRu)),
      )
    : [];
  const properties = entry.kind === "Reference"
    ? entry.reference.properties.filter(p => p.valueRu.trim() &&
        !["Формат", "Книга", "Класс", "Уровни развития"].includes(p.nameRu) &&
        !description.includes(plainText(p.valueRu)))
    : [];
  const progression = entry.kind === "Reference" &&
    entry.reference.progression.some(row => !description.includes(plainText(row.featuresRu)))
    ? entry.reference.progression : [];
  const hasDetails = entry.kind !== "Reference" || features.length > 0 || properties.length > 0 || progression.length > 0 ||
    description !== plainText(summary.text);
  return { summary, features, properties, progression, hasDetails };
}
