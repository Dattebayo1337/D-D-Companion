import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Heart,
  Shield,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Monster, ReferenceEntry, EditionId } from "@/entities/content";
import type { CampaignRecord } from "@/entities/campaign";
import type { CharacterRecord } from "@/entities/character";
import {
  deathLabels,
  sideLabels,
  type BattleRecord,
  type Combatant,
} from "@/entities/battle";
import { requestJson } from "@/shared/client";
import type { BattleMutation } from "./Battles";
type Manual = Pick<
  Combatant,
  | "name"
  | "maxHp"
  | "hp"
  | "ac"
  | "initiative"
  | "initiativeMod"
  | "side"
  | "deathSaves"
  | "notes"
>;
const numeric = (value: string, min = 0, max = 1000000) =>
  Math.max(min, Math.min(max, Number(value) || 0));
export function BattleRoster({
  row,
  campaign,
  characters,
  mixed,
  mutate,
  open,
}: {
  row: BattleRecord;
  campaign?: CampaignRecord;
  characters: CharacterRecord[];
  mixed: boolean;
  mutate: BattleMutation;
  open: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [edition, setEdition] = useState<EditionId>(row.data.edition),
    [page, setPage] = useState(1),
    [cr, setCr] = useState(""),
    [count, setCount] = useState(1),
    [result, setResult] = useState<{ items: Monster[]; total: number }>({
      items: [],
      total: 0,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [character, setCharacter] = useState(""),
    [npc, setNpc] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        edition,
        q: query,
        page: String(page),
        pageSize: "6",
      });
      if (cr) params.set("cr", cr);
      requestJson<{ items: Monster[]; total: number }>(
        `/api/monsters?${params}`,
        { signal: controller.signal },
      )
        .then((r) => {
          setResult(r);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, edition, page, cr, retry]);
  const choices = characters.filter(
    (c) =>
      !c.archived &&
      (mixed || c.data.edition === row.data.edition) &&
      (!campaign || campaign.data.characterIds.includes(c.id)),
  );
  return (
    <details className="tool-panel battle-roster" open>
      <summary>Добавить участников</summary>
      <div className="battle-roster-grid">
        <section>
          <h3>Бестиарий</h3>
          <div className="tool-form-grid">
            <label>
              Поиск существа
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Гоблин, дракон…"
              />
            </label>
            <label>
              Опасность
              <select
                value={cr}
                onChange={(e) => {
                  setCr(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Любая</option>
                {[
                  0,
                  0.125,
                  0.25,
                  0.5,
                  ...Array.from({ length: 30 }, (_, i) => i + 1),
                ].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {mixed && (
              <label>
                Редакция существа
                <select
                  value={edition}
                  onChange={(e) => {
                    setEdition(e.target.value as EditionId);
                    setPage(1);
                  }}
                >
                  <option value="5e_2014">2014</option>
                  <option value="5e_2024">2024</option>
                </select>
              </label>
            )}
            <label>
              Количество
              <input
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(numeric(e.target.value, 1, 30))}
              />
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
              <button onClick={() => setRetry((n) => n + 1)}>Повторить</button>
            </p>
          )}
          {loading ? (
            <p role="status">Поиск существ…</p>
          ) : (
            <div className="battle-search-results">
              {result.items.map((m) => (
                <div key={m.id}>
                  <button className="quiet-button" onClick={() => open(m.id)}>
                    {m.nameRu}
                    <small>
                      КД {m.monster.armorClass} · {m.monster.hitPoints} хитов ·
                      ПО {m.monster.challengeRating}
                    </small>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Добавить ${m.nameRu}`}
                    onClick={() =>
                      mutate({
                        action: "add",
                        kind: "monster",
                        sourceId: m.id,
                        count,
                      })
                    }
                  >
                    <Plus size={17} />
                  </button>
                </div>
              ))}
              {!result.total && <p>Существа не найдены.</p>}
            </div>
          )}
          <div className="campaign-actions">
            <button
              className="quiet-button"
              disabled={page === 1}
              onClick={() => setPage((n) => n - 1)}
            >
              Назад
            </button>
            <small>
              {page} / {Math.max(1, Math.ceil(result.total / 6))}
            </small>
            <button
              className="quiet-button"
              disabled={page * 6 >= result.total}
              onClick={() => setPage((n) => n + 1)}
            >
              Далее
            </button>
          </div>
        </section>
        <section>
          <h3>Герои{campaign ? " кампании" : ""}</h3>
          <label>
            Персонаж
            <select
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
            >
              <option value="">Выберите героя</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.data.name} ·{" "}
                  {c.data.edition === "5e_2014" ? "2014" : "2024"}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            disabled={!character}
            onClick={() =>
              mutate({ action: "add", kind: "character", sourceId: character })
            }
          >
            Добавить героя
          </button>
          {!choices.length && (
            <p>
              Добавьте персонажей в группу кампании или создайте отдельный бой.
            </p>
          )}
          <h3>Персонаж мастера или свой участник</h3>
          {campaign && (
            <label>
              Персонажи мастера кампании
              <select value={npc} onChange={(e) => setNpc(e.target.value)}>
                <option value="">Свой участник</option>
                {campaign.data.entries
                  .filter((e) => e.kind === "npc" && !e.archived)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <ManualForm
            key={npc}
            initial={{
              name:
                campaign?.data.entries.find((e) => e.id === npc)?.name || "",
              maxHp: 10,
              hp: 10,
              ac: 10,
              initiative: 0,
              initiativeMod: 0,
              side: "ally",
              deathSaves: true,
              notes: "",
            }}
            preparing
            submitLabel="Добавить участника"
            save={async (manual) => {
              await mutate({
                action: "add",
                kind: npc ? "npc" : "manual",
                sourceId: npc || undefined,
                manual,
              });
            }}
          />
          <p className="muted">
            Для персонажей мастера и своих участников задайте боевые параметры
            вручную.
          </p>
        </section>
      </div>
    </details>
  );
}
export function ParticipantRow({
  participant: p,
  active,
  preparing,
  finished,
  conditions,
  mutate,
  open,
  edit,
}: {
  participant: Combatant;
  active: boolean;
  preparing: boolean;
  finished: boolean;
  conditions: ReferenceEntry[];
  mutate: BattleMutation;
  open: (id: string) => void;
  edit: () => void;
}) {
  const [amount, setAmount] = useState(1),
    [critical, setCritical] = useState(false);
  const command = (action: string, extra: Record<string, unknown> = {}) =>
    mutate({ action, participantId: p.id, ...extra });
  return (
    <article
      className={`battle-participant ${active ? "current" : ""} ${p.deathState === "dead" ? "fallen" : ""}`}
      aria-label={`Участник: ${p.name}`}
    >
      <header>
        <span className="battle-initiative" title="Инициатива">
          {p.initiative}
        </span>
        <div>
          <h3>
            {p.kind === "monster" && p.sourceId ? (
              <button onClick={() => open(p.sourceId!)}>{p.name}</button>
            ) : (
              p.name
            )}
          </h3>
          <small>
            {sideLabels[p.side]} · {p.edition === "5e_2014" ? "2014" : "2024"} ·{" "}
            {deathLabels[p.deathState]}
            {active ? " · ТЕКУЩИЙ ХОД" : ""}
          </small>
        </div>
        <span>
          <Shield size={17} /> {p.ac}
        </span>
        <span>
          <Heart size={17} /> {p.hp}/{p.maxHp}
          {p.tempHp ? ` + ${p.tempHp} врем.` : ""}
        </span>
      </header>
      <meter min={0} max={p.maxHp} value={p.hp} aria-label={`Хиты ${p.name}`} />
      <div className="battle-condition-tags">
        {p.conditions.map((c) => (
          <span key={c.id}>
            <button onClick={() => open(c.id)}>{c.name}</button>
            <button
              disabled={finished}
              aria-label={`Снять ${c.name} у ${p.name}`}
              onClick={() =>
                command("condition", { conditionId: c.id, enabled: false })
              }
            >
              ×
            </button>
          </span>
        ))}
        {p.concentration && <span>Концентрация: {p.concentration}</span>}
      </div>
      <details>
        <summary>Управление участником</summary>
        <fieldset className="campaign-fieldset" disabled={finished}>
          <div className="battle-hp-controls">
            <label>
              Значение
              <input
                type="number"
                min={0}
                max={1000000}
                value={amount}
                onChange={(e) => setAmount(numeric(e.target.value))}
              />
            </label>
            <button
              className="button secondary"
              onClick={() => command("damage", { amount, critical })}
            >
              Урон
            </button>
            <button
              className="button secondary"
              onClick={() => command("heal", { amount })}
            >
              Лечение
            </button>
            <button
              className="button secondary"
              onClick={() => command("tempHp", { amount })}
            >
              Заменить временные хиты
            </button>
          </div>
          <label className="campaign-archive">
            <input
              type="checkbox"
              checked={critical}
              onChange={(e) => setCritical(e.target.checked)}
            />
            Критическое попадание — урон введите итоговый
          </label>
          {p.concentrationDC && (
            <div className="tool-notice">
              Проверка концентрации: спасбросок Телосложения, СЛ{" "}
              {p.concentrationDC}.
              <div className="campaign-actions">
                <button
                  className="button secondary"
                  onClick={() => command("concentrationPass")}
                >
                  Успех
                </button>
                <button
                  className="button secondary"
                  onClick={() => command("concentrationFail")}
                >
                  Провал
                </button>
              </div>
            </div>
          )}
          <div className="battle-roster-grid">
            <label>
              Добавить состояние
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    void command("condition", {
                      conditionId: e.target.value,
                      enabled: true,
                    });
                }}
              >
                <option value="">Выберите состояние</option>
                {conditions
                  .filter((c) => !p.conditions.some((v) => v.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameRu}
                    </option>
                  ))}
              </select>
            </label>
            <form
              key={p.concentration}
              className="battle-concentration"
              onSubmit={(e) => {
                e.preventDefault();
                void command("concentration", {
                  text: String(
                    new FormData(e.currentTarget).get("concentration"),
                  ),
                });
              }}
            >
              <label>
                Концентрация
                <input
                  name="concentration"
                  maxLength={200}
                  defaultValue={p.concentration}
                  placeholder="Название эффекта"
                />
              </label>
              <button className="quiet-button">Применить</button>
              <button
                type="button"
                className="quiet-button"
                onClick={() => command("concentrationFail")}
              >
                Снять
              </button>
            </form>
          </div>
          {p.hp === 0 && (
            <div className="battle-death">
              <strong>{deathLabels[p.deathState]}</strong>
              {p.deathSaves && (
                <span>
                  Спасброски: {p.success} успехов / {p.failure} провалов
                </span>
              )}
              <div className="campaign-actions">
                {p.deathState === "dying" && p.deathSaves && (
                  <button
                    className="button secondary"
                    onClick={() => command("deathSave")}
                  >
                    Спасбросок от смерти
                  </button>
                )}
                {p.deathState !== "dead" && (
                  <>
                    <button
                      className="quiet-button"
                      onClick={() => command("stabilize")}
                    >
                      Стабилизировать
                    </button>
                    <button
                      className="quiet-button"
                      onClick={() => command("markDead")}
                    >
                      Отметить погибшим
                    </button>
                  </>
                )}
                {p.deathState === "dead" && (
                  <button
                    className="quiet-button"
                    disabled={amount < 1}
                    onClick={() => command("revive", { amount })}
                  >
                    Воскресить с указанными хитами
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="campaign-actions">
            <button className="quiet-button" onClick={edit}>
              Правка параметров
            </button>
            {preparing && (
              <>
                <button
                  className="icon-button"
                  aria-label={`Выше: ${p.name}`}
                  onClick={() => command("reorder", { direction: "up" })}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Ниже: ${p.name}`}
                  onClick={() => command("reorder", { direction: "down" })}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="quiet-button"
                  onClick={() => command("remove")}
                >
                  <Trash2 size={15} />
                  Убрать из боя
                </button>
              </>
            )}
          </div>
          {p.notes && <p className="prose">{p.notes}</p>}
        </fieldset>
      </details>
    </article>
  );
}
function ManualForm({
  initial,
  preparing,
  save,
  submitLabel,
}: {
  initial: Manual;
  preparing: boolean;
  save: (data: Manual) => Promise<void>;
  submitLabel: string;
}) {
  const [value, setValue] = useState(initial),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (value.hp > value.maxHp) {
          setError("Хиты не могут превышать максимум.");
          return;
        }
        setError("");
        await save(value);
      }}
    >
      <div className="campaign-form">
        <label className="campaign-wide">
          Имя участника
          <input
            required
            maxLength={160}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        {(
          [
            ["maxHp", "Максимум хитов", 1, 1000000],
            ["hp", "Текущие хиты", 0, 1000000],
            ["ac", "Класс доспеха", 0, 100],
            ["initiative", "Инициатива", -100, 100],
            ["initiativeMod", "Модификатор инициативы", -50, 50],
          ] as const
        ).map(([key, label, min, max]) => (
          <label key={key}>
            {label}
            <input
              disabled={
                !preparing && (key === "initiative" || key === "initiativeMod")
              }
              type="number"
              min={min}
              max={max}
              value={value[key]}
              onChange={(e) =>
                setValue({ ...value, [key]: numeric(e.target.value, min, max) })
              }
            />
          </label>
        ))}
        <label>
          Сторона
          <select
            value={value.side}
            onChange={(e) =>
              setValue({ ...value, side: e.target.value as Manual["side"] })
            }
          >
            {Object.entries(sideLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="campaign-wide">
          Заметки
          <textarea
            maxLength={4000}
            rows={2}
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
      </div>
      <label className="campaign-archive">
        <input
          type="checkbox"
          checked={value.deathSaves}
          onChange={(e) => setValue({ ...value, deathSaves: e.target.checked })}
        />
        Спасброски от смерти при 0 хитах
      </label>
      <p className="muted">
        Без спасбросков участник погибает при 0 хитах. Правка хитов вручную
        также обновит состояние жизни.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button secondary">{submitLabel}</button>
    </form>
  );
}
export function ParticipantEditor({
  participant: p,
  preparing,
  close,
  save,
  busy,
  error,
}: {
  participant: Combatant;
  preparing: boolean;
  close: () => void;
  save: (data: Manual) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const outside = useRef(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="detail-dialog campaign-dialog"
      onCancel={close}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        outside.current =
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom;
      }}
      onClick={(e) => {
        if (outside.current && e.target === e.currentTarget) close();
        outside.current = false;
      }}
      aria-label="Параметры участника"
    >
      <article>
        <header>
          <h2>Параметры участника</h2>
          <button
            className="icon-button"
            aria-label="Закрыть параметры"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <fieldset className="campaign-fieldset" disabled={busy}>
          <ManualForm
            initial={{
              name: p.name,
              hp: p.hp,
              maxHp: p.maxHp,
              ac: p.ac,
              initiative: p.initiative,
              initiativeMod: p.initiativeMod,
              side: p.side,
              deathSaves: p.deathSaves,
              notes: p.notes,
            }}
            preparing={preparing}
            save={save}
            submitLabel="Сохранить параметры"
          />
        </fieldset>
      </article>
    </dialog>
  );
}
