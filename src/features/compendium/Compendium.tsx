import Link from "next/link";
import { MonsterEditor } from "../monsters/MonsterEditor";
import { isPersonalMonster } from "@/entities/custom-monster";
import type { EditionId, Monster } from "@/entities/content";
import { EntryIcon } from "./EntrySummary";
import { contentSummary } from "@/domain/content-summary";
import { referenceLabels } from "@/localization/reference";
import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import type { Content, SourceBook } from "@/entities/content";
import {
  schoolLabels,
  damageLabels,
  typeLabels,
  sizeLabels,
  castingLabels,
  originLabels,
  abilityLabels,
} from "@/localization/labels";
import { requestJson } from "@/shared/client";
import type { Settings } from "../shell/types";
import { Detail } from "./Detail";
type Result = {
  items: Content[];
  total: number;
  page: number;
  pageSize: number;
};
export function Compendium({
  kind,
  category,
  edition,
  query,
  localQuery,
  onQueryChange,
  sources,
  settings,
  parentId,
  className,
  signedIn = false,
}: {
  kind?: "Spell" | "Monster" | "Reference";
  category?: keyof typeof referenceLabels;
  edition: string;
  query: string;
  localQuery: string;
  onQueryChange: (value: string) => void;
  sources: SourceBook[];
  settings: Settings;
  parentId?: string;
  className?: string;
  signedIn?: boolean;
}) {
  const setQuery = onQueryChange;
  const [editor, setEditor] = useState<{
    initial?: Monster;
    copy?: boolean;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Content | null>(null);
  const filterString = JSON.stringify(filters);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query || localQuery,
        page: String(page),
        ...JSON.parse(filterString),
      });
      for (const [key, value] of [...params]) {
        if (!value.trim()) params.delete(key);
      }
      if (kind) params.set("kind", kind);
      if (category) params.set("category", category);
      if (edition) params.set("edition", edition);
      if (parentId) params.set("parentId", parentId);
      setLoading(true);
      setError("");
      requestJson<Result>(`/api/content?${params}`, {
        signal: controller.signal,
      })
        .then(setResult)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    kind,
    category,
    edition,
    query,
    localQuery,
    page,
    filterString,
    parentId,
    revision,
  ]);
  const setFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    setPage(1);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">БИБЛИОТЕКА ПРИКЛЮЧЕНИЙ</p>
          <h1>
            {className
              ? `Подклассы: ${className}`
              : kind === "Spell"
                ? "Книга заклинаний"
                : kind === "Monster"
                  ? "Бестиарий"
                  : category
                    ? referenceLabels[category]
                    : "Поиск по библиотеке"}
          </h1>
          <p>
            {className
              ? "Выберите специализацию, чтобы открыть её особенности и источник."
              : kind === "Spell"
                ? "Нужное заклинание для каждого поворота истории."
                : kind === "Monster"
                  ? "Познакомьтесь с обитателями вашего мира."
                  : category
                    ? "Правила и возможности персонажа. Выберите редакцию и откройте статью."
                    : `Результаты по запросу «${query}»`}
          </p>
        </div>
        {kind === "Monster" ? (
          signedIn ? (
            <button className="button primary" onClick={() => setEditor({})}>
              Создать монстра
            </button>
          ) : (
            <Link className="button primary" href="/login">
              Войти и создать монстра
            </Link>
          )
        ) : (
          <BookOpen size={30} strokeWidth={1} />
        )}
      </div>
      <div className="filter-panel">
        <div className="filter-search">
          <Search size={18} />
          <input
            aria-label="Поиск в разделе"
            placeholder="Название, перевод или псевдоним…"
            value={localQuery}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            disabled={!!query}
          />
        </div>
        <div className="filter-row">
          <SlidersHorizontal size={17} />
          {kind === "Monster" && signedIn && (
            <Select
              label="Весь бестиарий"
              value={filters.scope}
              onChange={(v) => setFilter("scope", v)}
              options={{
                mine: "Мои монстры",
                public: "Общая библиотека",
                archived: "Архив моих монстров",
              }}
            />
          )}
          {kind === "Spell" && (
            <>
              <input
                aria-label="Класс заклинания"
                placeholder="Класс: например, Бард"
                value={filters.spellClass ?? ""}
                onChange={(e) => setFilter("spellClass", e.target.value)}
              />
              <input
                aria-label="Подкласс заклинания"
                placeholder="Подкласс из данных заклинания"
                value={filters.subclass ?? ""}
                onChange={(e) => setFilter("subclass", e.target.value)}
              />
              <Select
                label="Время накладывания"
                value={filters.castingTime}
                onChange={(v) => setFilter("castingTime", v)}
                options={castingLabels}
              />
              <Select
                label="Тип урона"
                value={filters.damageType}
                onChange={(v) => setFilter("damageType", v)}
                options={damageLabels}
              />
              <Select
                label="Спасбросок"
                value={filters.savingThrow}
                onChange={(v) => setFilter("savingThrow", v)}
                options={abilityLabels}
              />
              <Select
                label="Атака заклинанием"
                value={filters.attackType}
                onChange={(v) => setFilter("attackType", v)}
                options={{ Melee: "Рукопашная", Ranged: "Дальнобойная" }}
              />
              <Select
                label="Дальность"
                value={filters.rangeKind}
                onChange={(v) => setFilter("rangeKind", v)}
                options={{
                  Distance: "В футах",
                  Self: "На себя",
                  Touch: "Касание",
                  Sight: "Видимость",
                  Unlimited: "Неограниченная",
                  Special: "Особая",
                }}
              />
              <input
                type="number"
                min="0"
                max="10000000"
                aria-label="Минимальная дальность в футах"
                placeholder="Дальность от, футы"
                value={filters.minRange ?? ""}
                onChange={(e) => setFilter("minRange", e.target.value)}
              />
              <Select
                label="Уровень"
                value={filters.level}
                onChange={(v) => setFilter("level", v)}
                options={Object.fromEntries(
                  Array.from({ length: 10 }, (_, i) => [
                    String(i),
                    i === 0 ? "Заговор" : `${i}-й уровень`,
                  ]),
                )}
              />
              <Select
                label="Школа"
                value={filters.school}
                onChange={(v) => setFilter("school", v)}
                options={schoolLabels}
              />
              <Select
                label="Ритуал"
                value={filters.ritual}
                onChange={(v) => setFilter("ritual", v)}
                options={{ true: "Ритуальные", false: "Не ритуальные" }}
              />
              <Select
                label="Концентрация"
                value={filters.concentration}
                onChange={(v) => setFilter("concentration", v)}
                options={{ true: "С концентрацией", false: "Без концентрации" }}
              />
            </>
          )}
          {kind === "Monster" && (
            <>
              <input
                aria-label="Окружение существа"
                placeholder="Окружение: например, лес"
                value={filters.environment ?? ""}
                onChange={(e) => setFilter("environment", e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="10000000"
                aria-label="Минимальная скорость в футах"
                placeholder="Скорость от, футы"
                value={filters.minSpeed ?? ""}
                onChange={(e) => setFilter("minSpeed", e.target.value)}
              />
              <Select
                label="Тип существа"
                value={filters.type}
                onChange={(v) => setFilter("type", v)}
                options={typeLabels}
              />
              <Select
                label="Размер"
                value={filters.size}
                onChange={(v) => setFilter("size", v)}
                options={sizeLabels}
              />
              <Select
                label="Перемещение"
                value={filters.movement}
                onChange={(v) => setFilter("movement", v)}
                options={{
                  walk: "Ходьба",
                  fly: "Полёт",
                  swim: "Плавание",
                  climb: "Лазание",
                  burrow: "Копание",
                }}
              />
              <Select
                label="Сопротивление"
                value={filters.resistance}
                onChange={(v) => setFilter("resistance", v)}
                options={damageLabels}
              />
              <Select
                label="Иммунитет"
                value={filters.immunity}
                onChange={(v) => setFilter("immunity", v)}
                options={damageLabels}
              />
              <Select
                label="Легендарные действия"
                value={filters.legendary}
                onChange={(v) => setFilter("legendary", v)}
                options={{ true: "Есть", false: "Нет" }}
              />
              <Select
                label="Заклинатель"
                value={filters.spellcaster}
                onChange={(v) => setFilter("spellcaster", v)}
                options={{
                  true: "Использует заклинания",
                  false: "Без заклинаний",
                }}
              />
              <Select
                label="Чувства"
                value={filters.sense}
                onChange={(v) => setFilter("sense", v)}
                options={{
                  darkvision: "Тёмное зрение",
                  blindsight: "Слепое зрение",
                  tremorsense: "Чувство вибрации",
                  truesight: "Истинное зрение",
                }}
              />
              <Select
                label="Опасность"
                value={filters.cr}
                onChange={(v) => setFilter("cr", v)}
                options={Object.fromEntries(
                  [
                    0,
                    0.125,
                    0.25,
                    0.5,
                    ...Array.from({ length: 30 }, (_, i) => i + 1),
                  ].map((n) => [String(n), String(n)]),
                )}
              />
            </>
          )}
          <Select
            label="Источник"
            value={filters.sourceBookId}
            onChange={(v) => setFilter("sourceBookId", v)}
            options={Object.fromEntries(
              sources
                .filter((s) => !edition || s.edition === edition)
                .map((s) => [s.id, s.fullNameRu]),
            )}
          />
          <button
            className="quiet-button"
            onClick={() => {
              setFilters({});
              setQuery("");
              setPage(1);
            }}
          >
            Сбросить
          </button>
        </div>
      </div>
      <div className="results-heading">
        <span>
          {loading ? "Поиск…" : `Найдено записей: ${result?.total ?? 0}`}
        </span>
        <small>
          {kind === "Monster" && signedIn
            ? "Сначала ваши существа, затем общая библиотека"
            : "Только утверждённые переводы"}
        </small>
      </div>
      {(kind === "Spell" || kind === "Monster") && (
        <p className="detail-content-note">
          Фильтры используют заполненные поля справочника. Если правило есть
          только в тексте, запись может не попасть в выборку. Класс и подкласс
          указывайте полным названием; дальность и скорость — в футах.
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && !result?.total && (
        <div className="empty-state">
          <BookOpen size={40} strokeWidth={1} />
          <h2>Здесь пока чистая страница</h2>
          <p>
            Измените фильтры или загрузите разрешённый набор
            <br />в разделе «Менеджер данных».
          </p>
        </div>
      )}
      {(["Spell", "Monster", "Reference"] as const)
        .filter((k) => !kind || kind === k)
        .map((group) => {
          const items = result?.items.filter((i) => i.kind === group) ?? [];
          return items.length ? (
            <section key={group}>
              {!kind && (
                <h2 className="group-title">
                  {group === "Spell"
                    ? "Заклинания"
                    : group === "Monster"
                      ? "Существа"
                      : "Справочники"}
                </h2>
              )}
              <div className="content-grid" aria-busy={loading}>
                {items.map((entry) => (
                  <button
                    key={entry.id}
                    className="content-card"
                    onClick={() => setSelected(entry)}
                  >
                    <div className="card-top">
                      <span
                        className={`entity-icon ${entry.kind.toLowerCase()}`}
                      >
                        <EntryIcon entry={entry} size={22} />
                      </span>
                      <span className="badge">
                        {entry.edition === "5e_2014" ? "2014" : "2024"}
                      </span>
                    </div>
                    <h3>{entry.nameRu}</h3>
                    {settings.showOriginal && (
                      <small className="original">{entry.nameOriginal}</small>
                    )}
                    <div className="card-subtitle">
                      {entry.kind === "Spell"
                        ? `${entry.spell.level === 0 ? "Заговор" : `${entry.spell.level}-й уровень`} · ${schoolLabels[entry.spell.school]}`
                        : entry.kind === "Reference"
                          ? referenceLabels[entry.reference.category]
                          : `${sizeLabels[entry.monster.size]} · ${typeLabels[entry.monster.type]}`}
                    </div>
                    <p>{contentSummary(entry).text}</p>
                    <div className="card-footer">
                      <span>
                        {entry.kind === "Spell"
                          ? castingLabels[entry.spell.castingTime]
                          : entry.kind === "Reference"
                            ? "Читать статью"
                            : `Опасность ${entry.monster.challengeRating}`}
                      </span>
                      <ArrowUpRight size={17} />
                    </div>
                    <small className="origin-label">
                      {isPersonalMonster(entry)
                        ? entry.personalArchived
                          ? "Мой монстр · архив"
                          : "Мой монстр"
                        : originLabels[entry.contentOrigin]}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          ) : null;
        })}
      {(result?.total ?? 0) > 18 && (
        <div className="pagination">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Назад
          </button>
          <span>
            Страница {page} из {Math.ceil((result?.total ?? 0) / 18)}
          </span>
          <button
            className="button secondary"
            disabled={page * 18 >= (result?.total ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            Далее
          </button>
        </div>
      )}
      {selected && (
        <Detail
          entry={selected}
          sources={sources}
          settings={settings}
          close={() => setSelected(null)}
          open={setSelected}
          editMonster={
            signedIn
              ? (entry) => {
                  setSelected(null);
                  setEditor({ initial: entry });
                }
              : undefined
          }
          copyMonster={
            signedIn
              ? (entry) => {
                  setSelected(null);
                  setEditor({ initial: entry, copy: true });
                }
              : undefined
          }
        />
      )}
      {editor && (
        <MonsterEditor
          initial={editor.initial}
          copy={editor.copy}
          edition={edition as EditionId}
          sources={sources}
          settings={settings}
          close={() => setEditor(null)}
          saved={(entry) => {
            setEditor(null);
            setSelected(entry.personalArchived ? null : entry);
            setRevision((v) => v + 1);
            setPage(1);
          }}
        />
      )}
    </>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {Object.entries(options).map(([k, v]) => (
        <option value={k} key={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
