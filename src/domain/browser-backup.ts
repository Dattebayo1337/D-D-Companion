import { z } from "zod";
const keyPattern =
  /^companion-(?:settings|edition|reading-list-v1|dice-history|(?:dm-screen|encounter|loot|author-draft)-5e_(?:2014|2024)|campaign-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const schema = z
  .object({
    format: z.literal("dnd-companion-browser"),
    version: z.literal(1),
    values: z.record(z.string().regex(keyPattern), z.string().max(5000000)),
  })
  .strict();
export type BrowserBackup = z.infer<typeof schema>;
type StoragePort = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>;
export function parseBrowserBackup(raw: string): BrowserBackup {
  if (new TextEncoder().encode(raw).byteLength > 6000000)
    throw new Error("Копия превышает 6 МБ.");
  try {
    const value = schema.parse(JSON.parse(raw));
    if (Object.keys(value.values).length > 1000) throw new Error();
    for (const [key, text] of Object.entries(value.values)) {
      if (key === "companion-edition")
        z.enum(["5e_2014", "5e_2024"]).parse(text);
      else JSON.parse(text);
    }
    return value;
  } catch {
    throw new Error(
      "Некорректная копия браузера: формат или данные не поддерживаются.",
    );
  }
}
export function captureBrowserBackup(storage: StoragePort): BrowserBackup {
  const values: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && keyPattern.test(key)) {
      const value = storage.getItem(key);
      if (value !== null) values[key] = value;
    }
  }
  return parseBrowserBackup(
    JSON.stringify({ format: "dnd-companion-browser", version: 1, values }),
  );
}
export function applyBrowserBackup(storage: StoragePort, input: BrowserBackup) {
  const value = parseBrowserBackup(JSON.stringify(input));
  const previous = new Map(
    Object.keys(value.values).map((key) => [key, storage.getItem(key)]),
  );
  try {
    for (const [key, text] of Object.entries(value.values))
      storage.setItem(key, text);
  } catch {
    try {
      for (const key of previous.keys()) storage.removeItem(key);
      for (const [key, text] of previous)
        if (text !== null) storage.setItem(key, text);
    } catch {
      throw new Error(
        "Хранилище недоступно; не удалось завершить откат. Восстановите предварительно скачанную копию после исправления доступа.",
      );
    }
    throw new Error(
      "Не хватило места или доступа. Прежние значения восстановлены.",
    );
  }
  return previous.size;
}
