import { z } from "zod";
export const terrains = {
  floor: { label: "Каменный пол", color: "#b9ac92" },
  wall: { label: "Стена", color: "#414451" },
  grass: { label: "Трава", color: "#72976c" },
  water: { label: "Вода", color: "#5899bc" },
  sand: { label: "Песок", color: "#d7bd7e" },
  road: { label: "Дорога", color: "#967960" },
  wood: { label: "Деревянный пол", color: "#ab8057" },
  void: { label: "Пустота", color: "#222831" },
} as const;
export type Terrain = keyof typeof terrains;
export const symbols = {
  door: "▣",
  tree: "♣",
  treasure: "◆",
  stairs: "≋",
  enemy: "⚔",
  camp: "▲",
  label: "●",
} as const;
export const symbolLabels = {
  door: "Дверь",
  tree: "Дерево",
  treasure: "Сокровище",
  stairs: "Лестница",
  enemy: "Противник",
  camp: "Лагерь",
  label: "Метка",
};
export const mapCategories = [
  "Подземелье",
  "Здание",
  "Дикая местность",
  "Поселение",
  "Регион",
] as const;
export const mapSchema = z
  .object({
    name: z.string().trim().min(1, "Укажите название карты.").max(160),
    description: z.string().max(4000),
    category: z.enum(mapCategories),
    width: z.number().int().min(8).max(60),
    height: z.number().int().min(8).max(60),
    feetPerCell: z.number().int().min(1).max(5280),
    cells: z
      .array(
        z.enum([
          "floor",
          "wall",
          "grass",
          "water",
          "sand",
          "road",
          "wood",
          "void",
        ]),
      )
      .max(3600),
    markers: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            x: z.number().int().min(0),
            y: z.number().int().min(0),
            kind: z.enum([
              "door",
              "tree",
              "treasure",
              "stairs",
              "enemy",
              "camp",
              "label",
            ]),
            label: z.string().max(80),
            secret: z.boolean(),
          })
          .strict(),
      )
      .max(200),
    notes: z.string().max(20000),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.cells.length !== m.width * m.height)
      ctx.addIssue({
        code: "custom",
        message: "Размер сетки не совпадает с количеством клеток.",
      });
    if (m.markers.some((p) => p.x >= m.width || p.y >= m.height))
      ctx.addIssue({
        code: "custom",
        message: "Метка находится за границей карты.",
      });
    if (new Set(m.markers.map((p) => p.id)).size !== m.markers.length)
      ctx.addIssue({ code: "custom", message: "Повторяющиеся метки." });
  });
export type AdventureMap = z.infer<typeof mapSchema>;
export type MapRecord = {
  id: string;
  version: number;
  archived: boolean;
  campaignId: string | null;
  data: AdventureMap;
};
export const blankMap = (): AdventureMap => ({
  name: "Новая карта",
  description: "",
  category: "Подземелье",
  width: 24,
  height: 18,
  feetPerCell: 5,
  cells: Array(24 * 18).fill("floor"),
  markers: [],
  notes: "",
});
export function resizeMap(
  m: AdventureMap,
  width: number,
  height: number,
): AdventureMap {
  return {
    ...m,
    width,
    height,
    cells: Array.from({ length: width * height }, (_, i) => {
      const x = i % width,
        y = Math.floor(i / width);
      return x < m.width && y < m.height ? m.cells[y * m.width + x] : "floor";
    }),
    markers: m.markers.filter((p) => p.x < width && p.y < height),
  };
}
export function playerMap(m: AdventureMap): AdventureMap {
  return { ...m, notes: "", markers: m.markers.filter((p) => !p.secret) };
}
const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function mapSvg(
  input: AdventureMap,
  player = true,
  grid = true,
): string {
  const m = player ? playerMap(input) : input,
    size = 40;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.width * size} ${m.height * size}" width="${m.width * size}" height="${m.height * size}"><title>${escapeXml(m.name)}</title>` +
    m.cells
      .map(
        (t, i) =>
          `<rect x="${(i % m.width) * size}" y="${Math.floor(i / m.width) * size}" width="40" height="40" fill="${terrains[t].color}"${grid ? ' stroke="#ffffff33" stroke-width="1"' : ""}/>`,
      )
      .join("") +
    m.markers
      .map(
        (p) =>
          `<g><circle cx="${p.x * size + 20}" cy="${p.y * size + 20}" r="15" fill="${p.secret ? "#782a72" : "#faf2df"}" stroke="#292d36"/><text x="${p.x * size + 20}" y="${p.y * size + 25}" text-anchor="middle" font-size="19" fill="${p.secret ? "white" : "#292d36"}">${symbols[p.kind]}</text>${p.label ? `<text x="${p.x * size + 20}" y="${p.y * size + 39}" text-anchor="middle" font-size="11" fill="white" stroke="#222" stroke-width="3" paint-order="stroke">${escapeXml(p.label)}</text>` : ""}</g>`,
      )
      .join("") +
    "</svg>"
  );
}
