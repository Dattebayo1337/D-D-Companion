"use client";
import { useEffect, useState } from "react";
import { Plus, Copy, PenLine, Package, BookOpen } from "lucide-react";
import {
  contentSchema,
  type Content,
  type EditionId,
  type SourceBook,
} from "@/entities/content";
import {
  blankContent,
  authorSources,
  workshopKinds,
  type WorkshopKind,
} from "@/entities/workshop";
import { referenceLabels } from "@/localization/reference";
import { contentSummary } from "@/domain/content-summary";
import { validateRussian } from "@/localization/validate";
import { requestJson } from "@/shared/client";
import { EntryIcon } from "../compendium/EntrySummary";
import { Detail } from "../compendium/Detail";
import { downloadText } from "../tools/shared";
import type { Settings } from "../shell/types";
import { Fields, fieldTitle } from "./Fields";
import { Packages } from "./Packages";
export const kindNames: Record<WorkshopKind, string> = {
  Spell: "Заклинание",
  Monster: "Существо",
  ...referenceLabels,
};
function cleanLists(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .filter((v) => typeof v !== "string" || v.trim())
      .map((v) => (typeof v === "string" ? v.trim() : cleanLists(v)));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, cleanLists(v)]),
    );
  return value;
}
export function Workshop({
  edition,
  sources,
  settings,
  clone,
  refresh,
}: {
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
  clone: Content | null;
  refresh: () => void;
}) {
  const [rows, setRows] = useState<Content[]>([]),
    [entry, setEntry] = useState<Content | null>(null),
    [expected, setExpected] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState<WorkshopKind>("Spell"),
    [preview, setPreview] = useState<Content | null>(null),
    [q, setQ] = useState(""),
    [mode, setMode] = useState<"own" | "clone" | "packages">("own"),
    [catalog, setCatalog] = useState<{ items: Content[]; total: number }>({
      items: [],
      total: 0,
    }),
    [page, setPage] = useState(1),
    [classes, setClasses] = useState<{ id: string; nameRu: string }[]>([]),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const draftKey = `companion-author-draft-${edition}`;
  function edit(value: Content, version: number) {
    setNotice("");
    setEntry(value);
    setExpected(version);
    setError("");
  }
  function copy(source: Content) {
    const now = new Date().toISOString();
    edit(
      {
        ...source,
        id: crypto.randomUUID(),
        sourceBookId: authorSources[source.edition],
        contentOrigin: "Homebrew",
        translationStatus: "HumanReviewed",
        nameRu: `${source.nameRu} — авторская версия`,
        source: `Авторская переработка: ${source.source}`.slice(0, 1000),
        license:
          `Авторская переработка. Исходные условия: ${source.license}`.slice(
            0,
            2000,
          ),
        createdAt: now,
        updatedAt: now,
        contentVersion: 1,
      },
      0,
    );
    setMode("own");
  }
  useEffect(() => {
    if (clone) {
      const timer = setTimeout(() => copy(clone), 0);
      return () => clearTimeout(timer);
    } /* initial clone only */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone]);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      requestJson<Content[]>(`/api/workshop?edition=${edition}`, {
        signal: c.signal,
      }),
      requestJson<{ items: Content[] }>(
        `/api/content?edition=${edition}&kind=Reference&category=Class&pageSize=100`,
        { signal: c.signal },
      ),
    ])
      .then(([r, cs]) => {
        setRows(r);
        setClasses([
          ...cs.items,
          ...r.filter(
            (e) =>
              e.kind === "Reference" &&
              e.reference.category === "Class" &&
              !cs.items.some((x) => x.id === e.id),
          ),
        ]);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [edition, revision]);
  useEffect(() => {
    if (mode !== "clone") return;
    const c = new AbortController();
    const t = setTimeout(
      () =>
        requestJson<{ items: Content[]; total: number }>(
          `/api/content?edition=${edition}&q=${encodeURIComponent(q)}&page=${page}&pageSize=8`,
          { signal: c.signal },
        )
          .then(setCatalog)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      200,
    );
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [mode, q, page, edition]);
  useEffect(() => {
    if (!entry) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ entry, expected }));
    } catch {
      /* Explicit export remains available. */
    }
  }, [entry, expected, draftKey]);
  async function save(publish: boolean) {
    if (!entry) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const parsed = contentSchema.safeParse(
        cleanLists({
          ...entry,
          translationStatus: publish ? "Approved" : "HumanReviewed",
        }),
      );
      if (!parsed.success)
        throw new Error(
          parsed.error.issues
            .map(
              (i) => `${fieldTitle(i.path.join("."))}: проверьте значение поля`,
            )
            .join("\n"),
        );
      if (publish) {
        const issues = validateRussian([parsed.data]);
        if (issues.length)
          throw new Error(
            issues
              .map(
                (i) =>
                  `${fieldTitle(i.path.split(".").slice(1).join("."))}: ${i.message}`,
              )
              .join("\n"),
          );
      }
      const saved = await requestJson<Content>("/api/workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: parsed.data, expectedVersion: expected }),
      });
      setEntry(null);
      setQ("");
      setExpected(0);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setRevision((r) => r + 1);
      refresh();
      setNotice(
        publish
          ? "Карточка опубликована в справочнике."
          : "Черновик сохранён. Он виден только в мастерской.",
      );
      void saved;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="workshop">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ВАШИ ПРАВИЛА И ИСТОРИИ</p>
          <h1>
            <PenLine size={28} /> Мастерская автора
          </h1>
          <p>
            Создавайте карточки для редакции {edition.slice(3)} и публикуйте их
            в своей библиотеке.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert" style={{ whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {entry ? (
        <div className="character-panel">
          <div className="workshop-toolbar">
            <h2>
              {expected
                ? "Редактирование карточки"
                : "Новая авторская карточка"}
            </h2>
            <span className="badge">
              {entry.kind === "Reference"
                ? referenceLabels[entry.reference.category]
                : kindNames[entry.kind]}
            </span>
          </div>
          <p className="muted">
            Черновик сохраняется в этом браузере. Публикация делает карточку
            доступной в справочниках; игровые особенности применяются вручную.
          </p>
          <fieldset disabled={busy} className="workshop-editor">
            <div className="workshop-fields">
              <label>
                Название на русском
                <input
                  value={entry.nameRu}
                  onChange={(e) =>
                    setEntry({ ...entry, nameRu: e.target.value })
                  }
                />
              </label>
              <label>
                Оригинальное название
                <input
                  value={entry.nameOriginal}
                  onChange={(e) =>
                    setEntry({ ...entry, nameOriginal: e.target.value })
                  }
                />
              </label>
              <label className="workshop-wide">
                Описание на русском
                <textarea
                  rows={7}
                  value={entry.descriptionRu}
                  onChange={(e) =>
                    setEntry({ ...entry, descriptionRu: e.target.value })
                  }
                />
              </label>
              <label>
                Метки через запятую
                <input
                  value={entry.tags.join(",")}
                  onChange={(e) =>
                    setEntry({ ...entry, tags: e.target.value.split(",") })
                  }
                />
              </label>
              <label>
                Альтернативные названия через запятую
                <input
                  value={entry.aliases.join(",")}
                  onChange={(e) =>
                    setEntry({ ...entry, aliases: e.target.value.split(",") })
                  }
                />
              </label>
              <label>
                Автор / источник
                <input
                  value={entry.source}
                  onChange={(e) =>
                    setEntry({ ...entry, source: e.target.value })
                  }
                />
              </label>
              <label>
                Условия использования
                <textarea
                  rows={2}
                  value={entry.license}
                  onChange={(e) =>
                    setEntry({ ...entry, license: e.target.value })
                  }
                />
              </label>
            </div>
            <details className="workshop-mechanics" open>
              <summary>Параметры и игровые особенности</summary>
              <Fields
                value={
                  entry.kind === "Spell"
                    ? entry.spell
                    : entry.kind === "Monster"
                      ? entry.monster
                      : entry.reference
                }
                classes={classes}
                change={(v) =>
                  setEntry({
                    ...entry,
                    [entry.kind === "Spell"
                      ? "spell"
                      : entry.kind === "Monster"
                        ? "monster"
                        : "reference"]: v,
                  } as Content)
                }
              />
            </details>
            <div className="workshop-toolbar workshop-save">
              <button className="button" onClick={() => save(true)}>
                Опубликовать
              </button>
              <button className="button secondary" onClick={() => save(false)}>
                Сохранить черновик
              </button>
              <button
                className="quiet-button"
                onClick={() => {
                  const r = contentSchema.safeParse(entry);
                  if (r.success) setPreview(r.data);
                  else
                    setError("Исправьте параметры перед просмотром карточки.");
                }}
              >
                Предпросмотр
              </button>
              <button
                className="quiet-button"
                onClick={() =>
                  downloadText(
                    "author-draft.json",
                    JSON.stringify(entry, null, 2),
                  )
                }
              >
                Скачать черновик
              </button>
              <button className="quiet-button" onClick={() => setEntry(null)}>
                К списку
              </button>
            </div>
          </fieldset>
        </div>
      ) : (
        <>
          <div
            className="workshop-tabs"
            role="group"
            aria-label="Разделы мастерской"
          >
            {(
              [
                ["own", "Мои карточки"],
                ["clone", "Копия из справочника"],
                ["packages", "Пакеты"],
              ] as const
            ).map(([id, name]) => (
              <button
                className={mode === id ? "button" : "button secondary"}
                key={id}
                onClick={() => {
                  setMode(id);
                  setError("");
                  setQ("");
                  setPage(1);
                }}
              >
                {id === "packages" ? (
                  <Package size={17} />
                ) : id === "clone" ? (
                  <Copy size={17} />
                ) : (
                  <BookOpen size={17} />
                )}{" "}
                {name}
              </button>
            ))}
          </div>
          {mode === "packages" ? (
            <Packages
              refresh={() => {
                setRevision((r) => r + 1);
                refresh();
              }}
            />
          ) : (
            <>
              <div className="workshop-toolbar">
                {mode === "own" && (
                  <>
                    <label>
                      Тип карточки
                      <select
                        value={kind}
                        onChange={(e) =>
                          setKind(e.target.value as WorkshopKind)
                        }
                      >
                        {workshopKinds.map((k) => (
                          <option key={k} value={k}>
                            {kindNames[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button"
                      onClick={() =>
                        edit(
                          blankContent(kind, edition, crypto.randomUUID()),
                          0,
                        )
                      }
                    >
                      <Plus size={17} /> Создать карточку
                    </button>
                    <button
                      className="quiet-button"
                      onClick={() => {
                        try {
                          const d = JSON.parse(
                            localStorage.getItem(draftKey) ?? "null",
                          );
                          if (!d)
                            throw new Error("Сохранённого черновика нет.");
                          edit(
                            contentSchema.parse(d.entry),
                            Number(d.expected) || 0,
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Вернуть локальный черновик
                    </button>
                  </>
                )}
                <label>
                  Поиск карточек
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Название или описание"
                  />
                </label>
              </div>
              <div className="workshop-grid">
                {(mode === "clone"
                  ? catalog.items
                  : rows.filter((e) =>
                      `${e.nameRu} ${e.descriptionRu}`
                        .toLowerCase()
                        .includes(q.toLowerCase()),
                    )
                ).map((e) => (
                  <article className="workshop-card" key={e.id}>
                    <EntryIcon entry={e} size={25} />
                    <h3>{e.nameRu || "Без названия"}</h3>
                    <span className="badge">
                      {mode === "own"
                        ? e.translationStatus === "Approved"
                          ? "Опубликовано"
                          : "Черновик"
                        : e.kind === "Reference"
                          ? referenceLabels[e.reference.category]
                          : kindNames[e.kind]}
                    </span>
                    <p>{contentSummary(e).text || "Добавьте описание"}</p>
                    <div className="workshop-toolbar">
                      <button
                        className="button secondary"
                        onClick={() =>
                          mode === "clone" ? copy(e) : edit(e, e.contentVersion)
                        }
                      >
                        {mode === "clone"
                          ? "Создать авторскую копию"
                          : "Редактировать"}
                      </button>
                      <button
                        className="quiet-button"
                        onClick={() => setPreview(e)}
                      >
                        Карточка
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {mode === "own" && !rows.length && (
                <div className="empty-state">
                  <PenLine size={32} />
                  <h2>Здесь начнётся ваша история</h2>
                  <p>
                    Создайте первую карточку или возьмите за основу запись из
                    справочника.
                  </p>
                </div>
              )}
              {mode === "clone" && (
                <div className="workshop-toolbar">
                  <button
                    className="button secondary"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Назад
                  </button>
                  <span>
                    Страница {page} · найдено {catalog.total}
                  </span>
                  <button
                    className="button secondary"
                    disabled={page * 8 >= catalog.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Далее
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {preview && (
        <Detail
          entry={preview}
          sources={sources}
          settings={settings}
          close={() => setPreview(null)}
          open={setPreview}
        />
      )}
    </section>
  );
}
