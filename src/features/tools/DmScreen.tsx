import { useEffect, useState } from "react";
import { z } from "zod";
import { Pin, PinOff, BookOpen } from "lucide-react";
import type { Content, EditionId, SourceBook } from "@/entities/content";
import type { Settings } from "../shell/types";
import { contentSummary } from "@/domain/content-summary";
import { EntryIcon } from "../compendium/EntrySummary";
import { requestJson } from "@/shared/client";
import { ToolEntry, useToolDraft } from "./shared";
import { DiceRoller } from "./DiceRoller";
const screenSchema = z.object({
  pins: z.array(z.string().uuid()).max(12),
  notes: z.string().max(20000),
});
export function DmScreen({
  edition,
  sources,
  settings,
}: {
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
}) {
  const { value, setValue, ready, storageError } = useToolDraft(
    `companion-dm-screen-${edition}`,
    screenSchema,
    { pins: [], notes: "" },
  );
  const [items, setItems] = useState<Content[]>([]),
    [pins, setPins] = useState<Content[]>([]),
    [q, setQ] = useState(""),
    [category, setCategory] = useState("Condition"),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [opened, setOpened] = useState<string | null>(null),
    [error, setError] = useState(""),
    [pinError, setPinError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        kind: "Reference",
        category,
        edition,
        q,
        page: String(page),
        pageSize: "8",
      });
      requestJson<{ items: Content[]; total: number }>(
        `/api/content?${params}`,
        { signal: controller.signal },
      )
        .then((r) => {
          setItems(r.items);
          setTotal(r.total);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, category, edition, page, revision]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    Promise.allSettled(
      value.pins.map((id) =>
        requestJson<Content>(`/api/content/${id}`, {
          signal: controller.signal,
        }),
      ),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setPins(
        results.flatMap((r) =>
          r.status === "fulfilled" && r.value.edition === edition
            ? [r.value]
            : [],
        ),
      );
      setPinError(
        results.some((r) => r.status === "rejected")
          ? "Некоторые закреплённые карточки недоступны. Повторите загрузку или очистите недоступные закрепления."
          : "",
      );
    });
    return () => controller.abort();
  }, [value.pins, ready, edition, revision]);
  function toggle(entry: Content) {
    setValue((v) => ({
      ...v,
      pins: v.pins.includes(entry.id)
        ? v.pins.filter((id) => id !== entry.id)
        : v.pins.length < 12
          ? [...v.pins, entry.id]
          : v.pins,
    }));
  }
  function card(entry: Content) {
    const pinned = value.pins.includes(entry.id);
    return (
      <article className="dm-reference-card" key={entry.id}>
        <button
          className="dm-reference-open"
          onClick={() => setOpened(entry.id)}
        >
          <EntryIcon entry={entry} />
          <h3>{entry.nameRu}</h3>
          <p>{contentSummary(entry).text}</p>
        </button>
        <button
          className="quiet-button"
          disabled={!ready || (!pinned && value.pins.length >= 12)}
          onClick={() => toggle(entry)}
        >
          {pinned ? <PinOff size={15} /> : <Pin size={15} />}{" "}
          {pinned ? "Открепить" : "Закрепить"}
        </button>
      </article>
    );
  }
  return (
    <section className="dm-screen campaigns">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПОД РУКОЙ ВО ВРЕМЯ ИГРЫ</p>
          <h1>Экран мастера</h1>
          <p>
            Правила {edition === "5e_2014" ? "2014" : "2024"}, состояния,
            заметки и кубы.
          </p>
        </div>
        <BookOpen size={35} />
      </div>
      {storageError && (
        <p className="error" role="alert">
          {storageError}
        </p>
      )}
      <div className="dm-screen-layout">
        <div>
          <section className="tool-panel">
            <h2>
              <Pin size={20} />
              Закреплённые карточки · {value.pins.length}/12
            </h2>
            {pinError && (
              <p className="error" role="alert">
                {pinError}
                <button
                  className="quiet-button"
                  onClick={() => setRevision((n) => n + 1)}
                >
                  Повторить
                </button>
                <button
                  className="quiet-button"
                  onClick={() =>
                    setValue((v) => ({ ...v, pins: pins.map((p) => p.id) }))
                  }
                >
                  Очистить недоступные
                </button>
              </p>
            )}
            {!value.pins.length && (
              <p>
                Закрепите часто используемые правила из списка ниже. Набор
                сохраняется отдельно для каждой редакции.
              </p>
            )}
            <div className="dm-card-grid">{pins.map(card)}</div>
          </section>
          <section className="tool-panel">
            <h2>Быстрый справочник</h2>
            <div className="tool-form-grid">
              <label>
                Раздел
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="Condition">Состояния</option>
                  <option value="Rule">Правила и действия</option>
                </select>
              </label>
              <label>
                Поиск
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Концентрация, укрытие…"
                />
              </label>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
                <button onClick={() => setRevision((n) => n + 1)}>
                  Повторить
                </button>
              </p>
            )}
            {loading ? (
              <p role="status">Поиск правил…</p>
            ) : (
              <div className="dm-card-grid">{items.map(card)}</div>
            )}
            {!loading && !items.length && (
              <p>Записи не найдены. Измените запрос или раздел.</p>
            )}
            <div className="campaign-actions">
              <button
                className="quiet-button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(total / 8))}
              </span>
              <button
                className="quiet-button"
                disabled={page * 8 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </button>
            </div>
          </section>
        </div>
        <aside>
          <DiceRoller />
          <section className="tool-panel">
            <h2>Заметки мастера</h2>
            <label>
              Быстрые заметки
              <textarea
                rows={8}
                maxLength={20000}
                disabled={!ready}
                value={value.notes}
                onChange={(e) =>
                  setValue((v) => ({ ...v, notes: e.target.value }))
                }
              />
            </label>
            <p className="muted">
              Сохраняются в этом браузере отдельно для каждой редакции. Записи
              кампании находятся в её журнале.
            </p>
          </section>
        </aside>
      </div>
      {opened && (
        <ToolEntry
          key={opened}
          id={opened}
          sources={sources}
          settings={settings}
          close={() => setOpened(null)}
        />
      )}
    </section>
  );
}
