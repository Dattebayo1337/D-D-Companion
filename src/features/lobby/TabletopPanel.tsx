import { useEffect, useState } from "react";
import type { LobbyView } from "@/entities/lobby";
import { treasuryBalances, type Handout } from "@/entities/tabletop";
import type { ImageMapRecord } from "@/entities/image-map";
import { requestJson } from "@/shared/client";
import { RulesText } from "../compendium/RulesText";
import { PrintPreview } from "../print/PrintPreview";
import { downloadText } from "../tools/shared";
export function TabletopPanel({
  view,
  busy,
  save,
}: {
  view: LobbyView;
  busy: boolean;
  save: (operation: unknown) => Promise<boolean>;
}) {
  const host = view.role === "Мастер";
  const [draft, setDraft] = useState<Handout | null>(null);
  const [base, setBase] = useState("");
  const [journal, setJournal] = useState("");
  const [item, setItem] = useState("Золотые монеты");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("");
  const [recipient, setRecipient] = useState("");
  const [images, setImages] = useState<ImageMapRecord[]>([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!host) return;
    const controller = new AbortController();
    requestJson<ImageMapRecord[]>("/api/map-images", {
      signal: controller.signal,
    })
      .then((rows) => {
        if (!controller.signal.aborted)
          setImages(rows.filter((r) => !r.archived));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage(
            "Не удалось загрузить PNG-карты. Материал можно сохранить без изображения.",
          );
      });
    return () => controller.abort();
  }, [host]);
  const handoutBody = (h: Handout) => (
    <>
      <h3>{h.title}</h3>
      <RulesText text={h.text} />
      {h.imageMapId && (
        // Direct authenticated URL preserves cookies and the original image aspect ratio.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="handout-image"
          src={`/api/lobby?id=${view.id}&handout=${h.id}`}
          alt={h.title}
        />
      )}
    </>
  );
  function edit(h: Handout) {
    if (draft && !window.confirm("Заменить несохранённый материал?")) return;
    setDraft(h);
    setBase(
      JSON.stringify(view.tabletop.handouts.find((v) => v.id === h.id) ?? null),
    );
  }
  return (
    <section className="lobby-panel tabletop-panel">
      <h2>Материалы группы</h2>
      <p>
        Игроки видят только опубликованные материалы. Открытое изображение можно
        сохранить; скрытие материала не отзывает уже сделанные копии.
      </p>
      {view.tabletop.handouts.map((h) => (
        <article className="session-material" key={h.id}>
          {host && (
            <span className="badge">
              {h.published ? "Видно игрокам" : "Черновик мастера"}
            </span>
          )}
          {handoutBody(h)}
          {host && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => edit(h)}
            >
              Изменить / видимость
            </button>
          )}
        </article>
      ))}
      {!view.tabletop.handouts.length && <p>Материалов пока нет.</p>}
      <PrintPreview title="Печать материалов игрокам">
        <h1>{view.name}</h1>
        {view.tabletop.handouts
          .filter((h) => h.published)
          .map((h) => (
            <section key={h.id}>{handoutBody(h)}</section>
          ))}
      </PrintPreview>
      {host && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            edit({
              id: crypto.randomUUID(),
              title: "",
              text: "",
              imageMapId: null,
              published: false,
            })
          }
        >
          Добавить материал
        </button>
      )}
      {host && draft && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              JSON.stringify(
                view.tabletop.handouts.find((h) => h.id === draft.id) ?? null,
              ) !== base
            ) {
              setMessage(
                "Материал изменился в другом окне. Скопируйте свой текст и откройте материал заново.",
              );
              return;
            }
            if (await save({ type: "handout", data: draft })) {
              setDraft(null);
              setMessage("Материал сохранён.");
            }
          }}
        >
          <fieldset disabled={busy}>
            <legend>Отдельный материал для группы</legend>
            <label>
              Название
              <input
                required
                maxLength={160}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Текст
              <textarea
                rows={6}
                maxLength={20000}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </label>
            <label>
              Изображение из ваших PNG-карт
              <select
                value={draft.imageMapId ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, imageMapId: e.target.value || null })
                }
              >
                <option value="">Без изображения</option>
                {images.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.data.name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Загрузить новое изображение можно в разделе «Карты → PNG». Личные
              заметки карты игрокам не передаются.
            </p>
            <label>
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) =>
                  setDraft({ ...draft, published: e.target.checked })
                }
              />
              Показать игрокам после сохранения
            </label>
            <button className="button primary">Сохранить материал</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                if (window.confirm("Закрыть несохранённый материал?"))
                  setDraft(null);
              }}
            >
              Отмена
            </button>
          </fieldset>
        </form>
      )}
      <h2>Общий журнал</h2>
      <p>
        Зацепки и планы доступны всем участникам. Записи сохраняют автора;
        исправления добавляйте новой записью.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save({ type: "journal", text: journal })) setJournal("");
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Новая запись
            <textarea
              required
              maxLength={10000}
              rows={3}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={!journal.trim()}>
            Добавить в журнал
          </button>
        </fieldset>
      </form>
      <label>
        Поиск в журнале
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {[...view.tabletop.journal]
        .reverse()
        .filter((j) =>
          `${j.text} ${j.author}`
            .toLocaleLowerCase("ru")
            .includes(query.toLocaleLowerCase("ru")),
        )
        .map((j) => (
          <article className="session-material" key={j.id}>
            <small>
              {j.author} · {new Date(j.at).toLocaleString("ru-RU")}
            </small>
            <RulesText text={j.text} />
          </article>
        ))}
      <h2>Казна и добыча</h2>
      <p>
        Мастер записывает поступления и передачи. Каждая валюта и каждый предмет
        учитываются отдельной строкой; исправления — обратной операцией.
      </p>
      <table>
        <thead>
          <tr>
            <th>Деньги / предмет</th>
            <th>В группе</th>
          </tr>
        </thead>
        <tbody>
          {treasuryBalances(view.tabletop.ledger).map((b) => (
            <tr key={b.item}>
              <td>{b.item}</td>
              <td>{b.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {host && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await save({
                type: "ledger",
                item,
                delta: Number(delta),
                reason,
                recipient,
              })
            ) {
              setReason("");
              setRecipient("");
            }
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Валюта или предмет
              <input
                required
                list={`treasury-${view.id}`}
                maxLength={160}
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
              <datalist id={`treasury-${view.id}`}>
                {treasuryBalances(view.tabletop.ledger).map((b) => (
                  <option key={b.item} value={b.item} />
                ))}
              </datalist>
            </label>
            <label>
              Изменение количества (+ поступление, − передача)
              <input
                required
                type="number"
                step="1"
                min="-100000000"
                max="100000000"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
            </label>
            <label>
              Кому передано / от кого получено
              <input
                maxLength={160}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </label>
            <label>
              Причина
              <input
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              className="button primary"
              disabled={!Number.isInteger(Number(delta)) || !Number(delta)}
            >
              Записать операцию
            </button>
          </fieldset>
        </form>
      )}
      <details>
        <summary>История казны · {view.tabletop.ledger.length}</summary>
        {[...view.tabletop.ledger].reverse().map((l) => (
          <p key={l.id}>
            {new Date(l.at).toLocaleString("ru-RU")} · {l.author}: {l.item}{" "}
            {l.delta > 0 ? "+" : ""}
            {l.delta} · {l.recipient} · {l.reason}
          </p>
        ))}
      </details>
      <button
        className="button secondary"
        onClick={() =>
          downloadText(
            "group-journal-treasury.json",
            JSON.stringify(
              {
                name: view.name,
                journal: view.tabletop.journal,
                ledger: view.tabletop.ledger,
              },
              null,
              2,
            ),
          )
        }
      >
        Скачать журнал и историю казны
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
