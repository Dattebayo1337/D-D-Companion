"use client";
import { useEffect, useState } from "react";
import {
  Swords,
  Plus,
  ArrowLeft,
  Play,
  SkipForward,
  SkipBack,
  Archive,
  Download,
  RefreshCw,
} from "lucide-react";
import type { EditionId, SourceBook, ReferenceEntry } from "@/entities/content";
import type { CampaignRecord } from "@/entities/campaign";
import type { CharacterRecord } from "@/entities/character";
import { battleLabels, type BattleRecord } from "@/entities/battle";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
import { downloadText, ToolEntry } from "../tools/shared";
import { BattleRoster, ParticipantRow, ParticipantEditor } from "./Roster";
export type BattleMutation = (
  command: Record<string, unknown>,
) => Promise<boolean>;
export function battlePost(command: Record<string, unknown>) {
  return requestJson<BattleRecord>("/api/battles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
}
export function Battles({
  edition,
  sources,
  settings,
  campaignId: initialCampaignId,
}: {
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
  campaignId?: string | null;
}) {
  const [rows, setRows] = useState<BattleRecord[]>([]),
    [campaigns, setCampaigns] = useState<CampaignRecord[]>([]),
    [characters, setCharacters] = useState<CharacterRecord[]>([]),
    [conditions, setConditions] = useState<ReferenceEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null),
    [campaignId, setCampaignId] = useState(initialCampaignId ?? ""),
    [name, setName] = useState(""),
    [archived, setArchived] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [opened, setOpened] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const opt = { signal: controller.signal };
    Promise.all([
      requestJson<BattleRecord[]>("/api/battles", opt),
      requestJson<CampaignRecord[]>("/api/campaigns", opt),
      requestJson<CharacterRecord[]>("/api/characters?edition=5e_2014", opt),
      requestJson<CharacterRecord[]>("/api/characters?edition=5e_2024", opt),
      requestJson<{ items: ReferenceEntry[] }>(
        "/api/content?kind=Reference&category=Condition&edition=5e_2014&pageSize=100",
        opt,
      ),
      requestJson<{ items: ReferenceEntry[] }>(
        "/api/content?kind=Reference&category=Condition&edition=5e_2024&pageSize=100",
        opt,
      ),
    ])
      .then(([b, c, a, d, e, f]) => {
        setRows(b);
        setCampaigns(c);
        setCharacters([...a, ...d]);
        setConditions([...e.items, ...f.items]);
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
  const row = rows.find((r) => r.id === selected);
  async function mutate(command: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const result = await battlePost({
        ...command,
        ...(command.action === "create"
          ? {}
          : { id: row?.id, version: row?.version }),
      });
      setRows((old) => [result, ...old.filter((r) => r.id !== result.id)]);
      setSelected(result.id);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const campaign = campaigns.find((c) => c.id === row?.campaignId),
    mixed = campaign?.data.editionMode === "Mixed";
  const participant = row?.data.participants.find((p) => p.id === editing);
  return (
    <section className="battles campaigns">
      {row ? (
        <>
          <button className="quiet-button" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} />
            Все бои
          </button>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {battleLabels[row.data.status]} ·{" "}
                {row.data.edition === "5e_2014" ? "2014" : "2024"}
                {row.archived ? " · АРХИВ" : ""}
              </p>
              <h1>{row.data.name}</h1>
              <p>
                {campaign?.data.name || "Отдельное столкновение"} · Каждое
                действие сохраняется в базе
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() =>
                downloadText(
                  `${row.data.name}.json`,
                  JSON.stringify(row, null, 2),
                )
              }
            >
              <Download size={16} />
              Экспорт боя
            </button>
          </div>
        </>
      ) : (
        <div className="page-heading">
          <div>
            <p className="eyebrow">ИНСТРУМЕНТЫ МАСТЕРА</p>
            <h1>Бои и инициатива</h1>
            <p>Подготовьте столкновение и ведите его по ходам.</p>
          </div>
          <Swords size={35} />
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            className="quiet-button"
            disabled={busy}
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={16} />
            Обновить данные
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Загрузка боёв…</p>
      ) : !row ? (
        <>
          <form
            className="tool-panel campaign-create"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate({
                  action: "create",
                  name,
                  edition,
                  campaignId: campaignId || null,
                })
              )
                setName("");
            }}
          >
            <label>
              Название боя
              <input
                required
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Нападение у моста"
              />
            </label>
            <label>
              Кампания и фильтр списка
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Без привязки / все бои</option>
                {campaigns
                  .filter(
                    (c) =>
                      !c.archived &&
                      (c.data.editionMode === "Mixed" ||
                        c.data.editionMode === edition),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="button primary" disabled={busy || !name.trim()}>
              <Plus size={16} />
              Создать бой
            </button>
          </form>
          <label className="campaign-archive">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Показать архив
          </label>
          <div className="content-grid">
            {rows
              .filter(
                (r) =>
                  r.archived === archived &&
                  r.data.edition === edition &&
                  (!campaignId || r.campaignId === campaignId),
              )
              .map((r) => (
                <button
                  className="content-card"
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                >
                  <div className="card-top">
                    <Swords size={24} />
                    <span className="badge">{battleLabels[r.data.status]}</span>
                  </div>
                  <h3>{r.data.name}</h3>
                  <p>
                    {campaigns.find((c) => c.id === r.campaignId)?.data.name ||
                      "Отдельное столкновение"}
                  </p>
                  <div className="card-footer">
                    {r.data.participants.length} участников · Раунд{" "}
                    {r.data.round}
                  </div>
                </button>
              ))}
          </div>
          {!rows.some(
            (r) =>
              r.archived === archived &&
              r.data.edition === edition &&
              (!campaignId || r.campaignId === campaignId),
          ) && (
            <div className="empty-state">
              <Swords size={36} />
              <h2>Боёв пока нет</h2>
              <p>
                Создайте бой или сохраните состав из калькулятора сложности.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="battle-toolbar">
            <span className="badge">Версия {row.version}</span>
            {row.data.status === "running" && (
              <strong>
                Раунд {row.data.round} · Ход {row.data.turn + 1}:{" "}
                {row.data.participants[row.data.turn]?.name}
              </strong>
            )}
            <button
              className="quiet-button"
              disabled={busy}
              onClick={() => setRevision((n) => n + 1)}
            >
              <RefreshCw size={16} />
              Обновить
            </button>
            <button
              className="quiet-button"
              disabled={busy}
              onClick={() =>
                mutate({ action: "archive", archived: !row.archived })
              }
            >
              <Archive size={16} />
              {row.archived ? "Восстановить" : "В архив"}
            </button>
          </div>
          <fieldset
            disabled={busy || row.archived}
            className="campaign-fieldset"
          >
            <div className="battle-controls">
              {row.data.status === "preparing" ? (
                <>
                  <button
                    className="button secondary"
                    disabled={!row.data.participants.length}
                    onClick={() => mutate({ action: "rollInitiative" })}
                  >
                    Бросить инициативу всем
                  </button>
                  <button
                    className="button primary"
                    disabled={!row.data.participants.length}
                    onClick={() => mutate({ action: "start" })}
                  >
                    <Play size={16} />
                    Начать бой
                  </button>
                </>
              ) : row.data.status === "running" ? (
                <>
                  <button
                    className="button secondary"
                    disabled={row.data.round === 1 && row.data.turn === 0}
                    onClick={() => mutate({ action: "previous" })}
                  >
                    <SkipBack size={16} />
                    Предыдущий ход
                  </button>
                  <button
                    className="button primary"
                    onClick={() => mutate({ action: "next" })}
                  >
                    Следующий ход
                    <SkipForward size={16} />
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => mutate({ action: "round" })}
                  >
                    Следующий раунд
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() => mutate({ action: "finish" })}
                  >
                    Завершить бой
                  </button>
                </>
              ) : (
                <p>Бой завершён. Журнал и состояние участников сохранены.</p>
              )}
              {row.data.status !== "preparing" && (
                <button
                  className="quiet-button"
                  onClick={() => mutate({ action: "prepare" })}
                >
                  Вернуться к подготовке
                </button>
              )}
            </div>
            {row.data.status === "preparing" && (
              <BattleRoster
                row={row}
                campaign={campaign}
                characters={characters}
                mixed={mixed}
                mutate={mutate}
                open={setOpened}
              />
            )}
            <p className="muted">
              Равная инициатива разрешается порядком подготовки (стрелки ↑ ↓).
              Переход назад меняет только указатель хода. Листы персонажей не
              изменяются.
            </p>
            <div className="battle-participants">
              {row.data.participants.map((p, index) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  active={
                    row.data.status === "running" && index === row.data.turn
                  }
                  preparing={row.data.status === "preparing"}
                  finished={row.data.status === "finished"}
                  conditions={conditions.filter((c) => c.edition === p.edition)}
                  mutate={mutate}
                  open={setOpened}
                  edit={() => setEditing(p.id)}
                />
              ))}
            </div>
            <details className="tool-panel battle-notes">
              <summary>Название и заметки боя</summary>
              <form
                key={`${row.id}-${row.data.name}-${row.data.notes}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void mutate({
                    action: "notes",
                    name: String(f.get("name")),
                    text: String(f.get("notes")),
                  });
                }}
              >
                <label>
                  Название
                  <input
                    name="name"
                    defaultValue={row.data.name}
                    required
                    maxLength={160}
                  />
                </label>
                <label>
                  Заметки
                  <textarea
                    name="notes"
                    rows={4}
                    defaultValue={row.data.notes}
                    maxLength={20000}
                  />
                </label>
                <button className="button secondary">Сохранить заметки</button>
              </form>
            </details>
          </fieldset>
          <details className="tool-panel battle-log" open>
            <summary>
              Журнал боя · последние {row.data.log.length} событий
            </summary>
            <ol>
              {row.data.log
                .slice()
                .reverse()
                .map((e) => (
                  <li key={e.id}>
                    <time>{new Date(e.time).toLocaleTimeString("ru-RU")}</time>
                    {e.text}
                  </li>
                ))}
            </ol>
          </details>
          {participant && (
            <ParticipantEditor
              busy={busy}
              error={error}
              participant={participant}
              preparing={row.data.status === "preparing"}
              close={() => setEditing(null)}
              save={async (manual) => {
                if (
                  await mutate({
                    action: "edit",
                    participantId: participant.id,
                    manual,
                  })
                )
                  setEditing(null);
              }}
            />
          )}
        </>
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
    </section>
  );
}
