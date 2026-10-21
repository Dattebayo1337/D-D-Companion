import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { datasetSchema } from "../src/entities/content";
import { auditDataset } from "../src/imports/pipeline";

const rows = JSON.parse(
  readFileSync("data/phb/feats-curated.json", "utf8"),
) as {
  year: number;
  nameRu: string;
  nameOriginal: string;
  url: string;
  descriptionRu: string;
  requirement: string;
  category: string;
}[];
const uuid = (key: string) => {
  const h = createHash("sha256")
    .update(`dnd-companion:phb-feats:${key}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const license =
  "Самостоятельная краткая сводка механики по DnD.su. Полные тексты и изображения не включены; права на исходные материалы принадлежат их правообладателям. Не SRD и не лицензия CC BY.";
for (const year of [2014, 2024]) {
  const edition = `5e_${year}`;
  const data = datasetSchema.parse({
    schemaVersion: 1,
    name: `Черты Книги игрока ${year} — дополнение`,
    sources: [
      {
        id: uuid(`${year}:book`),
        shortName: `PHB ${year} · Feats`,
        fullNameRu: `Книга игрока ${year} — сводки черт`,
        fullNameOriginal: "Player's Handbook",
        edition,
        publisher: "Wizards of the Coast; справочник DnD.su",
        contentType: "MetadataOnly",
        licenseType: license,
      },
    ],
    entries: rows
      .filter((r) => r.year === year)
      .map((r) => ({
        id: uuid(`${year}:${r.nameOriginal.toLowerCase()}`),
        kind: "Reference",
        nameRu: r.nameRu,
        nameOriginal: r.nameOriginal,
        descriptionRu: r.descriptionRu,
        descriptionOriginal: "",
        edition,
        sourceBookId: uuid(`${year}:book`),
        source: r.url,
        license,
        rulesVersion: String(year),
        contentVersion: 1,
        translationStatus: "Approved",
        contentOrigin: "MetadataOnly",
        tags: ["Книга игрока", "Краткая сводка", r.category],
        createdAt: "2026-09-24T00:00:00.000Z",
        updatedAt: "2026-09-24T00:00:00.000Z",
        reference: {
          category: "Feat",
          parentId: null,
          progression: [],
          features: [],
          properties: [
            { nameRu: "Тип черты", valueRu: r.category },
            { nameRu: "Требования", valueRu: r.requirement },
            {
              nameRu: "Предел повышения характеристик",
              valueRu:
                r.category === "Эпический дар"
                  ? "До 30, если черта повышает характеристику"
                  : "До 20, если черта повышает характеристику",
            },
            {
              nameRu: "Формат",
              valueRu:
                "Краткая сводка правил; полный материал по ссылке на источник",
            },
          ],
        },
      })),
  });
  const audit = auditDataset(data);
  if (!audit.valid) throw new Error(JSON.stringify(audit.issues));
  writeFileSync(
    `data/phb/feats-${year}.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
  console.log(year, data.entries.length);
}
