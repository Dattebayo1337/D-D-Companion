import { useEffect, useState } from "react";
import type { z } from "zod";
import type { Content, SourceBook } from "@/entities/content";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
import { Detail } from "../compendium/Detail";

export const numberText = (n: number) =>
  n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
export function useToolDraft<T>(key: string, schema: z.ZodType<T>, initial: T) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const result = schema.safeParse(JSON.parse(raw));
          if (result.success) setValue(result.data);
          else setStorageError("Сохранённый черновик устарел. Открыт новый.");
        }
      } catch {
        setStorageError(
          "Не удалось прочитать черновик. Инструмент работает без сохранения.",
        );
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [key, schema]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      const t = setTimeout(
        () => setStorageError("Браузер не разрешил сохранить черновик."),
        0,
      );
      return () => clearTimeout(t);
    }
  }, [key, value, ready]);
  return { value, setValue, ready, storageError };
}
export function ToolEntry({
  id,
  sources,
  settings,
  close,
}: {
  id: string;
  sources: SourceBook[];
  settings: Settings;
  close: () => void;
}) {
  const [entry, setEntry] = useState<Content | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    requestJson<Content>(`/api/content/${id}`, { signal: controller.signal })
      .then(setEntry)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [id]);
  return entry ? (
    <Detail
      entry={entry}
      sources={sources}
      settings={settings}
      close={close}
      open={setEntry}
    />
  ) : (
    <div role={error ? "alert" : "status"} className="tool-notice">
      {error || "Загрузка карточки…"}
      <button className="quiet-button" onClick={close}>
        Закрыть
      </button>
    </div>
  );
}
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
