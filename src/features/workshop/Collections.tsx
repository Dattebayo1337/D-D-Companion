"use client";
import { useEffect, useState } from "react";
import { FolderHeart, Plus, Archive } from "lucide-react";
import type { CollectionRecord } from "@/entities/workshop";
import type { Content, SourceBook } from "@/entities/content";
import { requestJson } from "@/shared/client";
import type { Settings } from "../shell/types";
import { ToolEntry, downloadText } from "../tools/shared";
import { EntryIcon } from "../compendium/EntrySummary";
export function Collections({
  edition,
  sources,
  settings,
}: {
  edition: string;
  sources: SourceBook[];
  settings: Settings;
}) {
  const [rows, setRows] = useState<CollectionRecord[]>([]),
    [selected, setSelected] = useState<CollectionRecord | null>(null),
    [members, setMembers] = useState<Content[]>([]),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [results, setResults] = useState<{ items: Content[]; total: number }>({
      items: [],
      total: 0,
    }),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [archived, setArchived] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    requestJson<CollectionRecord[]>("/api/workshop?mode=collections", {
      signal: c.signal,
    })
      .then(setRows)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [revision]);
  useEffect(() => {
    if (!selected) return;
    const c = new AbortController();
    Promise.allSettled(
      selected.ids.map((id) =>
        requestJson<Content>(`/api/content/${id}`, { signal: c.signal }),
      ),
    ).then((results) => {
      if (c.signal.aborted) return;
      setMembers(
        results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
      );
      if (results.some((r) => r.status === "rejected"))
        setError(
          "Некоторые карточки сняты с публикации или недоступны. Их ссылки сохранены в коллекции.",
        );
    });
    return () => c.abort();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const c = new AbortController();
    const t = setTimeout(
      () =>
        requestJson<{ items: Content[]; total: number }>(
          `/api/content?edition=${edition}&q=${encodeURIComponent(q)}&page=${page}&pageSize=8`,
          { signal: c.signal },
        )
          .then(setResults)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      200,
    );
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q, page, edition, selected]);
  async function save(
    data: Pick<CollectionRecord, "name" | "description" | "ids" | "archived">,
    current: CollectionRecord | null = selected,
  ) {
    setBusy(true);
    setError("");
    try {
      const r = await requestJson<CollectionRecord>(
        "/api/workshop?mode=collections",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(current ? { id: current.id } : {}),
            version: current?.version ?? 0,
            data: {
              name: current ? name : data.name,
              description: current ? description : data.description,
              ids: data.ids,
              archived: data.archived,
            },
          }),
        },
      );
      setSelected(r);
      setName(r.name);
      setDescription(r.description);
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function select(r: CollectionRecord) {
    setSelected(r);
    setName(r.name);
    setDescription(r.description);
    setMembers([]);
    setError("");
  }
  return (
    <section className="workshop">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ВАША ЛИЧНАЯ ПОДБОРКА</p>
          <h1>
            <FolderHeart size={28} /> Коллекции
          </h1>
          <p>
            Соберите заклинания, существ и правила для будущих приключений.
            Коллекция может включать обе редакции.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {selected ? (
        <>
          <div className="workshop-toolbar">
            <button
              className="button secondary"
              onClick={() => {
                setSelected(null);
                setName("");
                setDescription("");
              }}
            >
              Все коллекции
            </button>
            <button
              className="quiet-button"
              disabled={busy}
              onClick={() =>
                save({ ...selected, archived: !selected.archived })
              }
            >
              <Archive size={16} />
              {selected.archived ? "Восстановить" : "В архив"}
            </button>
            <button
              className="quiet-button"
              onClick={() =>
                downloadText(
                  "collection.json",
                  JSON.stringify(
                    {
                      schemaVersion: 1,
                      name: selected.name,
                      description: selected.description,
                      ids: selected.ids,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Скачать список
            </button>
          </div>
          <div className="character-panel">
            <div className="workshop-fields">
              <label>
                Название коллекции
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Описание коллекции
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
            <button
              className="button"
              disabled={busy || !name.trim()}
              onClick={() => save({ ...selected, name, description })}
            >
              Сохранить название и описание
            </button>
          </div>
          <h2>
            {selected.name} · {selected.ids.length}
          </h2>
          <div className="workshop-grid">
            {members.map((e) => (
              <article className="workshop-card" key={e.id}>
                <EntryIcon entry={e} size={24} />
                <button className="text-link" onClick={() => setPreview(e.id)}>
                  {e.nameRu}
                </button>
                <span className="badge">{e.edition.slice(3)}</span>
                <div className="workshop-toolbar">
                  <button
                    className="quiet-button"
                    disabled={busy || selected.ids.indexOf(e.id) === 0}
                    onClick={() => {
                      const ids = [...selected.ids];
                      const i = ids.indexOf(e.id);
                      [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                      void save({ ...selected, ids });
                    }}
                  >
                    Выше
                  </button>
                  <button
                    className="quiet-button"
                    disabled={busy}
                    onClick={() =>
                      save({
                        ...selected,
                        ids: selected.ids.filter((id) => id !== e.id),
                      })
                    }
                  >
                    Убрать из коллекции
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!selected.ids.length && (
            <p className="empty-state">
              Коллекция пока пуста. Найдите карточки ниже и добавьте их.
            </p>
          )}
          {selected.ids
            .filter((id) => !members.some((e) => e.id === id))
            .map((id) => (
              <div className="tool-notice" key={id}>
                Карточка недоступна или загружается{" "}
                <button
                  disabled={busy}
                  className="quiet-button"
                  onClick={() =>
                    save({
                      ...selected,
                      ids: selected.ids.filter((x) => x !== id),
                    })
                  }
                >
                  Убрать ссылку
                </button>
              </div>
            ))}
          {!selected.archived && (
            <div className="character-panel">
              <h2>Добавить из библиотеки · {edition.slice(3)}</h2>
              <label>
                Найти для коллекции
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Заклинание, существо или правило"
                />
              </label>
              <div className="workshop-grid">
                {results.items.map((e) => (
                  <article className="workshop-card" key={e.id}>
                    <EntryIcon entry={e} size={22} />
                    <h3>{e.nameRu}</h3>
                    <button
                      className="button secondary"
                      disabled={busy || selected.ids.includes(e.id)}
                      onClick={() =>
                        save({ ...selected, ids: [...selected.ids, e.id] })
                      }
                    >
                      {selected.ids.includes(e.id)
                        ? "Уже добавлено"
                        : "Добавить в коллекцию"}
                    </button>
                  </article>
                ))}
              </div>
              <div className="workshop-toolbar">
                <button
                  className="button secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Назад
                </button>
                <span>
                  {page} · найдено {results.total}
                </span>
                <button
                  className="button secondary"
                  disabled={page * 8 >= results.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="character-panel">
            <div className="workshop-toolbar">
              <label>
                Новая коллекция
                <input
                  placeholder="Например: Монстры Подземья"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                className="button"
                disabled={busy || !name.trim()}
                onClick={() =>
                  save(
                    { name, description: "", ids: [], archived: false },
                    null,
                  )
                }
              >
                <Plus size={17} /> Создать коллекцию
              </button>
              <label className="workshop-check">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />{" "}
                Архив
              </label>
              <button
                className="quiet-button"
                onClick={() => setRevision((v) => v + 1)}
              >
                Обновить
              </button>
            </div>
          </div>
          <div className="workshop-grid">
            {rows
              .filter((r) => r.archived === archived)
              .map((r) => (
                <button
                  key={r.id}
                  className="workshop-card collection-link"
                  onClick={() => select(r)}
                >
                  <FolderHeart size={28} />
                  <h2>{r.name}</h2>
                  <p>{r.description || "Личная подборка"}</p>
                  <span>{r.ids.length} карточек</span>
                </button>
              ))}
          </div>
        </>
      )}
      {preview && (
        <ToolEntry
          id={preview}
          sources={sources}
          settings={settings}
          close={() => setPreview(null)}
        />
      )}
    </section>
  );
}
