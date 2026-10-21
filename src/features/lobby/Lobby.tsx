"use client";
import { TabletopPanel } from "./TabletopPanel";
import { CharacterPrint } from "../print/CharacterPrint";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LobbyIndex, LobbySettings, LobbyView } from "@/entities/lobby";
import { campaignFields, campaignLabels } from "@/entities/campaign";
import { requestJson } from "@/shared/client";
import { SharedSheet } from "./SharedSheet";
import { RulesText } from "../compendium/RulesText";
const post = <T,>(body: unknown) =>
  requestJson<T>("/api/lobby", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export function Lobby() {
  const [host, setHost] = useState<boolean | null>(null);
  const [index, setIndex] = useState<LobbyIndex | null>(null);
  const [id, setId] = useState("");
  const [view, setView] = useState<LobbyView | null>(null);
  const [invite, setInvite] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const refreshIndex = useCallback(
    async () => setIndex(await requestJson<LobbyIndex>("/api/lobby?index=1")),
    [],
  );
  useEffect(() => {
    let active = true;
    const fragment =
      new URLSearchParams(window.location.hash.slice(1)).get("invite") ?? "";
    requestJson<{ user: { displayName: string } | null }>("/api/account")
      .then(async (result) => {
        if (!active) return;
        setHost(Boolean(result.user));
        setPlayerName(result.user?.displayName ?? "");
        setInvite(fragment);
        if (result.user) await refreshIndex();
        else if (!fragment) {
          try {
            const data = await requestJson<LobbyView>("/api/lobby");
            if (active) {
              setView(data);
              setId(data.id);
            }
          } catch {
            /* No prior player session. */
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [refreshIndex]);
  useEffect(() => {
    if (!id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        const data = await requestJson<LobbyView>(
          `/api/lobby?id=${encodeURIComponent(id)}`,
        );
        if (active) {
          setView(data);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setView(null);
        }
      } finally {
        if (active) timer = setTimeout(update, 5000);
      }
    }
    void update();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await post<{ id?: string; invite?: string }>(body);
      if (result.invite)
        setLink(`${window.location.origin}/play#invite=${result.invite}`);
      if (result.id) {
        setId(result.id);
        setView(await requestJson<LobbyView>(`/api/lobby?id=${result.id}`));
      }
      if (host) await refreshIndex();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const character = view?.characters.find((c) => c.id === selected);
  return (
    <section className="lobby">
      <header className="lobby-heading">
        <div>
          <p className="eyebrow">ВАША ГРУППА</p>
          <h1>{view?.name ?? "Общее лобби"}</h1>
          <p>
            {view
              ? `${view.role} · ${view.memberName}`
              : "Персонажи, приключение и место встречи"}
          </p>
        </div>
        <div className="lobby-actions">
          <Link
            className="button secondary"
            href={host ? "/account" : "/login"}
          >
            {host ? "Аккаунт" : "Войти / регистрация"}
          </Link>
          {host && (
            <Link className="button secondary" href="/">
              Личное пространство
            </Link>
          )}
          {view?.role === "Игрок" && (
            <button
              className="button secondary"
              onClick={async () => {
                if (await action({ action: "leave", id: view.id })) {
                  setId("");
                  setView(null);
                  setInvite("");
                }
              }}
            >
              Выйти из лобби
            </button>
          )}
          {host && (
            <button
              className="button secondary"
              onClick={async () => {
                await requestJson("/api/account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                window.location.replace(
                  new URL("/", window.location.origin).href,
                );
              }}
            >
              Выйти из аккаунта
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="lobby-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {host === null && <p>Загрузка лобби…</p>}
      {host !== null && !view && (
        <form
          className="lobby-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await action({
                action: "join",
                invite: invite.trim(),
                name: playerName,
              })
            )
              window.history.replaceState(null, "", "/play");
          }}
        >
          <h2>Присоединиться как игрок</h2>
          <p>
            Приглашение предоставляет доступ к полным листам опубликованных
            персонажей. Кампания и заметки мастера остаются закрытыми.
          </p>
          <label>
            Ваше имя
            <input
              required
              maxLength={80}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </label>
          <label>
            Код приглашения
            <input
              required
              value={invite}
              onChange={(e) => {
                const value = e.target.value;
                setInvite(
                  value.includes("#invite=")
                    ? value.split("#invite=")[1]
                    : value,
                );
              }}
              autoComplete="off"
            />
          </label>
          <button className="button" disabled={busy}>
            Войти в лобби
          </button>
          {!host && (
            <Link href="/login">
              Создать лобби — войти или зарегистрироваться →
            </Link>
          )}
        </form>
      )}
      {host && index && (
        <details className="lobby-panel" open={!view}>
          <summary>Мои лобби · {index.lobbies.length}</summary>
          <div className="lobby-actions">
            {index.lobbies.map((l) => (
              <button
                className="button secondary"
                key={l.id}
                onClick={() => {
                  setId(l.id);
                  setView(null);
                  setSelected("");
                  setLink("");
                }}
              >
                {l.name}
                {l.closed ? " · закрыто" : ""}
              </button>
            ))}
          </div>
          <SettingsForm
            key="new"
            index={index}
            busy={busy}
            save={(data) => action({ action: "create", data })}
          />
        </details>
      )}
      {link && host && (
        <section className="lobby-panel">
          <h2>Приглашение для игроков</h2>
          <p>
            Ссылка даёт только роль «Игрок». Новая ссылка заменяет предыдущую.
          </p>
          <input aria-label="Ссылка приглашения" readOnly value={link} />
          <button
            className="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setNotice("Ссылка скопирована.");
              } catch {
                setNotice("Выделите и скопируйте ссылку из поля.");
              }
            }}
          >
            Копировать
          </button>
          <p>
            Ссылка на localhost работает только на этом компьютере. Для
            интернета откройте приложение по его публичному HTTPS-адресу и
            создайте приглашение там.
          </p>
        </section>
      )}
      {view && (
        <>
          <section className="lobby-panel">
            <h2>Участники</h2>
            <div className="lobby-actions">
              <span className="badge">Мастер</span>
              {view.participants.map((p) => (
                <span className="lobby-member" key={p.id}>
                  {p.name} · Игрок{" "}
                  {view.master && (
                    <button
                      aria-label={`Отозвать доступ: ${p.name}`}
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await action({
                            action: "kick",
                            id: view.id,
                            memberId: p.id,
                          })
                        ) {
                          setLink("");
                          setNotice(
                            "Доступ отозван. Старое приглашение отключено; создайте новое для следующих участников.",
                          );
                        }
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </section>
          <section className="lobby-panel">
            <h2>Персонажи группы</h2>
            <p>
              Полные листы доступны всем участникам. Изменения мастера
              обновляются автоматически каждые 5 секунд.
            </p>
            {!view.characters.length && (
              <p>Мастер ещё не добавил персонажей.</p>
            )}
            <div className="lobby-character-grid">
              {view.characters.map((c) => (
                <button
                  aria-pressed={selected === c.id}
                  key={c.id}
                  className="lobby-character"
                  onClick={() => setSelected(c.id)}
                >
                  <strong>{c.data.name}</strong>
                  <span>
                    {c.data.edition === "5e_2014" ? "2014" : "2024"} · Уровень{" "}
                    {c.data.classes.reduce((n, x) => n + x.level, 0)}
                  </span>
                  <span>Хиты {c.data.hp} · Открыть полный лист →</span>
                </button>
              ))}
            </div>
          </section>
          <TabletopPanel
            key={view.id}
            view={view}
            busy={busy}
            save={(operation) =>
              action({
                action: "tabletop",
                id: view.id,
                version: view.version,
                operation,
              })
            }
          />
          {character && (
            <section className="lobby-panel">
              <button
                className="button secondary"
                onClick={() => setSelected("")}
              >
                Закрыть лист
              </button>
              <CharacterPrint
                character={character.data}
                content={view.content}
              />
              <SharedSheet character={character.data} content={view.content} />
            </section>
          )}
          {view.master && index && (
            <section className="lobby-panel master-panel">
              <h2>Пространство мастера</h2>
              <p>Этот раздел и его данные недоступны игрокам.</p>
              <details>
                <summary>Настройки лобби и личные заметки</summary>
                <SettingsForm
                  key={view.id}
                  index={index}
                  initial={view.master.settings}
                  version={view.version}
                  busy={busy}
                  save={(data, version) =>
                    action({ action: "save", id: view.id, version, data })
                  }
                />
              </details>
              <div className="lobby-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => action({ action: "invite", id: view.id })}
                >
                  Новое приглашение
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    action({
                      action: "close",
                      id: view.id,
                      closed: !index.lobbies.find((l) => l.id === view.id)
                        ?.closed,
                    })
                  }
                >
                  {index.lobbies.find((l) => l.id === view.id)?.closed
                    ? "Открыть лобби"
                    : "Закрыть лобби для игроков"}
                </button>
              </div>
              <h3>Заметки мастера</h3>
              <RulesText
                text={view.master.settings.notes || "Пока нет заметок."}
              />
              {view.master.campaign ? (
                <>
                  <h3>Кампания: {view.master.campaign.name}</h3>
                  <a
                    className="button secondary"
                    href={`/campaigns/${view.master.settings.campaignId}`}
                  >
                    Открыть редактор кампании
                  </a>
                  <RulesText text={view.master.campaign.description} />
                  <h4>Заметки кампании</h4>
                  <RulesText
                    text={view.master.campaign.notes || "Нет заметок."}
                  />
                  <p>
                    Мастер: {view.master.campaign.dm} · Игроки:{" "}
                    {view.master.campaign.players}
                  </p>
                  <RulesText text={view.master.campaign.calendar} />
                  {view.master.campaign.entries
                    .filter((e) => !e.archived)
                    .map((e) => (
                      <details key={e.id}>
                        <summary>
                          {campaignLabels[e.kind]} · {e.name}
                        </summary>
                        {campaignFields[e.kind]
                          .filter((f) => e.fields[f.key])
                          .map((f) => (
                            <section key={f.key}>
                              <h4>{f.label}</h4>
                              <RulesText text={e.fields[f.key]} />
                            </section>
                          ))}
                        <h4>Заметки</h4>
                        <RulesText text={e.notes} />
                      </details>
                    ))}
                </>
              ) : (
                <p>Выберите кампанию в настройках лобби.</p>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
function SettingsForm({
  index,
  initial,
  version,
  busy,
  save,
}: {
  index: LobbyIndex;
  initial?: LobbySettings;
  version?: number;
  busy: boolean;
  save: (data: LobbySettings, version?: number) => Promise<boolean>;
}) {
  const [data, setData] = useState<LobbySettings>(
    initial ?? { name: "", campaignId: null, characterIds: [], notes: "" },
  );
  const [baseVersion, setBaseVersion] = useState(version);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  // Adopt the version returned after our save, without overwriting unsaved notes on polling.
  useEffect(() => {
    if (saved) {
      queueMicrotask(() => {
        setBaseVersion(version);
        setSaved(false);
      });
    }
  }, [version, saved]);
  return (
    <form
      className="lobby-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await save(data, baseVersion)) {
          setSaved(true);
          setMessage("Сохранено.");
          if (!initial)
            setData({
              name: "",
              campaignId: null,
              characterIds: [],
              notes: "",
            });
        }
      }}
    >
      <h3>{initial ? "Настройки" : "Создать лобби"}</h3>
      <label>
        Название
        <input
          required
          maxLength={120}
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </label>
      <label>
        Кампания мастера
        <select
          value={data.campaignId ?? ""}
          onChange={(e) => {
            const campaign = index.campaigns.find(
              (c) => c.id === e.target.value,
            );
            setData({
              ...data,
              campaignId: campaign?.id ?? null,
              characterIds:
                campaign?.characterIds.filter((id) =>
                  index.characters.some((c) => c.id === id),
                ) ?? data.characterIds,
            });
          }}
        >
          <option value="">Без кампании</option>
          {index.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Персонажи, видимые всем участникам</legend>
        <p>
          Публикуется полный лист, включая инвентарь, заклинания и заметки
          персонажа.
        </p>
        {index.characters.map((c) => (
          <label className="lobby-check" key={c.id}>
            <input
              type="checkbox"
              checked={data.characterIds.includes(c.id)}
              onChange={(e) =>
                setData({
                  ...data,
                  characterIds: e.target.checked
                    ? [...data.characterIds, c.id]
                    : data.characterIds.filter((id) => id !== c.id),
                })
              }
            />
            {c.name} · {c.edition === "5e_2014" ? "2014" : "2024"}
          </label>
        ))}
        {!index.characters.length && (
          <p>Сначала создайте персонажей в личном пространстве.</p>
        )}
      </fieldset>
      <label>
        Личные заметки мастера
        <textarea
          rows={6}
          value={data.notes}
          maxLength={20000}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
        />
      </label>
      <div className="lobby-actions">
        <button className="button" disabled={busy}>
          {initial ? "Сохранить лобби" : "Создать и получить приглашение"}
        </button>
        {initial && (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setData(initial);
              setBaseVersion(version);
              setMessage("Загружена последняя версия.");
            }}
          >
            Загрузить сохранённую версию
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
