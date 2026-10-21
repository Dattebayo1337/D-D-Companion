// Entirely original demonstration material, not SRD or official game rules.
import { writeFileSync, mkdirSync } from "node:fs";
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const stamp = "2026-09-17T00:00:00.000Z";
const sources = [2014, 2024].map((year, i) => ({
  id: id(i + 1),
  shortName: `УЧ-${year}`,
  fullNameRu: `Мастерская историй · ${year}`,
  fullNameOriginal: "Story Workshop",
  edition: `5e_${year}`,
  publisher: "Авторский учебный набор проекта",
  releaseDate: "2026-09-17",
  contentType: "Homebrew",
  licenseType: "CC0-1.0",
}));
const base = (n, name, original, description, year = 2014) => ({
  id: id(n),
  nameRu: name,
  nameOriginal: original,
  descriptionRu: description,
  descriptionOriginal: "",
  edition: `5e_${year}`,
  sourceBookId: id(year === 2014 ? 1 : 2),
  source: "Учебный набор «Мастерская историй»",
  sourcePage: "",
  license: "CC0-1.0 — оригинальный учебный материал; не официальные правила.",
  rulesVersion: `homebrew-${year}-1`,
  translationStatus: "Approved",
  contentOrigin: "Homebrew",
  aliases: [],
  tags: ["Учебный пример"],
  contentVersion: 1,
  errataVersion: "",
  createdAt: stamp,
  updatedAt: stamp,
});
const spell = (n, name, original, school, description, year = 2014) => ({
  ...base(n, name, original, description, year),
  kind: "Spell",
  spell: {
    level: 1,
    school,
    castingTime: "Action",
    castingTimeRu: "",
    ritual: false,
    rangeFeet: 30,
    targetRu: "Один предмет в пределах дальности.",
    components: ["V", "S"],
    materialComponentRu: "",
    materialComponentOriginal: "",
    materialCost: null,
    materialConsumed: false,
    durationRu: "Одна минута",
    concentration: false,
    higherLevelsRu: "",
    higherLevelsOriginal: "",
    classes: [],
    subclasses: [],
    damage: "",
    damageType: null,
    healing: "",
    savingThrow: null,
    attackType: null,
    conditions: [],
  },
});
const spells = [
  spell(
    10,
    "Фонарь странника",
    "Wayfarer Lantern",
    "Evocation",
    "Вы зажигаете над выбранным предметом тихий огонёк. Он освещает пространство в радиусе десяти футов и гаснет по окончании действия. Это авторское учебное заклинание.",
  ),
  spell(
    11,
    "Шёпот страниц",
    "Whispering Pages",
    "Divination",
    "Страницы раскрытой книги начинают тихо шелестеть. Вы узнаёте, есть ли на выбранной странице написанный текст, даже не видя её. Это авторское учебное заклинание.",
  ),
  spell(
    12,
    "Серебряная нить",
    "Silver Thread",
    "Illusion",
    "Между двумя видимыми предметами возникает светящаяся нить. Она не имеет веса и не удерживает предметы. Это авторское учебное заклинание.",
    2024,
  ),
  spell(
    13,
    "Печать покоя",
    "Seal of Quiet",
    "Abjuration",
    "Вы оставляете на двери бледную метку. Пока она существует, скрип двери становится неслышным. Это авторское учебное заклинание.",
    2024,
  ),
];
spells[0].aliases = ["Путевой фонарь"];
spells[1].spell.ritual = true;
spells[1].spell.level = 2;
spells[2].spell.concentration = true;
const monster = (n, name, original, type, description, year = 2014) => ({
  ...base(n, name, original, description, year),
  kind: "Monster",
  monster: {
    size: "Small",
    type,
    subtypeRu: "",
    alignmentRu: "Без мировоззрения",
    armorClass: 12,
    armorTypeRu: "Природная защита",
    hitPoints: 9,
    hitDice: "2d6+2",
    speed: { walk: 25, fly: 0, swim: 0, climb: 0, burrow: 0 },
    abilities: { STR: 8, DEX: 12, CON: 12, INT: 4, WIS: 10, CHA: 8 },
    savingThrowsRu: "",
    skillsRu: "",
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
    sensesRu: "Обычное зрение",
    languagesRu: "Не владеет языками",
    challengeRating: 0.25,
    xp: 50,
    proficiencyBonus: 2,
    traits: [
      {
        nameRu: "Тихий шаг",
        descriptionRu: "Существо не оставляет следов на сухой земле.",
      },
    ],
    actions: [
      {
        nameRu: "Толчок",
        descriptionRu:
          "Рукопашная атака: бонус к попаданию +3, досягаемость пять футов, одна цель. Попадание: дробящий урон 1d4+1.",
      },
    ],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
    lairActions: [],
    regionalEffects: [],
    spellcastingRu: "",
    environment: ["Лес"],
  },
});
const monsters = [
  monster(
    20,
    "Моховой хранитель",
    "Moss Guardian",
    "Plant",
    "Небольшое существо из корней и мха охраняет забытые тропинки. Авторский учебный монстр; характеристики приведены для проверки приложения.",
  ),
  monster(
    21,
    "Чернильный дракончик",
    "Ink Drake",
    "Dragon",
    "Крошечный обитатель библиотек прячется среди рисунков и оставляет чернильные следы. Авторский учебный монстр.",
    2024,
  ),
  monster(
    22,
    "Звонкий страж",
    "Chiming Sentinel",
    "Construct",
    "Собранный из колокольчиков страж предупреждает путников мелодичным звоном. Авторский учебный монстр.",
    2024,
  ),
];
monsters[1].monster.size = "Tiny";
monsters[1].monster.speed.fly = 30;
monsters[1].aliases = ["Чернильный дракон"];
mkdirSync("data/examples", { recursive: true });
writeFileSync(
  "data/examples/homebrew.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      name: "Мастерская историй — учебный авторский набор",
      sources,
      entries: [...spells, ...monsters],
      terms: [],
      relations: [],
    },
    null,
    2,
  ) + "\n",
);
