import { z } from "zod";
import { useMemo, useSyncExternalStore } from "react";
import { editionSchema } from "@/entities/content";

export const readingKey = "companion-reading-list-v1";
const changedEvent = "companion-reading-list-changed";
const itemSchema = z
  .object({ id: z.string().uuid(), edition: editionSchema })
  .strict();
const schema = z
  .object({
    version: z.literal(1),
    favorites: z.array(itemSchema).max(200),
    recent: z.array(itemSchema).max(30),
  })
  .strict();
export type ReadingList = z.infer<typeof schema>;
export type ReadingItem = z.infer<typeof itemSchema>;
const empty: ReadingList = { version: 1, favorites: [], recent: [] };
export function parseReadingList(raw: string | null): ReadingList {
  if (!raw) return empty;
  let parsed: ReadingList;
  try {
    parsed = schema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "Некорректный файл закладок: проверьте формат, редакции и количество записей.",
    );
  }
  const unique = (items: ReadingItem[]) =>
    items.filter(
      (item, i) => items.findIndex((other) => other.id === item.id) === i,
    );
  return {
    ...parsed,
    favorites: unique(parsed.favorites),
    recent: unique(parsed.recent),
  };
}
export function updateReadingList(
  list: ReadingList,
  action:
    | "visit"
    | "toggle"
    | "removeFavorite"
    | "removeRecent"
    | "clearRecent",
  item?: ReadingItem,
): ReadingList {
  if (action === "clearRecent") return { ...list, recent: [] };
  if (!item) throw new Error("Не указана карточка.");
  itemSchema.parse(item);
  if (action === "visit")
    return {
      ...list,
      recent: [item, ...list.recent.filter((e) => e.id !== item.id)].slice(
        0,
        30,
      ),
    };
  if (action === "removeRecent")
    return { ...list, recent: list.recent.filter((e) => e.id !== item.id) };
  const exists = list.favorites.some((e) => e.id === item.id);
  if (exists || action === "removeFavorite")
    return {
      ...list,
      favorites: list.favorites.filter((e) => e.id !== item.id),
    };
  if (list.favorites.length >= 200)
    throw new Error(
      "В избранном уже 200 карточек. Удалите ненужную, чтобы добавить новую.",
    );
  return { ...list, favorites: [item, ...list.favorites] };
}
function snapshot() {
  try {
    return localStorage.getItem(readingKey) ?? "";
  } catch {
    return "unavailable";
  }
}
function subscribe(callback: () => void) {
  const storage = (e: StorageEvent) => {
    if (!e.key || e.key === readingKey) callback();
  };
  window.addEventListener("storage", storage);
  window.addEventListener(changedEvent, callback);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(changedEvent, callback);
  };
}
export function useReadingList() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => {
    try {
      return { list: parseReadingList(raw), error: "" };
    } catch {
      return {
        list: empty,
        error:
          "Не удалось прочитать закладки браузера. Данные не перезаписаны. Проверьте доступ к хранилищу или восстановите файл закладок.",
      };
    }
  }, [raw]);
}
export function changeReadingList(
  action: Parameters<typeof updateReadingList>[1],
  item?: ReadingItem,
) {
  const raw = localStorage.getItem(readingKey);
  const next = updateReadingList(parseReadingList(raw), action, item);
  localStorage.setItem(readingKey, JSON.stringify(next));
  window.dispatchEvent(new Event(changedEvent));
}
export function restoreReadingList(raw: string) {
  if (raw.length > 100000) throw new Error("Файл закладок слишком большой.");
  const list = parseReadingList(raw);
  localStorage.setItem(readingKey, JSON.stringify(list));
  window.dispatchEvent(new Event(changedEvent));
}
