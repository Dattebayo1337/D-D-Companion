import { blankMap, type AdventureMap, type Terrain } from "@/entities/map";
function template(
  index: number,
  name: string,
  description: string,
  category: AdventureMap["category"],
  terrain: (x: number, y: number) => Terrain,
): AdventureMap {
  const m = blankMap();
  m.name = name;
  m.description = description;
  m.category = category;
  m.cells = m.cells.map((_, i) =>
    terrain(i % m.width, Math.floor(i / m.width)),
  );
  m.markers = [
    {
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      x: 12,
      y: 9,
      kind: "label",
      label: "Центр",
      secret: false,
    },
  ];
  return m;
}
export const mapTemplates = [
  template(
    1,
    "Забытые залы",
    "Три каменных зала, соединённые коридором. Основа для небольшого подземелья.",
    "Подземелье",
    (x, y) =>
      (x > 2 && x < 9 && y > 2 && y < 8) ||
      (x > 14 && x < 21 && y > 2 && y < 8) ||
      (x > 7 && x < 18 && y > 11 && y < 16) ||
      (y === 9 && x > 4 && x < 19) ||
      (x === 5 && y > 5 && y < 10) ||
      (x === 18 && y > 5 && y < 10) ||
      (x === 12 && y > 8 && y < 13)
        ? "floor"
        : "wall",
  ),
  template(
    2,
    "Таверна у дороги",
    "Общий зал, двор и боковые комнаты для разговоров и засад.",
    "Здание",
    (x, y) =>
      x < 2 || x > 21 || y < 2 || y > 15
        ? "grass"
        : x === 2 || x === 21 || y === 2 || y === 15 || (x === 15 && y !== 9)
          ? "wall"
          : "wood",
  ),
  template(
    3,
    "Лесная переправа",
    "Река разделяет поляну; дорога пересекает её по мосту.",
    "Дикая местность",
    (x, y) =>
      y === 8 || y === 9
        ? x > 9 && x < 14
          ? "wood"
          : "road"
        : x > 9 && x < 14
          ? "water"
          : "grass",
  ),
  template(
    4,
    "Береговая стоянка",
    "Песчаная бухта у воды и тропа к месту привала.",
    "Дикая местность",
    (x, y) =>
      x < 6 + Math.floor(Math.sin(y / 3) * 2)
        ? "water"
        : x < 10
          ? "sand"
          : y === 9
            ? "road"
            : "grass",
  ),
  template(
    5,
    "Деревенская площадь",
    "Дороги, площадь и контуры домов. Подойдёт для уличной сцены.",
    "Поселение",
    (x, y) =>
      (x > 9 && x < 14) || (y > 7 && y < 11)
        ? "road"
        : x % 8 > 1 && x % 8 < 6 && y % 7 > 1 && y % 7 < 6
          ? "wood"
          : "grass",
  ),
  {
    ...template(
      6,
      "Долина двух путей",
      "Схема региона: река, дороги и открытые земли. Масштаб — 1 миля на клетку.",
      "Регион",
      (x, y) =>
        x === Math.floor(10 + Math.sin(y / 4) * 3)
          ? "water"
          : y === 7 || x === 18
            ? "road"
            : "grass",
    ),
    feetPerCell: 5280,
  },
];
