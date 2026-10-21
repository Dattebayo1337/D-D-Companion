import { writeFileSync } from "node:fs";
import { db } from "../src/database/client";
import { contentInclude, toContent } from "../src/database/repository";
import { plainText } from "../src/domain/content-summary";
import { readingContent } from "../src/domain/reading-content";
import { auditDatabase } from "../src/services/manager";

// Presence checks deliberately do not certify completeness against a rulebook.
async function main() {
  const entries = (await db.content.findMany({ include: contentInclude })).map(toContent);
  const byId = new Map(entries.map(e => [e.id, e]));
  const rows = entries.map(e => {
    const reading = readingContent(e);
    const description = plainText(e.descriptionRu);
    const flags: string[] = [];
    if (!plainText(reading.summary.text)) flags.push("empty-summary");
    if (!description) flags.push("empty-description");
    if (e.contentOrigin === "MetadataOnly") flags.push("overview-not-full-rules");
    if (!reading.hasDetails) flags.push("summary-only");
    if (description.length < 80) flags.push("short-text-review");
    if (e.translationStatus !== "Approved") flags.push("not-approved");
    if (e.kind === "Reference") {
      if (e.reference.features.some(f => !plainText(f.nameRu) || !plainText(f.descriptionRu))) flags.push("empty-feature-field");
      if (["Class", "Subclass", "SpeciesRace"].includes(e.reference.category) && !e.reference.features.length)
        flags.push("no-structured-features-review-prose");
      if (e.reference.category === "Class" && new Set(e.reference.progression.map(r => r.level)).size !== 20)
        flags.push("progression-not-20-structured-levels");
      if (e.reference.category === "Subclass") {
        const parent = byId.get(e.reference.parentId ?? "");
        if (!parent || parent.kind !== "Reference" || parent.reference.category !== "Class" || parent.edition !== e.edition)
          flags.push("invalid-parent-class");
      }
    }
    if (e.kind === "Spell") {
      if (!e.spell.durationRu.trim()) flags.push("missing-duration");
      if (!e.spell.classes.length) flags.push("missing-spell-classes");
      if (e.spell.components.includes("M") && !e.spell.materialComponentRu.trim()) flags.push("missing-material-description");
    }
    if (e.kind === "Monster") {
      if (!e.monster.actions.length) flags.push("no-structured-actions-review-prose");
      if ([...e.monster.traits, ...e.monster.actions, ...e.monster.bonusActions, ...e.monster.reactions, ...e.monster.legendaryActions, ...e.monster.lairActions, ...e.monster.regionalEffects].some(f => !plainText(f.descriptionRu))) flags.push("empty-monster-feature");
    }
    return { id: e.id, name: e.nameRu, edition: e.edition, category: e.kind === "Reference" ? e.reference.category : e.kind,
      origin: e.contentOrigin, status: e.translationStatus, summaryChars: plainText(reading.summary.text).length,
      descriptionChars: description.length, hasDetails: reading.hasDetails,
      separateFeatures: reading.features.length, separateProperties: reading.properties.length,
      source: e.source, flags };
  });
  const groups = Object.values(rows.reduce<Record<string, { edition: string; category: string; total: number; approved: number; emptySummary: number; emptyDescription: number; srd: number; overview: number; summaryOnly: number; shortText: number }>>((acc, r) => {
    const key = `${r.edition}/${r.category}`;
    const g = acc[key] ??= { edition: r.edition, category: r.category, total: 0, approved: 0, emptySummary: 0, emptyDescription: 0, srd: 0, overview: 0, summaryOnly: 0, shortText: 0 };
    g.total++; g.approved += Number(r.status === "Approved"); g.emptySummary += Number(!r.summaryChars); g.emptyDescription += Number(!r.descriptionChars);
    g.srd += Number(r.origin === "SRD"); g.overview += Number(r.origin === "MetadataOnly"); g.summaryOnly += Number(!r.hasDetails); g.shortText += Number(r.descriptionChars < 80);
    return acc;
  }, {})).sort((a,b) => a.category.localeCompare(b.category) || a.edition.localeCompare(b.edition));
  const flagCounts: Record<string, number> = {};
  for (const r of rows) for (const flag of r.flags) flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
  const validation = await auditDatabase();
  const report = { checkedAt: new Date().toISOString(), total: rows.length, groups, flagCounts, validation, rows };
  writeFileSync("data/dndsu/completeness-audit.json", JSON.stringify(report, null, 2) + "\n");
  const quote = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`;
  writeFileSync("docs/CONTENT_AUDIT.csv", "\uFEFF" + [
    ["ID", "Название", "Редакция", "Категория", "Происхождение", "Статус", "Кратко: символов", "Описание: символов", "Есть подробности", "Замечания", "Источник"].map(quote).join(";"),
    ...rows.map(r => [r.id,r.name,r.edition,r.category,r.origin,r.status,r.summaryChars,r.descriptionChars,r.hasDetails,r.flags.join(", "),r.source].map(quote).join(";")),
  ].join("\n"));
  writeFileSync("docs/CONTENT_AUDIT.md", [
    "# Аудит наполнения справочников", "", `Проверено ${rows.length} записей. ${report.checkedAt}.`, "",
    "Проверены реальные данные базы и функция, формирующая вкладку «Кратко». Наличие текста, статус Approved и открывающаяся подробная вкладка НЕ доказывают полноту правил. MetadataOnly — авторский обзор, даже при большой длине. SRD — происхождение, а не независимая сверка каждой механики с первоисточником. Короткие тексты и отсутствие структурированных умений — кандидаты ручной проверки: нужные сведения могут находиться в основном тексте.", "",
    "| Категория | Редакция | Всего | Approved | Пустое кратко | Пустой текст | SRD | Обзоры MetadataOnly | Без подробностей | Текст <80 |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...groups.map(g => `| ${g.category} | ${g.edition.slice(3)} | ${g.total} | ${g.approved} | ${g.emptySummary} | ${g.emptyDescription} | ${g.srd} | ${g.overview} | ${g.summaryOnly} | ${g.shortText} |`), "",
    "## Автоматические замечания", "", ...Object.entries(flagCounts).map(([k,v]) => `- ${k}: ${v}`), "",
    `Проверка локализации: ${validation.localization.length} замечаний; терминология и связи ContentRelation: ${validation.issues.length}.`, "",
    "## Как воспроизвести", "", "`pnpm data:completeness:audit` — чтение текущей базы без изменения игровых данных. Полная ведомость каждой карточки: CONTENT_AUDIT.csv; машинный отчёт: data/dndsu/completeness-audit.json. Наличие описаний не заменяет количественную сверку с индексами: см. DNDSU_COVERAGE.md.", "",
    "## Карточки без отдельного подробного режима", "",
    ...rows.filter(r => !r.hasDetails).map(r => `- ${r.name} (${r.edition.slice(3)}, ${r.category}) — ${r.source}`), "",
  ].join("\n"));
  console.log(JSON.stringify({ total: rows.length, groups, flagCounts, localizationIssues: validation.localization.length }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
