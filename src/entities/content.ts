import { z } from "zod";

export const editionSchema = z.enum(["5e_2014", "5e_2024"]);
export type EditionId = z.infer<typeof editionSchema>;
export const statuses = [
  "NotRequired",
  "Missing",
  "MachineDraft",
  "HumanReviewed",
  "Approved",
] as const;
export const origins = [
  "SRD",
  "Licensed",
  "UserImported",
  "Homebrew",
  "MetadataOnly",
] as const;
export const schools = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
] as const;
export const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export const damages = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
] as const;
export const sizes = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
] as const;
export const creatureTypes = [
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Humanoid",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Undead",
] as const;
export const termCategories = [
  "Ability",
  "Skill",
  "Condition",
  "DamageType",
  "School",
  "CreatureType",
  "Action",
  "Rule",
  "WeaponProperty",
  "ArmorProperty",
  "SpellTerm",
  "ClassTerm",
  "General",
] as const;
const text = z.string().max(50000);
const ru = z.string().max(50000).default("");
const uuid = z.string().uuid();
const strings = z.array(z.string().max(500)).max(500).default([]);
const feature = z.object({ nameRu: ru, descriptionRu: ru }).strict();
const features = z.array(feature).max(100).default([]);
const distance = z.number().nonnegative().max(10000000);
export const sourceSchema = z
  .object({
    id: uuid,
    shortName: z.string().min(1).max(80),
    fullNameRu: z.string().min(1).max(500),
    fullNameOriginal: text.default(""),
    edition: editionSchema,
    publisher: text.default(""),
    releaseDate: z.string().date().nullable().default(null),
    contentType: z.enum(origins),
    licenseType: z.string().min(1).max(500),
  })
  .strict();
export const spellSchema = z
  .object({
    level: z.number().int().min(0).max(9),
    school: z.enum(schools),
    castingTime: z.enum([
      "Action",
      "BonusAction",
      "Reaction",
      "Minute",
      "Hour",
      "Special",
    ]),
    castingTimeRu: ru,
    ritual: z.boolean().default(false),
    rangeFeet: distance,
    rangeKind: z
      .enum(["Distance", "Self", "Touch", "Sight", "Unlimited", "Special"])
      .default("Distance"),
    rangeRu: ru,
    targetRu: ru,
    components: z.array(z.enum(["V", "S", "M"])).max(3),
    materialComponentRu: ru,
    materialComponentOriginal: text.default(""),
    materialCost: z.number().nonnegative().nullable().default(null),
    materialConsumed: z.boolean().default(false),
    durationRu: ru,
    concentration: z.boolean().default(false),
    higherLevelsRu: ru,
    higherLevelsOriginal: text.default(""),
    classes: strings,
    subclasses: strings,
    damage: z.string().max(100).default(""),
    damageType: z.enum(damages).nullable().default(null),
    healing: z.string().max(100).default(""),
    savingThrow: z.enum(abilities).nullable().default(null),
    attackType: z.enum(["Melee", "Ranged"]).nullable().default(null),
    conditions: strings,
  })
  .strict();
export const monsterSchema = z
  .object({
    statBlockComplete: z.boolean().default(false),
    size: z.enum(sizes),
    type: z.enum(creatureTypes),
    subtypeRu: ru,
    alignmentRu: ru,
    armorClass: z.number().int().min(0).max(100),
    armorTypeRu: ru,
    hitPoints: z.number().int().min(1).max(1000000),
    hitDice: z.string().max(100),
    speed: z
      .object({
        walk: distance,
        fly: distance.default(0),
        swim: distance.default(0),
        climb: distance.default(0),
        burrow: distance.default(0),
      })
      .strict(),
    abilities: z
      .object({
        STR: z.number().int().min(1).max(30),
        DEX: z.number().int().min(1).max(30),
        CON: z.number().int().min(1).max(30),
        INT: z.number().int().min(1).max(30),
        WIS: z.number().int().min(1).max(30),
        CHA: z.number().int().min(1).max(30),
      })
      .strict(),
    savingThrowsRu: ru,
    skillsRu: ru,
    resistances: z.array(z.enum(damages)).default([]),
    immunities: z.array(z.enum(damages)).default([]),
    vulnerabilities: z.array(z.enum(damages)).default([]),
    conditionImmunities: strings,
    sensesRu: ru,
    languagesRu: ru,
    challengeRating: z.number().min(0).max(30),
    xp: z.number().int().nonnegative(),
    proficiencyBonus: z.number().int().min(0).max(20),
    traits: features,
    actions: features,
    bonusActions: features,
    reactions: features,
    legendaryActions: features,
    lairActions: features,
    regionalEffects: features,
    spellcastingRu: ru,
    environment: strings,
  })
  .strict();
const base = {
  id: uuid,
  nameRu: z.string().max(500).default(""),
  nameOriginal: z.string().max(500).default(""),
  descriptionRu: ru,
  descriptionOriginal: text.default(""),
  edition: editionSchema,
  sourceBookId: uuid,
  source: z.string().min(1).max(1000),
  sourcePage: z.string().max(80).default(""),
  license: z.string().min(1).max(2000),
  rulesVersion: z.string().min(1).max(80),
  translationStatus: z.enum(statuses),
  contentOrigin: z.enum(origins),
  aliases: strings,
  tags: strings,
  contentVersion: z.number().int().min(1),
  errataVersion: z.string().max(80).default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const referenceCategories = [
  "Class",
  "Subclass",
  "SpeciesRace",
  "Background",
  "Feat",
  "Weapon",
  "Armor",
  "Equipment",
  "MagicItem",
  "Condition",
  "Rule",
] as const;
export const referenceSchema = z
  .object({
    category: z.enum(referenceCategories),
    parentId: uuid.nullable().default(null),
    properties: z
      .array(z.object({ nameRu: ru, valueRu: ru }).strict())
      .max(100)
      .default([]),
    progression: z
      .array(
        z
          .object({
            level: z.number().int().min(1).max(20),
            proficiencyBonus: z.number().int().min(2).max(6),
            featuresRu: ru,
            resourcesRu: ru,
            spellSlots: z
              .array(z.number().int().min(0).max(9))
              .max(9)
              .default([]),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    features: z
      .array(
        z
          .object({
            level: z.number().int().min(1).max(20).nullable().default(null),
            nameRu: ru,
            descriptionRu: ru,
          })
          .strict(),
      )
      .max(150)
      .default([]),
  })
  .strict();
export const contentSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("Spell"), spell: spellSchema }).strict(),
  z
    .object({
      ...base,
      kind: z.literal("Reference"),
      reference: referenceSchema,
    })
    .strict(),
  z
    .object({ ...base, kind: z.literal("Monster"), monster: monsterSchema })
    .strict(),
]);
export const termSchema = z
  .object({
    id: uuid,
    original: z.string().min(1).max(200),
    russian: z.string().min(1).max(200),
    category: z.enum(termCategories),
    edition: editionSchema,
    aliases: strings,
    notes: text.default(""),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const relationSchema = z
  .object({
    id: uuid,
    sourceId: uuid,
    targetId: uuid,
    relationType: z.enum([
      "RevisedVersion",
      "LegacyVersion",
      "Equivalent",
      "Replacement",
      "Related",
    ]),
  })
  .strict();
export const datasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().min(1).max(200),
    sources: z.array(sourceSchema).max(1000),
    entries: z.array(contentSchema).max(10000),
    terms: z.array(termSchema).max(10000).default([]),
    relations: z.array(relationSchema).max(10000).default([]),
  })
  .strict();
export type Content = z.infer<typeof contentSchema>;
export type Spell = Extract<Content, { kind: "Spell" }>;
export type Monster = Extract<Content, { kind: "Monster" }>;
export type SourceBook = z.infer<typeof sourceSchema>;
export type TermTranslation = z.infer<typeof termSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type Issue = { path: string; message: string; entityId?: string };
export type Audit = {
  valid: boolean;
  issues: Issue[];
  localization: Issue[];
  count: number;
};

export type ReferenceEntry = Extract<Content, { kind: "Reference" }>;
