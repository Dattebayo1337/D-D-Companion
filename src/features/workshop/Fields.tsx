import {
  abilityLabels,
  castingLabels,
  componentLabels,
  damageLabels,
  schoolLabels,
  sizeLabels,
  typeLabels,
} from "@/localization/labels";
import { referenceLabels } from "@/localization/reference";
const labels: Record<string, string> = {
  spell: "Заклинание",
  monster: "Существо",
  reference: "Справочник",
  nameOriginal: "Оригинальное название",
  descriptionOriginal: "Описание в оригинале",
  tags: "Метки",
  aliases: "Альтернативные названия",
  source: "Автор / источник",
  license: "Условия использования",
  level: "Уровень",
  school: "Школа",
  castingTime: "Время накладывания",
  castingTimeRu: "Уточнение времени",
  ritual: "Ритуал",
  rangeFeet: "Дальность, футы",
  rangeKind: "Тип дальности",
  rangeRu: "Уточнение дальности",
  targetRu: "Цели",
  components: "Компоненты",
  materialComponentRu: "Материальный компонент",
  materialComponentOriginal: "Компонент в оригинале",
  materialCost: "Стоимость компонента, зм",
  materialConsumed: "Компонент расходуется",
  durationRu: "Длительность",
  concentration: "Концентрация",
  higherLevelsRu: "На высоких уровнях",
  higherLevelsOriginal: "Усиление в оригинале",
  classes: "Классы (по одному в строке)",
  subclasses: "Подклассы (по одному в строке)",
  damage: "Кубы урона",
  damageType: "Тип урона",
  healing: "Кубы лечения",
  savingThrow: "Спасбросок",
  attackType: "Атака заклинанием",
  conditions: "Состояния (по одному в строке)",
  statBlockComplete: "Параметры существа проверены",
  size: "Размер",
  type: "Тип существа",
  subtypeRu: "Подтип",
  alignmentRu: "Мировоззрение",
  armorClass: "Класс доспеха",
  armorTypeRu: "Тип доспеха",
  hitPoints: "Максимальные хиты",
  hitDice: "Кости хитов",
  speed: "Скорость в футах",
  walk: "Ходьба",
  fly: "Полёт",
  swim: "Плавание",
  climb: "Лазание",
  burrow: "Копание",
  abilities: "Характеристики",
  ...abilityLabels,
  savingThrowsRu: "Спасброски существа",
  skillsRu: "Навыки",
  resistances: "Сопротивления",
  immunities: "Иммунитеты",
  vulnerabilities: "Уязвимости",
  conditionImmunities: "Иммунитеты к состояниям",
  sensesRu: "Чувства",
  languagesRu: "Языки",
  challengeRating: "Опасность",
  xp: "Опыт",
  proficiencyBonus: "Бонус мастерства",
  traits: "Особенности",
  actions: "Действия",
  bonusActions: "Бонусные действия",
  reactions: "Реакции",
  legendaryActions: "Легендарные действия",
  lairActions: "Действия логова",
  regionalEffects: "Региональные эффекты",
  spellcastingRu: "Заклинания существа",
  environment: "Окружение (по одному в строке)",
  category: "Категория",
  parentId: "Класс",
  properties: "Свойства",
  progression: "Развитие по уровням",
  features: "Умения",
  nameRu: "Название",
  valueRu: "Значение",
  descriptionRu: "Описание",
  featuresRu: "Умения уровня",
  resourcesRu: "Ресурсы уровня",
  spellSlots: "Ячейки по кругам, через запятую",
};
export function fieldTitle(path: string) {
  return path
    .split(".")
    .map((p) =>
      /^\d+$/.test(p) ? `Строка ${Number(p) + 1}` : (labels[p] ?? "Параметр"),
    )
    .join(" → ");
}
const choices: Record<string, Record<string, string>> = {
  school: schoolLabels,
  castingTime: castingLabels,
  rangeKind: {
    Distance: "Расстояние",
    Self: "На себя",
    Touch: "Касание",
    Sight: "Видимость",
    Unlimited: "Без ограничений",
    Special: "Особая",
  },
  damageType: damageLabels,
  savingThrow: abilityLabels,
  attackType: { Melee: "Ближняя", Ranged: "Дальняя" },
  size: sizeLabels,
  type: typeLabels,
  category: referenceLabels,
};
const multi: Record<string, Record<string, string>> = {
  components: componentLabels,
  resistances: damageLabels,
  immunities: damageLabels,
  vulnerabilities: damageLabels,
};
const objectArrays = new Set([
  "properties",
  "progression",
  "features",
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "lairActions",
  "regionalEffects",
]);
function newItem(key: string) {
  return key === "properties"
    ? { nameRu: "", valueRu: "" }
    : key === "progression"
      ? {
          level: 1,
          proficiencyBonus: 2,
          featuresRu: "",
          resourcesRu: "",
          spellSlots: [],
        }
      : key === "features"
        ? { level: null, nameRu: "", descriptionRu: "" }
        : { nameRu: "", descriptionRu: "" };
}
export function Fields({
  value,
  change,
  classes,
}: {
  value: Record<string, unknown>;
  change: (v: Record<string, unknown>) => void;
  classes: { id: string; nameRu: string }[];
}) {
  return (
    <div className="workshop-fields">
      {Object.entries(value).map(([key, v]) => {
        const label = labels[key] ?? "Дополнительное поле",
          set = (x: unknown) => change({ ...value, [key]: x });
        if (key === "category")
          return (
            <p key={key} className="badge">
              {referenceLabels[v as keyof typeof referenceLabels]}
            </p>
          );
        if (key === "parentId")
          return value.category === "Subclass" ? (
            <label key={key}>
              {label}
              <select
                value={String(v ?? "")}
                onChange={(e) => set(e.target.value || null)}
              >
                <option value="">Выберите класс</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameRu}
                  </option>
                ))}
              </select>
            </label>
          ) : null;
        if (typeof v === "boolean")
          return (
            <label className="workshop-check" key={key}>
              <input
                type="checkbox"
                checked={v}
                onChange={(e) => set(e.target.checked)}
              />
              {label}
            </label>
          );
        if (choices[key])
          return (
            <label key={key}>
              {label}
              <select
                value={String(v ?? "")}
                onChange={(e) => set(e.target.value || null)}
              >
                {["damageType", "savingThrow", "attackType"].includes(key) && (
                  <option value="">Нет</option>
                )}
                {Object.entries(choices[key]).map(([a, b]) => (
                  <option key={a} value={a}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          );
        if (Array.isArray(v)) {
          if (multi[key])
            return (
              <fieldset key={key}>
                <legend>{label}</legend>
                <div className="workshop-checks">
                  {Object.entries(multi[key]).map(([a, b]) => (
                    <label className="workshop-check" key={a}>
                      <input
                        type="checkbox"
                        checked={v.includes(a)}
                        onChange={(e) =>
                          set(
                            e.target.checked
                              ? [...v, a]
                              : v.filter((x) => x !== a),
                          )
                        }
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          if (objectArrays.has(key))
            return (
              <fieldset className="workshop-wide" key={key}>
                <legend>{label}</legend>
                {v.map((item, i) => (
                  <div className="workshop-array" key={i}>
                    <Fields
                      value={item}
                      classes={classes}
                      change={(x) =>
                        set(v.map((old, j) => (i === j ? x : old)))
                      }
                    />
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => set(v.filter((_, j) => i !== j))}
                    >
                      Убрать строку {i + 1}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => set([...v, newItem(key)])}
                >
                  Добавить: {label.toLowerCase()}
                </button>
              </fieldset>
            );
          return (
            <label key={key}>
              {label}
              <textarea
                rows={2}
                value={v.join(key === "spellSlots" ? "," : "\n")}
                onChange={(e) =>
                  set(
                    key === "spellSlots"
                      ? e.target.value.split(",").filter(Boolean).map(Number)
                      : e.target.value.split("\n"),
                  )
                }
              />
            </label>
          );
        }
        if (v && typeof v === "object")
          return (
            <fieldset key={key} className="workshop-wide">
              <legend>{label}</legend>
              <Fields
                value={v as Record<string, unknown>}
                classes={classes}
                change={set}
              />
            </fieldset>
          );
        if (typeof v === "number" || ["materialCost", "level"].includes(key))
          return (
            <label key={key}>
              {label}
              <input
                type="number"
                step={
                  key === "challengeRating" || key === "materialCost"
                    ? "any"
                    : "1"
                }
                value={v === null ? "" : String(v)}
                onChange={(e) =>
                  set(
                    e.target.value === "" &&
                      ["materialCost", "level"].includes(key)
                      ? null
                      : Number(e.target.value),
                  )
                }
              />
            </label>
          );
        return (
          <label key={key}>
            {label}
            <textarea
              rows={key.toLowerCase().includes("description") ? 4 : 2}
              value={String(v ?? "")}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
