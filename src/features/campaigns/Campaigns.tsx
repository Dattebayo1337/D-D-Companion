"use client";
import { CampaignSearch } from "./CampaignSearch";
import { SessionDesk } from "./SessionDesk";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  Map,
  Users,
  ScrollText,
  MapPin,
  BookOpen,
  Plus,
  ArrowLeft,
  Archive,
  Download,
  Save,
  X,
} from "lucide-react";
import {
  campaignSchema,
  campaignEntrySchema,
  campaignFields,
  campaignKinds,
  campaignLabels,
  emptyCampaign,
  type CampaignData,
  type CampaignEntry,
  type CampaignKind,
  type CampaignRecord,
} from "@/entities/campaign";
import type { CharacterRecord } from "@/entities/character";
import type { EditionId } from "@/entities/content";
import { requestJson } from "@/shared/client";
import { downloadText, useToolDraft } from "../tools/shared";
type Tab = "overview" | CampaignKind | "live";
const icons = {
  npc: Users,
  location: MapPin,
  quest: ScrollText,
  session: BookOpen,
};
const draftSchema = z.object({
  version: z.number().int().positive(),
  data: campaignSchema.innerType().extend({ name: z.string().max(160) }),
});
function post(body: unknown) {
  return requestJson<CampaignRecord>("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const modeLabel = (mode: string) =>
  mode === "Mixed" ? "Смешанная" : mode === "5e_2014" ? "2014" : "2024";

export function Campaigns({
  initialCampaignId = null,
  edition,
  initialTab = "overview",
  openBattles,
}: {
  initialCampaignId?: string | null;
  edition: EditionId;
  initialTab?: Tab;
  openBattles: (campaignId: string, edition?: EditionId) => void;
}) {
  const [rows, setRows] = useState<CampaignRecord[]>([]),
    [characters, setCharacters] = useState<CharacterRecord[]>([]),
    [selected, setSelected] = useState<string | null>(initialCampaignId);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [archive, setArchive] = useState(false),
    [query, setQuery] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      requestJson<CampaignRecord[]>("/api/campaigns", {
        signal: controller.signal,
      }),
      requestJson<CharacterRecord[]>("/api/characters?edition=5e_2014", {
        signal: controller.signal,
      }),
      requestJson<CharacterRecord[]>("/api/characters?edition=5e_2024", {
        signal: controller.signal,
      }),
    ])
      .then(([r, a, b]) => {
        setRows(r);
        setCharacters([...a, ...b]);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision]);
  function updated(row: CampaignRecord) {
    setRows((old) => [row, ...old.filter((r) => r.id !== row.id)]);
  }
  async function create(data: CampaignData) {
    setBusy(true);
    setError("");
    try {
      const row = await post({ action: "create", data });
      updated(row);
      setSelected(row.id);
      setName("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current = rows.find((r) => r.id === selected);
  if (current)
    return (
      <CampaignEditor
        openBattles={openBattles}
        key={current.id}
        row={current}
        characters={characters}
        initialTab={initialTab}
        update={updated}
        back={() => setSelected(null)}
      />
    );
  return (
    <section className="campaigns">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ВАШИ ПРИКЛЮЧЕНИЯ</p>
          <h1>
            {initialTab === "overview"
              ? "Кампании"
              : initialTab === "live"
                ? "За игровым столом"
                : campaignLabels[initialTab as CampaignKind] || "Кампании"}
          </h1>
          <p>
            Группа, мир и история за одним столом.{" "}
            {initialTab !== "overview" && "Выберите кампанию для продолжения."}
          </p>
        </div>
        <Map size={36} />
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            className="quiet-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Повторить загрузку
          </button>
        </div>
      )}
      <form
        className="campaign-create tool-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void create({ ...emptyCampaign(edition), name: name.trim() });
        }}
      >
        <label>
          Название новой кампании
          <input
            required
            maxLength={160}
            value={name}
            placeholder="Например, Тайны Побережья"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          className="button primary"
          disabled={busy || loading || !name.trim()}
        >
          <Plus size={17} />
          Создать кампанию {modeLabel(edition)}
        </button>
        <label className="button secondary campaign-import">
          Импорт JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy || loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 5_000_000) throw new Error("Файл больше 5 МБ.");
                const value = JSON.parse(await file.text());
                const data = campaignSchema.parse(value.data ?? value);
                await create(data);
              } catch {
                setError(
                  "Не удалось импортировать кампанию. Проверьте формат JSON и связанные записи.",
                );
              }
            }}
          />
        </label>
      </form>
      <div className="campaign-toolbar">
        <input
          aria-label="Поиск кампаний"
          placeholder="Найти кампанию…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
          />{" "}
          Архив
        </label>
      </div>
      {loading ? (
        <p role="status">Загрузка кампаний…</p>
      ) : (
        <div className="content-grid">
          {rows
            .filter(
              (r) =>
                r.archived === archive &&
                r.data.name
                  .toLocaleLowerCase("ru")
                  .includes(query.toLocaleLowerCase("ru")),
            )
            .map((r) => (
              <button
                className="content-card"
                key={r.id}
                onClick={() => setSelected(r.id)}
              >
                <div className="card-top">
                  <span className="entity-icon reference">
                    <Map size={24} />
                  </span>
                  <span className="badge">{modeLabel(r.data.editionMode)}</span>
                </div>
                <h3>{r.data.name}</h3>
                <p>
                  {r.data.description ||
                    "Добавьте героев, локации и первые зацепки."}
                </p>
                <div className="card-footer">
                  {r.data.characterIds.length} персонажей ·{" "}
                  {r.data.entries.filter((e) => !e.archived).length} записей
                </div>
              </button>
            ))}
        </div>
      )}
      {!loading && !rows.some((r) => r.archived === archive) && (
        <div className="empty-state">
          <Map size={38} />
          <h2>{archive ? "В архиве пока пусто" : "Начните новую историю"}</h2>
          <p>
            Создайте кампанию, затем добавьте персонажей мастера, задания,
            локации и сессии.
          </p>
        </div>
      )}
      <p className="muted">
        Здесь видны кампании всех редакций; смешанный режим выбирается в
        настройках кампании.
      </p>
    </section>
  );
}

function CampaignEditor({
  row,
  characters,
  initialTab,
  update,
  back,
  openBattles,
}: {
  row: CampaignRecord;
  characters: CharacterRecord[];
  initialTab: Tab;
  update: (r: CampaignRecord) => void;
  back: () => void;
  openBattles: (campaignId: string, edition?: EditionId) => void;
}) {
  const {
    value: draft,
    setValue: setDraft,
    ready,
    storageError,
  } = useToolDraft(`companion-campaign-${row.id}`, draftSchema, {
    version: row.version,
    data: row.data,
  });
  const [tab, setTab] = useState<Tab>(initialTab),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<CampaignEntry | null>(null),
    [query, setQuery] = useState(""),
    [showArchived, setShowArchived] = useState(false),
    [status, setStatus] = useState("");
  const data = draft.data;
  const dirty = JSON.stringify(data) !== JSON.stringify(row.data);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(patch: Partial<CampaignData>) {
    setDraft((d) => ({ ...d, data: { ...d.data, ...patch } }));
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const valid = campaignSchema.safeParse(data);
      if (!valid.success)
        throw new Error(
          valid.error.issues[0]?.message || "Проверьте поля кампании.",
        );
      const r = await post({
        action: "save",
        id: row.id,
        version: draft.version,
        data,
      });
      update(r);
      setDraft({ version: r.version, data: r.data });
      setMessage("Кампания сохранена.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleArchive() {
    setBusy(true);
    setError("");
    try {
      const r = await post({
        action: "archive",
        id: row.id,
        version: row.version,
        archived: !row.archived,
      });
      update(r);
      setDraft({ version: r.version, data: r.data });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (
      dirty &&
      !window.confirm(
        "Заменить локальный черновик сохранённой версией? Перед этим можно скачать JSON.",
      )
    )
      return;
    setBusy(true);
    try {
      const all = await requestJson<CampaignRecord[]>("/api/campaigns");
      const r = all.find((r) => r.id === row.id);
      if (!r) throw new Error("Кампания не найдена.");
      update(r);
      setDraft({ version: r.version, data: r.data });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function add(kind: CampaignKind) {
    setEditing({
      id: crypto.randomUUID(),
      kind,
      name: "",
      fields:
        kind === "quest"
          ? { status: "Запланировано" }
          : kind === "session"
            ? {
                number: String(
                  data.entries.filter((e) => e.kind === "session").length + 1,
                ),
                date: new Date().toLocaleDateString("ru-RU"),
              }
            : {},
      notes: "",
      links: [],
      parentId: null,
      archived: false,
    });
  }
  const activeEntries = data.entries.filter((e) => !e.archived);
  if (!ready) return <p role="status">Восстановление черновика…</p>;
  return (
    <section className="campaigns">
      <button className="quiet-button" onClick={back}>
        <ArrowLeft size={16} />
        Все кампании
      </button>
      <button
        className="button secondary"
        onClick={() =>
          openBattles(
            row.id,
            row.data.editionMode === "Mixed" ? undefined : row.data.editionMode,
          )
        }
        disabled={dirty}
        title={dirty ? "Сначала сохраните изменения кампании" : undefined}
      >
        Бои этой кампании
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {modeLabel(data.editionMode)} ·{" "}
            {row.archived ? "АРХИВ" : "КАМПАНИЯ"}
          </p>
          <h1>{data.name || "Без названия"}</h1>
          <p>
            {dirty
              ? "Есть изменения в локальном черновике"
              : "Все изменения сохранены в базе"}
          </p>
        </div>
        <div className="campaign-actions">
          <button
            className="button secondary"
            onClick={() =>
              downloadText(
                `${data.name || "Кампания"}.json`,
                JSON.stringify(
                  { format: "dnd-campaign", version: 1, data },
                  null,
                  2,
                ),
              )
            }
          >
            <Download size={16} />
            Экспорт JSON
          </button>
          <button
            className="button primary"
            disabled={busy || row.archived || !dirty}
            onClick={save}
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
      {(error || storageError) && (
        <div className="error" role="alert">
          {error || storageError}
        </div>
      )}
      {message && (
        <p role="status" className="tool-notice">
          {message}
        </p>
      )}
      {draft.version !== row.version && (
        <div className="error">
          Черновик основан на другой версии. Скачайте его перед загрузкой
          актуальной кампании.
        </div>
      )}
      <CampaignSearch data={data} edit={setEditing} />
      <div
        className="campaign-tabs"
        role="tablist"
        aria-label="Разделы кампании"
      >
        {(["overview", ...campaignKinds, "live"] as Tab[]).map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            onClick={() => {
              setTab(t);
              setQuery("");
              setStatus("");
            }}
          >
            {t === "overview"
              ? "Обзор"
              : t === "live"
                ? "Режим сессии"
                : campaignLabels[t]}
          </button>
        ))}
      </div>
      <fieldset disabled={busy || row.archived} className="campaign-fieldset">
        {tab === "overview" ? (
          <div className="campaign-overview">
            <section className="tool-panel">
              <h2>О кампании</h2>
              <div className="campaign-form">
                <label>
                  Название
                  <input
                    value={data.name}
                    maxLength={160}
                    onChange={(e) => change({ name: e.target.value })}
                  />
                </label>
                <label>
                  Правила
                  <select
                    value={data.editionMode}
                    onChange={(e) =>
                      change({
                        editionMode: e.target
                          .value as CampaignData["editionMode"],
                      })
                    }
                  >
                    <option value="5e_2014">2014</option>
                    <option value="5e_2024">2024</option>
                    <option value="Mixed">Смешанная: 2014 + 2024</option>
                  </select>
                </label>
                <label>
                  Мастер
                  <input
                    maxLength={160}
                    value={data.dm}
                    onChange={(e) => change({ dm: e.target.value })}
                  />
                </label>
                <label>
                  Игроки
                  <input
                    value={data.players}
                    maxLength={20000}
                    onChange={(e) => change({ players: e.target.value })}
                  />
                </label>
                <TextArea
                  label="Описание"
                  value={data.description}
                  change={(v) => change({ description: v })}
                />
                <TextArea
                  label="Календарь мира / ближайшая встреча"
                  value={data.calendar}
                  change={(v) => change({ calendar: v })}
                />
                <TextArea
                  label="Заметки мастера"
                  value={data.notes}
                  change={(v) => change({ notes: v })}
                />
              </div>
            </section>
            <section className="tool-panel">
              <h2>Группа</h2>
              <p>
                Привязка к листам персонажей. Изменения кампании не меняют их
                характеристики.
              </p>
              <div className="campaign-checks">
                {characters.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={data.characterIds.includes(c.id)}
                      disabled={
                        !data.characterIds.includes(c.id) &&
                        (c.archived ||
                          (data.editionMode !== "Mixed" &&
                            data.editionMode !== c.data.edition))
                      }
                      onChange={(e) =>
                        change({
                          characterIds: e.target.checked
                            ? [...data.characterIds, c.id]
                            : data.characterIds.filter((id) => id !== c.id),
                        })
                      }
                    />
                    <span>
                      {c.data.name}
                      <small>
                        {modeLabel(c.data.edition)}
                        {c.archived ? " · в архиве" : ""}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              {!characters.length && (
                <p>Создайте героев в разделе «Персонажи».</p>
              )}
              <div className="campaign-metrics">
                {campaignKinds.map((k) => {
                  const Icon = icons[k];
                  return (
                    <button key={k} onClick={() => setTab(k)}>
                      <Icon size={22} />
                      <strong>
                        {activeEntries.filter((e) => e.kind === k).length}
                      </strong>
                      {campaignLabels[k]}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : tab === "live" ? (
          <>
            <SessionDesk
              data={data}
              change={change}
              edit={setEditing}
              create={() => add("session")}
            />
            <section className="tool-panel">
              <h2>Герои кампании</h2>
              {characters
                .filter((c) => data.characterIds.includes(c.id))
                .map((c) => (
                  <p key={c.id}>
                    {c.data.name} · {modeLabel(c.data.edition)}
                  </p>
                ))}
            </section>
          </>
        ) : (
          <>
            <div className="campaign-toolbar">
              <input
                aria-label="Поиск записей"
                placeholder="Название, метка или текст…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {tab === "quest" && (
                <select
                  aria-label="Статус задания"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Все статусы</option>
                  {campaignFields.quest[0].options!.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />{" "}
                Архив записей
              </label>
              <button className="button primary" onClick={() => add(tab)}>
                <Plus size={16} />
                Добавить запись
              </button>
            </div>
            <div className="content-grid">
              {data.entries
                .filter(
                  (e) =>
                    e.kind === tab &&
                    e.archived === showArchived &&
                    (!status || e.fields.status === status) &&
                    `${e.name} ${Object.values(e.fields).join(" ")} ${e.notes}`
                      .toLocaleLowerCase("ru")
                      .includes(query.toLocaleLowerCase("ru")),
                )
                .map((e) => {
                  const Icon = icons[e.kind];
                  return (
                    <button
                      className="content-card"
                      key={e.id}
                      onClick={() => setEditing(e)}
                    >
                      <div className="card-top">
                        <span className="entity-icon reference">
                          <Icon size={24} />
                        </span>
                        <span className="badge">
                          {e.fields.status ||
                            e.fields.type ||
                            e.fields.occupation ||
                            e.fields.date ||
                            campaignLabels[e.kind]}
                        </span>
                      </div>
                      <h3>{e.name}</h3>
                      {e.parentId && (
                        <small>
                          Внутри:{" "}
                          {data.entries.find((x) => x.id === e.parentId)?.name}
                        </small>
                      )}
                      <p>
                        {e.fields.description ||
                          e.fields.summary ||
                          e.fields.personality ||
                          e.fields.goals ||
                          e.notes ||
                          "Описание ещё не заполнено."}
                      </p>
                      <div className="card-footer">
                        {e.links.length} связей ·{" "}
                        {e.archived ? "В архиве" : "Открыть запись"}
                      </div>
                    </button>
                  );
                })}
            </div>
            {!data.entries.some(
              (e) => e.kind === tab && e.archived === showArchived,
            ) && (
              <div className="empty-state">
                <h2>Здесь пока пусто</h2>
                <p>
                  Добавьте первую запись. Она появится в кампании после
                  сохранения.
                </p>
              </div>
            )}
          </>
        )}
      </fieldset>
      <div className="campaign-bottom">
        <button className="quiet-button" disabled={busy} onClick={reload}>
          Загрузить сохранённую версию
        </button>
        <button
          className="quiet-button"
          disabled={busy || dirty}
          onClick={toggleArchive}
        >
          <Archive size={16} />
          {row.archived ? "Восстановить кампанию" : "В архив"}
        </button>
      </div>
      {editing && (
        <EntryEditor
          entry={editing}
          all={data.entries}
          close={() => setEditing(null)}
          save={(entry) => {
            change({
              entries: data.entries.some((e) => e.id === entry.id)
                ? data.entries.map((e) => (e.id === entry.id ? entry : e))
                : [...data.entries, entry],
            });
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function TextArea({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  return (
    <label className="campaign-wide">
      {label}
      <textarea
        rows={4}
        maxLength={20000}
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
}
function EntryEditor({
  entry,
  all,
  close,
  save,
}: {
  entry: CampaignEntry;
  all: CampaignEntry[];
  close: () => void;
  save: (e: CampaignEntry) => void;
}) {
  const [draft, setDraft] = useState(entry),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const outside = useRef(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function tryClose() {
    if (
      JSON.stringify(draft) !== JSON.stringify(entry) &&
      !window.confirm("Закрыть запись без применения изменений?")
    )
      return;
    close();
  }
  function submit() {
    const parsed = campaignEntrySchema.safeParse(draft);
    if (!parsed.success) {
      setError("Укажите название и проверьте поля.");
      return;
    }
    const validation = campaignSchema.safeParse({
      ...emptyCampaign("5e_2024"),
      entries: [...all.filter((e) => e.id !== draft.id), parsed.data],
    });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    save(parsed.data);
  }
  const Icon = icons[draft.kind];
  return (
    <dialog
      ref={dialog}
      className="detail-dialog campaign-dialog"
      aria-label={`Запись: ${campaignLabels[draft.kind]}`}
      onCancel={(e) => {
        e.preventDefault();
        tryClose();
      }}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        outside.current =
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom;
      }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (
          outside.current &&
          (e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom)
        )
          tryClose();
        outside.current = false;
      }}
    >
      <article>
        <header>
          <h2>
            <Icon size={24} />
            {campaignLabels[draft.kind]}
          </h2>
          <button
            className="icon-button"
            onClick={tryClose}
            aria-label="Закрыть запись"
          >
            <X size={20} />
          </button>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="campaign-form">
            <label className="campaign-wide">
              Название
              <input
                autoFocus
                required
                maxLength={160}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            {campaignFields[draft.kind].map((f) =>
              f.multiline ? (
                <TextArea
                  key={f.key}
                  label={f.label}
                  value={draft.fields[f.key] || ""}
                  change={(v) =>
                    setDraft({
                      ...draft,
                      fields: { ...draft.fields, [f.key]: v },
                    })
                  }
                />
              ) : (
                <label key={f.key}>
                  {f.label}
                  {f.options ? (
                    <select
                      value={draft.fields[f.key] || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          fields: { ...draft.fields, [f.key]: e.target.value },
                        })
                      }
                    >
                      <option value="">Не указано</option>
                      {f.options.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      maxLength={20000}
                      value={draft.fields[f.key] || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          fields: { ...draft.fields, [f.key]: e.target.value },
                        })
                      }
                    />
                  )}
                </label>
              ),
            )}
            {draft.kind === "location" && (
              <label>
                Внутри локации
                <select
                  value={draft.parentId || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, parentId: e.target.value || null })
                  }
                >
                  <option value="">Верхний уровень</option>
                  {all
                    .filter((e) => e.kind === "location" && e.id !== draft.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.archived ? " (архив)" : ""}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <TextArea
              label="Заметки"
              value={draft.notes}
              change={(notes) => setDraft({ ...draft, notes })}
            />
          </div>
          <details className="campaign-links">
            <summary>
              Связанные персонажи мастера, локации, задания и сессии (
              {draft.links.length})
            </summary>
            <div className="campaign-checks">
              {all
                .filter((e) => e.id !== draft.id)
                .map((e) => (
                  <label key={e.id}>
                    <input
                      type="checkbox"
                      checked={draft.links.includes(e.id)}
                      onChange={(ev) =>
                        setDraft({
                          ...draft,
                          links: ev.target.checked
                            ? [...draft.links, e.id]
                            : draft.links.filter((id) => id !== e.id),
                        })
                      }
                    />
                    {e.name} · {campaignLabels[e.kind]}
                    {e.archived ? " (архив)" : ""}
                  </label>
                ))}
            </div>
            {all
              .filter((e) => e.links.includes(draft.id))
              .map((e) => (
                <p key={e.id}>На эту запись ссылается: {e.name}</p>
              ))}
          </details>
          <label className="campaign-archive">
            <input
              type="checkbox"
              checked={draft.archived}
              onChange={(e) =>
                setDraft({ ...draft, archived: e.target.checked })
              }
            />
            Запись в архиве
          </label>
          <div className="campaign-actions">
            <button
              type="button"
              className="button secondary"
              onClick={tryClose}
            >
              Отмена
            </button>
            <button className="button primary">Применить к черновику</button>
          </div>
          <p className="muted">
            После применения нажмите «Сохранить» в кампании.
          </p>
        </form>
      </article>
    </dialog>
  );
}
