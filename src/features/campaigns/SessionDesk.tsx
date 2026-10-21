import { PrintPreview } from "../print/PrintPreview";
import { RulesText } from "../compendium/RulesText";
import { useState } from "react";
import {
  campaignLabels,
  type CampaignData,
  type CampaignEntry,
} from "@/entities/campaign";

export function sessionMaterials(entries: CampaignEntry[], sessionId: string) {
  const session = entries.find(
    (e) => e.id === sessionId && e.kind === "session" && !e.archived,
  );
  if (!session) return [];
  return entries.filter(
    (e) =>
      e.id !== sessionId &&
      !e.archived &&
      (session.links.includes(e.id) || e.links.includes(sessionId)),
  );
}
export function SessionDesk({
  data,
  change,
  edit,
  create,
}: {
  data: CampaignData;
  change: (patch: Partial<CampaignData>) => void;
  edit: (entry: CampaignEntry) => void;
  create: () => void;
}) {
  const [chosen, setChosen] = useState("");
  const [query, setQuery] = useState("");
  const sessions = data.entries.filter(
    (e) => e.kind === "session" && !e.archived,
  );
  const session = sessions.find((e) => e.id === chosen) ?? sessions.at(-1);
  const previous = session
    ? sessions[sessions.findIndex((e) => e.id === session.id) - 1]
    : undefined;
  const linked = session ? sessionMaterials(data.entries, session.id) : [];
  function updateSession(key: string, value: string) {
    if (!session) return;
    change({
      entries: data.entries.map((e) =>
        e.id !== session.id
          ? e
          : key === "notes"
            ? { ...e, notes: value }
            : { ...e, fields: { ...e.fields, [key]: value } },
      ),
    });
  }
  function attach(id: string) {
    if (!session || !id || linked.some((e) => e.id === id)) return;
    change({
      entries: data.entries.map((e) =>
        e.id === session.id ? { ...e, links: [...e.links, id] } : e,
      ),
    });
  }
  return (
    <div className="session-desk">
      <section className="tool-panel">
        <h2>На чём остановились</h2>
        {previous ? (
          <>
            <h3>{previous.name}</h3>
            <RulesText
              text={
                previous.fields.summary ||
                "Итоги прошлой встречи ещё не записаны."
              }
            />
            <h4>Текущая цель</h4>
            <RulesText text={previous.fields.goal || "Не указана"} />
            <h4>Незавершённые вопросы</h4>
            <RulesText text={previous.fields.questions || "Не указаны"} />
          </>
        ) : (
          <p>
            Предыдущей неархивной встречи ещё нет. Порядок — по добавлению
            сессий.
          </p>
        )}
        <h2>Текущая встреча</h2>
        <p>
          Выберите сессию для игры. Изменения входят в черновик кампании;
          нажмите «Сохранить», чтобы записать их на сервер.
        </p>
        <label>
          Сессия
          <select
            value={session?.id ?? ""}
            onChange={(e) => setChosen(e.target.value)}
          >
            {!sessions.length && <option value="">Сессий пока нет</option>}
            {sessions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fields.number ? `№ ${e.fields.number} · ` : ""}
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" onClick={create}>
          Добавить сессию
        </button>
        {session && (
          <>
            <h3>{session.name}</h3>
            <p>{session.fields.date || "Дата не указана"}</p>
            <button className="quiet-button" onClick={() => edit(session)}>
              Название, дата и остальные сведения
            </button>
            <label>
              План встречи
              <textarea
                maxLength={20000}
                rows={7}
                value={session.fields.plan ?? ""}
                onChange={(e) => updateSession("plan", e.target.value)}
              />
            </label>
            <label>
              Заметки во время игры
              <textarea
                maxLength={20000}
                rows={7}
                value={session.notes}
                onChange={(e) => updateSession("notes", e.target.value)}
              />
            </label>
            <label>
              Текущая цель
              <textarea
                rows={3}
                maxLength={20000}
                value={session.fields.goal ?? ""}
                onChange={(e) => updateSession("goal", e.target.value)}
              />
            </label>
            <label>
              Незавершённые вопросы
              <textarea
                rows={3}
                maxLength={20000}
                value={session.fields.questions ?? ""}
                onChange={(e) => updateSession("questions", e.target.value)}
              />
            </label>
            <PrintPreview title="Памятка встречи мастеру">
              <h1>
                {data.name} · {session.name}
              </h1>
              <p>Личная памятка мастера: содержит план и заметки.</p>
              {[
                ["План", session.fields.plan],
                ["Заметки", session.notes],
                ["Итоги", session.fields.summary],
                ["Цель", session.fields.goal],
                ["Вопросы", session.fields.questions],
              ].map(([label, text]) => (
                <section key={label}>
                  <h2>{label}</h2>
                  <RulesText text={text || "—"} />
                </section>
              ))}
              <h2>Материалы встречи</h2>
              {linked.map((e) => (
                <section key={e.id}>
                  <h3>{e.name}</h3>
                  <RulesText
                    text={
                      e.fields.description ||
                      e.fields.summary ||
                      e.fields.personality ||
                      ""
                    }
                  />
                  <RulesText text={e.notes} />
                </section>
              ))}
            </PrintPreview>
            <label>
              Итоги встречи
              <textarea
                maxLength={20000}
                rows={5}
                value={session.fields.summary ?? ""}
                onChange={(e) => updateSession("summary", e.target.value)}
              />
            </label>
          </>
        )}
      </section>
      <section className="tool-panel">
        <h2>Материалы встречи</h2>
        <p>
          Связанные места, задания и персонажи мастера. Эти записи остаются в
          вашей кампании.
        </p>
        {session && (
          <label>
            Прикрепить запись
            <select value="" onChange={(e) => attach(e.target.value)}>
              <option value="">Выберите материал кампании</option>
              {data.entries
                .filter(
                  (e) =>
                    !e.archived &&
                    e.id !== session.id &&
                    !linked.some((x) => x.id === e.id),
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {campaignLabels[e.kind]} · {e.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label>
          Найти среди материалов
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название или текст…"
          />
        </label>
        {!linked.length && (
          <p>
            Прикрепите нужные записи, чтобы не искать их по разделам во время
            игры.
          </p>
        )}
        {linked
          .filter((e) =>
            `${e.name} ${e.notes} ${Object.values(e.fields).join(" ")}`
              .toLocaleLowerCase("ru")
              .includes(query.toLocaleLowerCase("ru")),
          )
          .map((e) => (
            <article className="session-material" key={e.id}>
              <small>{campaignLabels[e.kind]}</small>
              <h3>{e.name}</h3>
              <p>
                {e.fields.objectives ||
                  e.fields.description ||
                  e.fields.personality ||
                  e.fields.summary ||
                  "Описание ещё не заполнено."}
              </p>
              {!!e.fields.secrets && (
                <details>
                  <summary>Секреты мастера</summary>
                  <p>{e.fields.secrets}</p>
                </details>
              )}
              <button className="button secondary" onClick={() => edit(e)}>
                Открыть запись
              </button>
            </article>
          ))}
        <details>
          <summary>Общие заметки кампании</summary>
          <p className="session-prose">
            {data.notes || "Общих заметок пока нет."}
          </p>
        </details>
        <h3>Активные задания кампании</h3>
        {data.entries
          .filter(
            (e) =>
              e.kind === "quest" &&
              !e.archived &&
              e.fields.status === "Активно",
          )
          .map((e) => (
            <button
              className="campaign-session"
              key={e.id}
              onClick={() => edit(e)}
            >
              {e.name}
            </button>
          ))}
      </section>
    </div>
  );
}
