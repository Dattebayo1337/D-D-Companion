import { writeFileSync } from "node:fs";
import { db } from "../src/database/client";
import { contentInclude, toContent } from "../src/database/repository";
import { readingContent } from "../src/domain/reading-content";
const entries = (await db.content.findMany({ include: contentInclude })).map(toContent);
const groups: Record<string, { total: number; emptySummary: number; overviewOnly: number; separateFeatures: number }> = {};
const incomplete: { name: string; edition: string; category: string; source: string }[] = [];
for (const entry of entries) {
  const category = entry.kind === "Reference" ? entry.reference.category : entry.kind;
  const group = groups[category] ??= { total: 0, emptySummary: 0, overviewOnly: 0, separateFeatures: 0 };
  const reading = readingContent(entry);
  group.total++;
  if (!reading.summary.text.trim()) group.emptySummary++;
  if (reading.features.length) group.separateFeatures++;
  if (entry.contentOrigin === "MetadataOnly" && !reading.hasDetails) {
    group.overviewOnly++;
    incomplete.push({ name: entry.nameRu, edition: entry.edition, category, source: entry.source });
  }
}
const separatelyStored = entries.flatMap(entry => {
  const reading = readingContent(entry);
  return reading.properties.length || reading.progression.length ? [{ name: entry.nameRu, edition: entry.edition, properties: reading.properties.length, progression: reading.progression.length }] : [];
});
const report = { checkedAt: new Date().toISOString(), total: entries.length, groups, separatelyStored, overviewOnlyEntries: incomplete };
writeFileSync("data/dndsu/description-audit.json", JSON.stringify(report, null, 2) + "\n");
writeFileSync("docs/DESCRIPTION_AUDIT.md", [
  "# Проверка описаний", "", `Проверено записей: ${entries.length}. Дата: ${report.checkedAt}.`, "",
  "Проверяется наличие текста и доступность отдельно сохранённых полей. Это не проверка полноты правил по книгам: развёрнутый обзор также может не содержать всех исключений.", "",
  "| Категория | Записи | Пустое краткое | Только сводка | Отдельные умения |", "| --- | ---: | ---: | ---: | ---: |",
  ...Object.entries(groups).map(([name, g]) => `| ${name} | ${g.total} | ${g.emptySummary} | ${g.overviewOnly} | ${g.separateFeatures} |`), "",
  `Отдельные свойства доступны у ${separatelyStored.filter(e => e.properties).length} записей. Таблицы развития текущих классов уже включены в основной текст.`, "",
  "## Записи без дополнительных сведений сверх сводки", "",
  ...incomplete.map(e => `- ${e.name} (${e.edition}) — ${e.source}`), "",
].join("\n"));
console.log(JSON.stringify({ total: entries.length, groups }, null, 2));
console.log("Separate properties:", separatelyStored.filter(e => e.properties).length, "progression:", separatelyStored.filter(e => e.progression).length);
await db.$disconnect();
