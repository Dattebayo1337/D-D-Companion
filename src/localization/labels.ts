import {
  abilities,
  creatureTypes,
  damages,
  origins,
  schools,
  sizes,
  statuses,
} from "@/entities/content";
export const editionLabels = {
  "5e_2014": "Правила 2014",
  "5e_2024": "Правила 2024",
};
export const schoolLabels: Record<(typeof schools)[number], string> = {
  Abjuration: "Ограждение",
  Conjuration: "Вызов",
  Divination: "Прорицание",
  Enchantment: "Очарование",
  Evocation: "Воплощение",
  Illusion: "Иллюзия",
  Necromancy: "Некромантия",
  Transmutation: "Преобразование",
};
export const statusLabels: Record<(typeof statuses)[number], string> = {
  NotRequired: "Не требуется",
  Missing: "Нет перевода",
  MachineDraft: "Машинный черновик",
  HumanReviewed: "Проверено редактором",
  Approved: "Утверждено",
};
export const originLabels: Record<(typeof origins)[number], string> = {
  SRD: "Открытые правила",
  Licensed: "По лицензии",
  UserImported: "Личный импорт",
  Homebrew: "Авторский контент",
  MetadataOnly: "Справочная сводка",
};
export const sizeLabels: Record<(typeof sizes)[number], string> = {
  Tiny: "Крошечный",
  Small: "Маленький",
  Medium: "Средний",
  Large: "Большой",
  Huge: "Огромный",
  Gargantuan: "Громадный",
};
export const typeLabels: Record<(typeof creatureTypes)[number], string> = {
  Aberration: "Аберрация",
  Beast: "Зверь",
  Celestial: "Небожитель",
  Construct: "Конструкт",
  Dragon: "Дракон",
  Elemental: "Элементаль",
  Fey: "Фея",
  Fiend: "Исчадие",
  Giant: "Великан",
  Humanoid: "Гуманоид",
  Monstrosity: "Монстр",
  Ooze: "Слизь",
  Plant: "Растение",
  Undead: "Нежить",
};
export const damageLabels: Record<(typeof damages)[number], string> = {
  Acid: "Кислота",
  Bludgeoning: "Дробящий",
  Cold: "Холод",
  Fire: "Огонь",
  Force: "Силовое поле",
  Lightning: "Молния",
  Necrotic: "Некротический",
  Piercing: "Колющий",
  Poison: "Яд",
  Psychic: "Психический",
  Radiant: "Излучение",
  Slashing: "Рубящий",
  Thunder: "Звук",
};
export const abilityLabels: Record<(typeof abilities)[number], string> = {
  STR: "СИЛ",
  DEX: "ЛОВ",
  CON: "ТЕЛ",
  INT: "ИНТ",
  WIS: "МДР",
  CHA: "ХАР",
};
export const castingLabels = {
  Action: "Действие",
  BonusAction: "Бонусное действие",
  Reaction: "Реакция",
  Minute: "Минута",
  Hour: "Час",
  Special: "Особое",
};
export const componentLabels = {
  V: "Вербальный",
  S: "Соматический",
  M: "Материальный",
};
export function distanceLabel(feet: number, metric: boolean) {
  return metric ? `${Number((feet * 0.3048).toFixed(2))} м` : `${feet} фт`;
}
