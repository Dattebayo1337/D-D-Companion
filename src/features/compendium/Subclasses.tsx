import { EntryIcon } from "./EntrySummary";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Search } from "lucide-react";
import type { Content, ReferenceEntry, SourceBook } from "@/entities/content";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
import { Compendium } from "./Compendium";

export function Subclasses({
  edition,
  sources,
  settings,
}: {
  edition: string;
  sources: SourceBook[];
  settings: Settings;
}) {
  const [classes, setClasses] = useState<ReferenceEntry[]>([]);
  const [selected, setSelected] = useState<ReferenceEntry | null>(null);
  const [classQuery, setClassQuery] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const back = useRef<HTMLButtonElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ items: Content[] }>(
      `/api/content?kind=Reference&category=Class&edition=${edition}&pageSize=100`,
      { signal: controller.signal },
    )
      .then((r) => {
        setClasses(
          r.items.filter((e): e is ReferenceEntry => e.kind === "Reference"),
        );
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [edition, revision]);
  useEffect(() => {
    if (selected) {
      back.current?.focus();
      previous.current = selected.id;
    } else if (previous.current) buttons.current.get(previous.current)?.focus();
  }, [selected]);
  if (selected)
    return (
      <>
        <button
          ref={back}
          className="button secondary subclass-back"
          onClick={() => {
            setSelected(null);
            setQuery("");
          }}
        >
          <ArrowLeft size={16} />
          Все классы
        </button>
        <Compendium
          key={selected.id}
          kind="Reference"
          category="Subclass"
          edition={edition}
          parentId={selected.id}
          className={selected.nameRu}
          query=""
          localQuery={query}
          onQueryChange={setQuery}
          sources={sources}
          settings={settings}
        />
      </>
    );
  const normalize = (s: string) =>
    s.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
  const visible = classes.filter((c) =>
    normalize(`${c.nameRu} ${c.nameOriginal} ${c.aliases.join(" ")}`).includes(
      normalize(classQuery),
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">БИБЛИОТЕКА ПРИКЛЮЧЕНИЙ</p>
          <h1>Подклассы</h1>
          <p>
            Сначала выберите класс, затем его специализацию. Правила{" "}
            {edition === "5e_2014" ? "2014" : "2024"}.
          </p>
        </div>
        <BookOpen size={30} strokeWidth={1} />
      </div>
      <div className="filter-panel">
        <div className="filter-search">
          <Search size={18} />
          <input
            aria-label="Найти класс"
            placeholder="Название класса…"
            value={classQuery}
            onChange={(e) => setClassQuery(e.target.value)}
          />
        </div>
      </div>
      {loading && <p role="status">Загрузка классов…</p>}
      {error && (
        <div role="alert" className="error">
          {error}
          <button
            className="quiet-button"
            onClick={() => {
              setLoading(true);
              setRevision((n) => n + 1);
            }}
          >
            Повторить
          </button>
        </div>
      )}
      {!loading && !error && (
        <section
          aria-label="Выбор класса"
          className="content-grid subclass-classes"
        >
          {visible.map((c) => (
            <button
              key={c.id}
              ref={(node) => {
                if (node) buttons.current.set(c.id, node);
                else buttons.current.delete(c.id);
              }}
              className="content-card"
              onClick={() => {
                setQuery("");
                setSelected(c);
              }}
              aria-label={`Подклассы: ${c.nameRu}`}
            >
              <div className="card-top">
                <span className="entity-icon reference">
                  <EntryIcon entry={c} size={22} />
                </span>
                <span className="badge">
                  {edition === "5e_2014" ? "2014" : "2024"}
                </span>
              </div>
              <h2>{c.nameRu}</h2>
              {settings.showOriginal && (
                <small className="original">{c.nameOriginal}</small>
              )}
              <div className="card-footer">
                <span>Открыть подклассы</span>
                <ArrowUpRight size={17} />
              </div>
            </button>
          ))}
        </section>
      )}
      {!loading && !error && !visible.length && (
        <div className="empty-state">
          <h2>Классы не найдены</h2>
          <p>Попробуйте другое название.</p>
          <button
            className="button secondary"
            onClick={() => setClassQuery("")}
          >
            Сбросить поиск
          </button>
        </div>
      )}
    </>
  );
}
