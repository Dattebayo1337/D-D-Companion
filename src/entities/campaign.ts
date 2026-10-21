import { z } from "zod";

export const campaignKinds = ["npc", "location", "quest", "session"] as const;
export type CampaignKind = (typeof campaignKinds)[number];
export const campaignLabels: Record<CampaignKind, string> = {
  npc: "Персонажи мастера",
  location: "Локации",
  quest: "Задания",
  session: "Сессии",
};
type Field = {
  key: string;
  label: string;
  multiline?: boolean;
  options?: string[];
};
export const campaignFields: Record<CampaignKind, Field[]> = {
  npc: [
    { key: "species", label: "Раса / вид" },
    { key: "age", label: "Возраст" },
    { key: "occupation", label: "Занятие" },
    { key: "faction", label: "Фракция" },
    { key: "appearance", label: "Внешность", multiline: true },
    { key: "personality", label: "Характер", multiline: true },
    { key: "goals", label: "Цели", multiline: true },
    { key: "secrets", label: "Секреты мастера", multiline: true },
    { key: "relationship", label: "Отношение к группе" },
    {
      key: "statBlock",
      label: "Боевые параметры / ссылка на карточку",
      multiline: true,
    },
    { key: "tags", label: "Метки" },
  ],
  location: [
    {
      key: "type",
      label: "Тип",
      options: [
        "Мир",
        "Континент",
        "Королевство",
        "Регион",
        "Город",
        "Район",
        "Здание",
        "Комната",
        "Другое",
      ],
    },
    { key: "description", label: "Описание", multiline: true },
    { key: "tags", label: "Метки" },
  ],
  quest: [
    {
      key: "status",
      label: "Статус",
      options: ["Запланировано", "Активно", "Выполнено", "Провалено", "Скрыто"],
    },
    { key: "description", label: "Описание", multiline: true },
    { key: "giver", label: "Кто выдал" },
    { key: "objectives", label: "Цели (по одной на строку)", multiline: true },
    { key: "rewards", label: "Награды", multiline: true },
  ],
  session: [
    { key: "number", label: "Номер сессии" },
    { key: "date", label: "Дата / время в мире" },
    { key: "summary", label: "Итоги", multiline: true },
    { key: "goal", label: "Текущая цель", multiline: true },
    { key: "questions", label: "Незавершённые вопросы", multiline: true },
    { key: "plan", label: "План следующей встречи", multiline: true },
  ],
};
const text = z.string().max(20000);
const ids = z
  .array(z.string().uuid())
  .max(500)
  .refine((v) => new Set(v).size === v.length, "Повторяющиеся ссылки.");
export const campaignEntrySchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(campaignKinds),
    name: z
      .string()
      .trim()
      .min(1, "Укажите название.")
      .max(160, "Название должно быть не длиннее 160 символов."),
    fields: z.record(z.string().max(40), text),
    notes: text,
    links: ids,
    parentId: z.string().uuid().nullable(),
    archived: z.boolean(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    const allowed = campaignFields[entry.kind];
    for (const [key, value] of Object.entries(entry.fields)) {
      const field = allowed.find((f) => f.key === key);
      if (!field || (value && field.options && !field.options.includes(value)))
        ctx.addIssue({
          code: "custom",
          message: "Неизвестное поле или значение.",
          path: ["fields", key],
        });
    }
    if (entry.kind !== "location" && entry.parentId)
      ctx.addIssue({
        code: "custom",
        message: "Родитель допустим только у локации.",
      });
  });
export const campaignSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Укажите название.")
      .max(160, "Название должно быть не длиннее 160 символов."),
    editionMode: z.enum(["5e_2014", "5e_2024", "Mixed"]),
    description: text,
    dm: z.string().max(160),
    players: text,
    characterIds: ids,
    notes: text,
    calendar: text,
    entries: z.array(campaignEntrySchema).max(500),
  })
  .strict()
  .superRefine((data, ctx) => {
    const map = new Map(data.entries.map((e) => [e.id, e]));
    if (map.size !== data.entries.length)
      ctx.addIssue({ code: "custom", message: "Повторяющиеся записи." });
    for (const e of data.entries) {
      if (e.links.some((id) => !map.has(id) || id === e.id))
        ctx.addIssue({ code: "custom", message: "Неверная связь записи." });
      if (e.parentId && map.get(e.parentId)?.kind !== "location")
        ctx.addIssue({
          code: "custom",
          message: "Родительская локация не найдена.",
        });
      const seen = new Set([e.id]);
      let parent = e.parentId;
      while (parent) {
        if (seen.has(parent)) {
          ctx.addIssue({ code: "custom", message: "Цикл в иерархии локаций." });
          break;
        }
        seen.add(parent);
        parent = map.get(parent)?.parentId ?? null;
      }
    }
  });
export type CampaignData = z.infer<typeof campaignSchema>;
export type CampaignEntry = z.infer<typeof campaignEntrySchema>;
export type CampaignRecord = {
  id: string;
  version: number;
  data: CampaignData;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
export function emptyCampaign(edition: "5e_2014" | "5e_2024"): CampaignData {
  return {
    name: "Новая кампания",
    editionMode: edition,
    description: "",
    dm: "",
    players: "",
    characterIds: [],
    notes: "",
    calendar: "",
    entries: [],
  };
}
