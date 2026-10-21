import { useState } from "react";
import { offlineCard } from "@/domain/offline-card";
import type { Content } from "@/entities/content";
declare global {
  interface Window {
    CompanionOffline?: {
      save: (card: ReturnType<typeof offlineCard>) => Promise<unknown>;
    };
  }
}
async function saveCards(ids: string[], progress: (s: string) => void) {
  if (window.CompanionOffline) {
    let saved = 0,
      failed = 0;
    for (const id of [...new Set(ids)]) {
      try {
        const response = await fetch(`/api/content/${id}`, {
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Карточка недоступна");
        await window.CompanionOffline.save(
          offlineCard((await response.json()) as Content),
        );
        saved++;
      } catch {
        failed++;
      }
      progress(`Сохранено: ${saved}; не удалось: ${failed}.`);
    }
    return `Сохранено: ${saved}. Не удалось: ${failed}. Откройте меню приложения → «Читать без сети».`;
  }
  if (!("serviceWorker" in navigator) || !window.isSecureContext)
    throw new Error(
      "Для сохранения нужен HTTPS или localhost и поддержка Service Worker.",
    );
  const worker = await navigator.serviceWorker.register("/offline-sw.js", {
    scope: "/",
  });
  if (!worker.active)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "Не удалось подготовить автономную страницу. Повторите сохранение.",
            ),
          ),
        15000,
      );
      const installing = worker.installing ?? worker.waiting;
      if (!installing) {
        clearTimeout(timer);
        reject(new Error("Повторите сохранение после обновления страницы."));
        return;
      }
      installing.addEventListener("statechange", () => {
        if (installing.state === "activated") {
          clearTimeout(timer);
          resolve();
        }
        if (installing.state === "redundant") {
          clearTimeout(timer);
          reject(new Error("Не удалось сохранить страницу чтения."));
        }
      });
    });
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("companion-offline", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("cards", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  let saved = 0,
    failed = 0;
  try {
    for (const id of [...new Set(ids)]) {
      try {
        const response = await fetch(`/api/content/${id}`, {
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Карточка недоступна");
        const card = offlineCard((await response.json()) as Content);
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("cards", "readwrite");
          const store = tx.objectStore("cards");
          const count = store.count();
          count.onsuccess = () => {
            const existing = store.get(id);
            existing.onsuccess = () => {
              if (count.result >= 200 && !existing.result) {
                tx.abort();
                return;
              }
              store.put(card);
            };
          };
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error ?? new Error("Лимит хранилища"));
          tx.onerror = () => reject(tx.error);
        });
        saved++;
      } catch {
        failed++;
      }
      progress(`Сохранено: ${saved}; не удалось: ${failed}.`);
    }
  } finally {
    db.close();
  }
  return `Сохранено: ${saved}. Не удалось: ${failed}. Откройте «Читать без сети», чтобы проверить копии. Лимит — 200 карточек.`;
}
export function OfflineSave({ ids }: { ids: string[] }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className="offline-save">
      <button
        type="button"
        className="button secondary"
        disabled={busy || !ids.length}
        onClick={async () => {
          setBusy(true);
          try {
            setMessage(await saveCards(ids, setMessage));
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "Хранилище недоступно.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Сохранение…" : "Сохранить для чтения без сети"}
      </button>{" "}
      <a href="/offline.html" target="_blank" rel="noreferrer">
        Читать без сети
      </a>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
