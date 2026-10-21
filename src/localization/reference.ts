import type { referenceCategories } from "@/entities/content";
export const referenceLabels: Record<
  (typeof referenceCategories)[number],
  string
> = {
  Class: "Классы",
  Subclass: "Подклассы",
  SpeciesRace: "Расы / Виды",
  Background: "Предыстории",
  Feat: "Черты",
  Weapon: "Оружие",
  Armor: "Доспехи",
  Equipment: "Снаряжение",
  MagicItem: "Магические предметы",
  Condition: "Состояния",
  Rule: "Правила",
};
