import { useEffect, useState } from "react";
import { Swords, Plus, Trash2 } from "lucide-react";
import type { EditionId, Monster, SourceBook } from "@/entities/content";
import { creatureTypes } from "@/entities/content";
import { typeLabels } from "@/localization/labels";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
import { battlePost } from "../battles/Battles";
import {
  calculateEncounter,
  encounterSchema,
  encounterLabels,
  type EncounterDraft,
} from "@/domain/rules/dm-tools";
import {
  useToolDraft,
  ToolEntry,
  numberText as n,
  downloadText,
} from "./shared";
const initial: EncounterDraft = {
  party: [{ level: 1, count: 4 }],
  opponents: [],
  target: 1,
};
const crs = [
  0,
  0.125,
  0.25,
  0.5,
  ...Array.from({ length: 30 }, (_, i) => i + 1),
];
const crText = (cr: number) =>
  ({ 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" })[cr] ?? String(cr);
export function Encounter({
  edition,
  sources,
  settings,
  openBattles,
}: {
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
  openBattles: () => void;
}) {
  const {
    value: draft,
    setValue,
    ready,
    storageError,
  } = useToolDraft(`companion-encounter-${edition}`, encounterSchema, initial);
  const [q, setQ] = useState("");
  const [savingBattle, setSavingBattle] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [cr, setCr] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ items: Monster[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const valid = encounterSchema.safeParse(draft);
  const mixed = draft.opponents.some((m) => m.edition !== edition);
  const calc =
    valid.success && !mixed ? calculateEncounter(edition, draft) : null;
  const labels = encounterLabels(edition);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        edition,
        q,
        page: String(page),
        pageSize: "8",
      });
      if (cr) params.set("cr", cr);
      if (type) params.set("type", type);
      if (source) params.set("sourceBookId", source);
      requestJson<{ items: Monster[]; total: number }>(
        `/api/monsters?${params}`,
        { signal: controller.signal },
      )
        .then((r) => {
          if (!controller.signal.aborted) setResult(r);
        })
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
  }, [edition, q, cr, type, source, page, retry]);
  function add(monster: Monster) {
    setValue((d) => {
      const exists = d.opponents.find((m) => m.id === monster.id);
      return {
        ...d,
        opponents: exists
          ? d.opponents.map((m) =>
              m.id === monster.id
                ? { ...m, count: Math.min(99, m.count + 1) }
                : m,
            )
          : [
              ...d.opponents,
              {
                id: monster.id,
                name: monster.nameRu,
                edition: monster.edition,
                xp: monster.monster.xp,
                cr: monster.monster.challengeRating,
                count: 1,
                multiplier: true,
              },
            ],
      };
    });
  }
  function exportEncounter() {
    if (!calc) return;
    downloadText(
      `Бой-${edition.slice(3)}.txt`,
      [
        `Бой · правила ${edition.slice(3)}`,
        `Группа: ${draft.party.map((p) => `${p.count} × уровень ${p.level}`).join(", ")}`,
        ...draft.opponents.map(
          (m) =>
            `${m.name} × ${m.count} · ПО ${crText(m.cr)} · ${m.xp} ОП за каждого${edition === "5e_2014" && !m.multiplier ? " · не влияет на множитель" : ""}`,
        ),
        calc.difficulty,
        `Опыт: ${calc.raw}; для сложности: ${calc.adjusted}; множитель: ${calc.multiplier}`,
        `На персонажа: ${n(calc.xpEach)} ОП`,
      ].join("\n"),
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ИНСТРУМЕНТЫ МАСТЕРА · {edition.slice(3)}</p>
          <h1>Калькулятор боя</h1>
          <p>Соберите группу и выберите противников из своего бестиария.</p>
        </div>
        <Swords size={30} strokeWidth={1} />
      </div>
      {storageError && (
        <p className="tool-notice" role="status">
          {storageError}
        </p>
      )}
      {saveError && (
        <p className="error" role="alert">
          {saveError}
        </p>
      )}
      <button
        className="button secondary"
        disabled={!ready || !calc || !draft.opponents.length || savingBattle}
        onClick={async () => {
          setSavingBattle(true);
          setSaveError("");
          try {
            await battlePost({
              action: "create",
              name: `Столкновение ${new Date().toLocaleDateString("ru-RU")}`,
              edition,
              opponents: draft.opponents.map((m) => ({
                id: m.id,
                count: m.count,
              })),
              text: `План группы: ${draft.party.map((p) => `${p.count} × уровень ${p.level}`).join(", ")}. Добавьте героев из листов персонажей перед началом боя.`,
            });
            openBattles();
          } catch (e) {
            setSaveError((e as Error).message);
          } finally {
            setSavingBattle(false);
          }
        }}
      >
        {savingBattle ? "Сохранение…" : "Сохранить противников как бой"}
      </button>
      {!ready ? (
        <p role="status">Загрузка черновика…</p>
      ) : (
        <div className="tools-layout">
          <div className="tools-main">
            <section className="tool-panel">
              <h2>Группа приключенцев</h2>
              <p className="tool-muted">
                Можно объединить персонажей одного уровня в строку. До 20
                персонажей.
              </p>
              {draft.party.map((p, i) => (
                <div className="tool-party-row" key={i}>
                  <label>
                    Уровень
                    <select
                      aria-label={`Уровень группы ${i + 1}`}
                      value={p.level}
                      onChange={(e) =>
                        setValue((d) => ({
                          ...d,
                          party: d.party.map((r, j) =>
                            i === j
                              ? { ...r, level: Number(e.target.value) }
                              : r,
                          ),
                        }))
                      }
                    >
                      {Array.from({ length: 20 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Персонажей
                    <input
                      type="number"
                      min={1}
                      max={20}
                      aria-label={`Персонажей в группе ${i + 1}`}
                      value={p.count}
                      onChange={(e) =>
                        setValue((d) => ({
                          ...d,
                          party: d.party.map((r, j) =>
                            i === j
                              ? {
                                  ...r,
                                  count: Math.max(
                                    1,
                                    Math.min(
                                      20,
                                      Math.trunc(Number(e.target.value) || 1),
                                    ),
                                  ),
                                }
                              : r,
                          ),
                        }))
                      }
                    />
                  </label>
                  <button
                    className="icon-button"
                    aria-label={`Удалить группу ${i + 1}`}
                    onClick={() =>
                      setValue((d) => ({
                        ...d,
                        party: d.party.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button
                className="button secondary"
                disabled={draft.party.reduce((s, p) => s + p.count, 0) >= 20}
                onClick={() =>
                  setValue((d) => ({
                    ...d,
                    party: [...d.party, { level: 1, count: 1 }],
                  }))
                }
              >
                <Plus size={16} />
                Добавить уровень
              </button>
            </section>
            <section className="tool-panel">
              <h2>Противники в бою</h2>
              {!draft.opponents.length && (
                <p className="tool-muted">
                  Пока никого. Добавьте существ из списка ниже.
                </p>
              )}
              {draft.opponents.map((m) => (
                <div className="tool-enemy" key={m.id}>
                  <div>
                    <button
                      className="tool-link"
                      onClick={() => setOpened(m.id)}
                    >
                      {m.name}
                    </button>
                    <p className="tool-muted">
                      ПО {crText(m.cr)} · {n(m.xp)} ОП · всего{" "}
                      {n(m.xp * m.count)} ОП
                    </p>
                    {edition === "5e_2014" && (
                      <label className="tool-check">
                        <input
                          type="checkbox"
                          checked={m.multiplier}
                          onChange={(e) =>
                            setValue((d) => ({
                              ...d,
                              opponents: d.opponents.map((r) =>
                                r.id === m.id
                                  ? { ...r, multiplier: e.target.checked }
                                  : r,
                              ),
                            }))
                          }
                        />
                        Учитывать в множителе
                      </label>
                    )}
                  </div>
                  <label className="tool-quantity">
                    Количество
                    <input
                      type="number"
                      aria-label={`Количество: ${m.name}`}
                      min={1}
                      max={99}
                      value={m.count}
                      onChange={(e) =>
                        setValue((d) => ({
                          ...d,
                          opponents: d.opponents.map((r) =>
                            r.id === m.id
                              ? {
                                  ...r,
                                  count: Math.max(
                                    1,
                                    Math.min(
                                      99,
                                      Math.trunc(Number(e.target.value) || 1),
                                    ),
                                  ),
                                }
                              : r,
                          ),
                        }))
                      }
                    />
                  </label>
                  <button
                    className="icon-button"
                    aria-label={`Убрать: ${m.name}`}
                    onClick={() =>
                      setValue((d) => ({
                        ...d,
                        opponents: d.opponents.filter((r) => r.id !== m.id),
                      }))
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              {edition === "5e_2014" && (
                <p className="tool-muted">
                  Слабых помощников можно исключить из числа существ для
                  множителя. Их опыт остаётся в общей сумме.
                </p>
              )}
            </section>
            <section className="tool-panel">
              <h2>Добавить из бестиария</h2>
              <div className="tool-filters">
                <label>
                  Поиск
                  <input
                    aria-label="Поиск противников"
                    placeholder="Имя или псевдоним…"
                    value={q}
                    maxLength={200}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  Показатель опасности
                  <select
                    aria-label="ПО противника"
                    value={cr}
                    onChange={(e) => {
                      setCr(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Любой</option>
                    {crs.map((c) => (
                      <option key={c} value={c}>
                        {crText(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Тип
                  <select
                    aria-label="Тип противника"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Любой</option>
                    {creatureTypes.map((t) => (
                      <option key={t} value={t}>
                        {typeLabels[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Источник
                  <select
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Все источники</option>
                    {sources
                      .filter((s) => s.edition === edition)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullNameRu}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {loading ? (
                <p role="status">Поиск существ…</p>
              ) : error ? (
                <p role="alert">
                  {error}
                  <button
                    className="quiet-button"
                    onClick={() => setRetry((x) => x + 1)}
                  >
                    Повторить
                  </button>
                </p>
              ) : (
                <>
                  <p className="tool-muted">Найдено: {n(result.total)}</p>
                  {!result.items.length && (
                    <p>Ничего не найдено. Попробуйте другое имя или фильтры.</p>
                  )}
                  {result.items.map((m) => (
                    <div className="tool-search-result" key={m.id}>
                      <div>
                        <button
                          className="tool-link"
                          onClick={() => setOpened(m.id)}
                        >
                          {m.nameRu}
                        </button>
                        <p className="tool-muted">
                          ПО {crText(m.monster.challengeRating)} ·{" "}
                          {n(m.monster.xp)} ОП · {typeLabels[m.monster.type]}
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        aria-label={`Добавить: ${m.nameRu}`}
                        disabled={
                          (draft.opponents.length >= 50 &&
                            !draft.opponents.some((e) => e.id === m.id)) ||
                          draft.opponents.some(
                            (e) => e.id === m.id && e.count >= 99,
                          )
                        }
                        onClick={() => add(m)}
                      >
                        <Plus size={16} />В бой
                      </button>
                    </div>
                  ))}
                  {result.total > 8 && (
                    <div className="button-row">
                      <button
                        className="button secondary"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Назад
                      </button>
                      <span>
                        {page} / {Math.ceil(result.total / 8)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={page * 8 >= result.total}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Далее
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
          <aside
            className="tool-panel tool-summary"
            aria-label="Расчёт сложности"
          >
            <p className="eyebrow">ОЦЕНКА СТОЛКНОВЕНИЯ</p>
            {!calc ? (
              <p role="alert">
                {mixed
                  ? "В черновике смешаны редакции. Удалите неподходящих противников."
                  : "В группе должно быть не больше 20 персонажей."}
              </p>
            ) : (
              <>
                <h2 aria-live="polite">{calc.difficulty}</h2>
                <p className="tool-muted">
                  {calc.players} персонажей · {calc.monsters} противников
                </p>
                <dl className="tool-totals">
                  <div>
                    <dt>Опыт противников</dt>
                    <dd>{n(calc.raw)} ОП</dd>
                  </div>
                  <div>
                    <dt>Для сложности</dt>
                    <dd>{n(calc.adjusted)} ОП</dd>
                  </div>
                  <div>
                    <dt>Множитель</dt>
                    <dd>× {n(calc.multiplier)}</dd>
                  </div>
                  <div>
                    <dt>На персонажа</dt>
                    <dd>{n(calc.xpEach)} ОП</dd>
                  </div>
                </dl>
                <label>
                  Целевая сложность
                  <select
                    aria-label="Целевая сложность"
                    value={Math.min(draft.target, labels.length - 1)}
                    onChange={(e) =>
                      setValue((d) => ({
                        ...d,
                        target: Number(e.target.value),
                      }))
                    }
                  >
                    {labels.map((s, i) => (
                      <option key={s} value={i}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="tool-budget">
                  {calc.remaining >= 0
                    ? "Осталось в бюджете"
                    : "Превышение бюджета"}
                  : <strong>{n(Math.abs(calc.remaining))} ОП</strong>
                </p>
                <div className="tool-budget-table">
                  {labels.map((label, i) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{n(calc.budgets[i])} ОП</strong>
                    </div>
                  ))}
                </div>
                <p className="tool-muted">
                  {edition === "5e_2014"
                    ? "Сложность определяется по достигнутому порогу с учётом множителя. Награда опытом считается без множителя."
                    : "Показан наименьший бюджет, в который помещается бой. За количество существ множитель не применяется."}
                </p>
                {calc.overlevel && (
                  <p className="tool-notice">
                    ПО одного из врагов выше среднего уровня группы: отдельная
                    атака может оказаться особенно опасной.
                  </p>
                )}
                <button
                  className="button secondary"
                  disabled={!calc.players || !calc.monsters}
                  onClick={exportEncounter}
                >
                  Скачать расчёт
                </button>
              </>
            )}
            <p className="tool-muted">
              Оценка не учитывает местность, внезапность, тактику и оставшиеся
              ресурсы группы.
            </p>
            <a
              className="tool-link"
              target="_blank"
              rel="noreferrer"
              href={
                edition === "5e_2014"
                  ? "https://www.dndbeyond.com/sources/dnd/basic-rules-2014/building-combat-encounters"
                  : "https://www.dndbeyond.com/sources/dnd/br-2024/dms-toolbox"
              }
            >
              Правила расчёта ↗
            </a>
          </aside>
        </div>
      )}
      {opened && (
        <ToolEntry
          key={opened}
          id={opened}
          sources={sources}
          settings={settings}
          close={() => setOpened(null)}
        />
      )}
    </>
  );
}
