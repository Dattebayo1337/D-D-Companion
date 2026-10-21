import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { db } from "../src/database/client";
import { contentInclude, toContent } from "../src/database/repository";
import { validateRussian } from "../src/localization/validate";
type Item = {
  nameRu: string;
  nameOriginal: string;
  url: string;
  source: string;
};
type Index = { edition: string; category: string; url: string; items: Item[] };
const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const attr = (s: string, key: string) =>
  s.match(new RegExp(`${key}=["']([^]*?)["'](?=\\s|>|$)`))?.[1] ?? "";
export function parseIndex(html: string, url: string): Item[] {
  const list = html.match(/window\.LIST\s*=\s*({[^]*?});\s*<\/script>/);
  if (list) {
    const data = JSON.parse(list[1]);
    return data.cards.map(
      (c: {
        title: string;
        title_en: string;
        link: string;
        filter_source?: unknown[];
      }) => ({
        nameRu: decode(c.title),
        nameOriginal: decode(c.title_en ?? ""),
        url: new URL(c.link, url).href,
        source: (c.filter_source ?? []).join(","),
      }),
    );
  }
  const section = new URL(url).pathname;
  const found = new Map<string, Item>();
  for (const m of html.matchAll(
    /<a\s+([^>]*href=["'][^"']+["'][^>]*)>([^]*?)<\/a>/g,
  )) {
    const href = attr(m[1], "href");
    if (
      !(
        href.startsWith(section) ||
        (section === "/race/" && href.startsWith("/multiverse/race/"))
      ) ||
      href === section ||
      href.includes("#") ||
      href.includes("?")
    )
      continue;
    const title =
      m[2].match(/class=["']article_title["'][^>]*>([^]*?)<\/span>/)?.[1] ??
      m[2].match(/class=["']list-item-title["'][^>]*>([^]*?)<\/div>/)?.[1];
    if (!title) continue;
    const before = html.slice(Math.max(0, m.index! - 550), m.index);
    const searches = [
      ...before.matchAll(/data-search=["']([^]*?)["']\s+data-id/g),
    ];
    const search = searches.at(-1)?.[1]?.split(",") ?? [];
    const en =
      m[2].match(/class=["']article_title_en["'][^>]*>([^]*?)<\/span>/)?.[1] ??
      search.find((v) => /[a-z]{2}/i.test(v)) ??
      "";
    const source =
      m[2].match(/class=["']article_source["'][^>]*>([^]*?)<\/span>/)?.[1] ??
      attr(before.slice(before.lastIndexOf("<div")), "data-letter");
    const absolute = new URL(href, url).href;
    found.set(absolute, {
      nameRu: decode(title),
      nameOriginal: decode(en),
      url: absolute,
      source: decode(source),
    });
  }
  return [...found.values()];
}
const path = "data/dndsu/catalog-index.json";
async function main() {
  let snapshot: { checkedAt: string; indexes: Index[] };
  if (process.argv.includes("--refresh")) {
    const indexes: Index[] = [];
    for (const host of ["dnd.su", "next.dnd.su"]) {
      const sections: Record<string, string> = {
        class: "Class",
        [host === "dnd.su" ? "race" : "species"]: "SpeciesRace",
        backgrounds: "Background",
        feats: "Feat",
        spells: "Spell",
        bestiary: "Monster",
        items: "MagicItem",
        ...(host === "next.dnd.su" ? { equipment: "Equipment" } : {}),
      };
      for (const [section, category] of Object.entries(sections)) {
        const url = `https://${host}/${section}/`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        let html = await response.text();
        const piece = html.match(/xhttp.open\('GET', '(\/piece\/[^']+)'/);
        if (piece) {
          const r = await fetch(new URL(piece[1], url), {
            signal: AbortSignal.timeout(30000),
          });
          if (!r.ok) throw new Error(`Не загружен индекс ${url}`);
          html = await r.text();
        }
        const items = parseIndex(html, url);
        if (!items.length)
          throw new Error(`Не распознан каталог ${url}; отчёт не перезаписан.`);
        indexes.push({
          edition: host === "dnd.su" ? "5e_2014" : "5e_2024",
          category,
          url,
          items,
        });
        console.log(`${host} ${section}: ${items.length}`);
      }
    }
    // Subclasses require a reviewed traversal of class pages, not the class listing.
    const subclassSnapshot = JSON.parse(
      readFileSync("data/dndsu/subclass-index.json", "utf8"),
    );
    indexes.push(...subclassSnapshot.indexes);
    snapshot = { checkedAt: new Date().toISOString(), indexes };
    mkdirSync("data/dndsu", { recursive: true });
    writeFileSync(path, JSON.stringify(snapshot, null, 2));
  } else snapshot = JSON.parse(readFileSync(path, "utf8"));
  const entries = (
    await db.content.findMany({
      where: { contentOrigin: { not: "Homebrew" } },
      include: contentInclude,
    })
  ).map(toContent);
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  const reports = snapshot.indexes.map((index) => {
    const local = entries.filter(
      (e) =>
        e.edition === index.edition &&
        (index.category === "Equipment"
          ? e.kind === "Reference" &&
            ["Equipment", "Weapon", "Armor"].includes(e.reference.category)
          : e.kind === "Reference"
            ? e.reference.category === index.category
            : e.kind === index.category),
    );
    const names = new Map(
      local.flatMap((e) =>
        [e.nameRu, e.nameOriginal, ...e.aliases]
          .filter(Boolean)
          .map((n) => [norm(n), e.id] as const),
      ),
    );
    const matched = index.items.filter((i) =>
      index.category === "SpeciesRace" && i.url.includes("/multiverse/")
        ? local.some(
            (e) => e.source.replace(/\/$/, "") === i.url.replace(/\/$/, ""),
          )
        : names.has(norm(i.nameRu)) ||
          Boolean(i.nameOriginal && names.has(norm(i.nameOriginal))),
    );
    const unmatched = index.items.filter((i) => !matched.includes(i));
    return {
      edition: index.edition,
      category: index.category,
      url: index.url,
      local: local.length,
      indexed: index.items.length,
      matchedByName: matched.length,
      unmatched: unmatched.length,
      missingCandidates: unmatched,
    };
  });
  const quality = validateRussian(entries);
  const report = {
    checkedAt: snapshot.checkedAt,
    generatedAt: new Date().toISOString(),
    method:
      "Сопоставление названий и aliases в одной редакции; варианты рас из Мультивселенной сверяются по ссылке на отдельную карточку. Индекс подклассов проверен по страницам 13 классов каждой редакции 24 сентября 2026, без разделов Homebrew и сторонних классов. Совпадение записи не доказывает полноту текста или механики.",
    localCount: entries.length,
    localizationIssues: quality,
    coverage: reports,
    notComparable: [
      "Подрасы и альтернативные варианты внутри статей, Homebrew и сторонние классы не входят в заявленное покрытие. Обзоры не заменяют полные тексты правил.",
      "Правила и состояния: страницы сайта группируют термины иначе; процент полноты не вычислялся.",
    ],
  };
  writeFileSync(
    "data/dndsu/coverage-report.json",
    JSON.stringify(report, null, 2),
  );
  const labels: Record<string, string> = {
    Class: "Классы",
    Subclass: "Подклассы",
    SpeciesRace: "Расы / виды",
    Background: "Предыстории",
    Feat: "Черты",
    Spell: "Заклинания",
    Monster: "Бестиарий",
    MagicItem: "Магические предметы",
    Equipment: "Оружие, доспехи, снаряжение",
  };
  const lines = [
    "# Проверка полноты по ДнД.су",
    `Дата индексов: ${snapshot.checkedAt.slice(0, 10)}.`,
    report.method,
    "База неполная относительно каталогов сайта. Пустые карточки и фиктивные версии 2024 для заполнения счётчиков не создавались.",
    "| Редакция | Категория | В базе | В индексе сайта | Совпало по названию | Требуют сверки |",
    "|---|---|---:|---:|---:|---:|",
    ...reports.map(
      (r) =>
        `| ${r.edition.slice(3)} | [${labels[r.category]}](${r.url}) | ${r.local} | ${r.indexed} | ${r.matchedByName} | ${r.unmatched} |`,
    ),
    "",
    "## Что означают результаты",
    "Сравниваются основные записи без демонстрационного Homebrew. Количество в базе и число совпадений могут различаться: один локальный объект может соответствовать нескольким вариантам на сайте. На next.dnd.su есть материалы совместимости и сторонние книги; это не перечень только PHB 2024. Полные списки кандидатов со ссылками находятся в data/dndsu/coverage-report.json.",
    ...report.notComparable.map((s) => `- ${s}`),
    `- Проверка обязательной русской локализации: ${quality.length} замечаний.`,
    "",
    "## Воспроизведение",
    "`pnpm data:dndsu:audit` пересчитывает отчёт по сохранённому индексу и текущей базе. `pnpm data:dndsu:audit --refresh` загружает открытые каталоги заново. Команда не импортирует тексты карточек и не меняет игровые записи.",
    "",
    "## Приоритет следующего наполнения",
    "Добавлены основные расы/виды, книжные варианты Мультивселенной и подклассы дополнений из проверенного индекса. Далее — подрасы внутри статей, дополнительные предыстории, заклинания, существа и предметы. Обзоры следует уточнять до полной механики отдельно; количество записей не означает полноту правил.",
  ];
  writeFileSync(
    "docs/DNDSU_COVERAGE.md",
    lines.join("\n\n").replace(/(?<=\|)\n\n(?=\|)/g, "\n"),
  );
  console.log(
    reports.map((r) => ({
      edition: r.edition,
      category: r.category,
      local: r.local,
      indexed: r.indexed,
      unmatched: r.unmatched,
    })),
  );
}
if (process.argv[1]?.includes("audit-dndsu"))
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
