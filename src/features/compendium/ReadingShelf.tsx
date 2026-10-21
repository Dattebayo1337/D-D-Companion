import { OfflineSave } from "./OfflineSave";
import { useEffect, useState } from "react";
import type { Content, EditionId, SourceBook } from "@/entities/content";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
import { contentSummary } from "@/domain/content-summary";
import { EntryIcon } from "./EntrySummary";
import { Detail } from "./Detail";
import {
  changeReadingList,
  restoreReadingList,
  useReadingList,
} from "./reading-list";
import { downloadText } from "../tools/shared";

export function ReadingShelf({
  edition,
  sources,
  settings,
}: {
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
}) {
  const { list, error } = useReadingList();
  const [mode, setMode] = useState<"favorites" | "recent">("favorites");
  const [page, setPage] = useState(1),
    [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Content | null>(null);
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: { id: string; entry?: Content }[];
  } | null>(null);
  const filtered = list[mode].filter((e) => e.edition === edition);
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 12)),
  );
  const ids = filtered
    .slice((currentPage - 1) * 12, currentPage * 12)
    .map((e) => e.id);
  const key = JSON.stringify(ids);
  useEffect(() => {
    const controller = new AbortController();
    const requested: string[] = JSON.parse(key);
    Promise.all(
      requested.map(async (id) => {
        try {
          const entry = await requestJson<Content>(`/api/content/${id}`, {
            signal: controller.signal,
          });
          return entry.edition === edition ? { id, entry } : { id };
        } catch {
          return { id };
        }
      }),
    ).then((rows) => {
      if (!controller.signal.aborted) setLoaded({ key, rows });
    });
    return () => controller.abort();
  }, [key, revision, edition]);
  function remove(id: string) {
    try {
      changeReadingList(
        mode === "favorites" ? "removeFavorite" : "removeRecent",
        { id, edition },
      );
      setFailure("");
    } catch {
      setFailure("Браузер не разрешил изменить список.");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ДЛЯ ИГРЫ ЗА СТОЛОМ</p>
          <h1>Под рукой</h1>
          <p>Нужные правила без повторного поиска.</p>
        </div>
      </div>
      <p className="detail-content-note">
        Закладки и последние 30 карточек хранятся в этом браузере, без входа.
        Они общие для пользователей этого браузера. Здесь показана выбранная
        редакция. Выбранные карточки можно отдельно сохранить для чтения без
        сети.
      </p>
      <OfflineSave ids={filtered.map((e) => e.id)} />
      <div className="reading-shelf-actions">
        <button
          className={`button ${mode === "favorites" ? "primary" : "secondary"}`}
          aria-pressed={mode === "favorites"}
          onClick={() => {
            setMode("favorites");
            setPage(1);
          }}
        >
          Избранное (
          {list.favorites.filter((e) => e.edition === edition).length})
        </button>
        <button
          className={`button ${mode === "recent" ? "primary" : "secondary"}`}
          aria-pressed={mode === "recent"}
          onClick={() => {
            setMode("recent");
            setPage(1);
          }}
        >
          Недавно открыто
        </button>
        <button
          className="button secondary"
          disabled={!!error}
          onClick={() =>
            downloadText(
              "companion-bookmarks.json",
              JSON.stringify(list, null, 2),
            )
          }
        >
          Скачать закладки
        </button>
        <button
          className="button secondary"
          onClick={() => {
            setLoaded(null);
            setRevision((value) => value + 1);
          }}
        >
          Обновить карточки
        </button>
        <label className="button secondary">
          Загрузить закладки
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Загрузить закладки"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 100000)
                  throw new Error("Файл должен быть меньше 100 КБ.");
                const raw = await file.text();
                if (
                  !window.confirm(
                    "Заменить избранное и историю в этом браузере данными файла? Сначала можно скачать текущие закладки.",
                  )
                )
                  return;
                restoreReadingList(raw);
                setPage(1);
                setFailure("");
              } catch (problem) {
                setFailure(
                  problem instanceof Error
                    ? problem.message
                    : "Не удалось загрузить закладки.",
                );
              }
            }}
          />
        </label>
        {mode === "recent" && !!list.recent.length && (
          <button
            className="button secondary"
            onClick={() => {
              if (
                !window.confirm(
                  "Очистить историю открытых карточек обеих редакций? Избранное сохранится.",
                )
              )
                return;
              try {
                changeReadingList("clearRecent");
              } catch {
                setFailure("Не удалось очистить историю.");
              }
            }}
          >
            Очистить историю
          </button>
        )}
      </div>
      {(error || failure) && (
        <p role="alert" className="error">
          {failure || error}
        </p>
      )}
      {!filtered.length ? (
        <div className="empty-state">
          <h2>
            {mode === "favorites"
              ? "Соберите свои правила"
              : "Здесь появятся открытые карточки"}
          </h2>
          <p>
            Откройте запись справочника и нажмите «В избранное». Для другой
            редакции переключите правила сверху.
          </p>
        </div>
      ) : loaded?.key !== key ? (
        <p role="status">Загрузка карточек…</p>
      ) : (
        <div className="reading-shelf-grid">
          {loaded.rows.map(({ id, entry }) => (
            <article className="panel" key={id}>
              {entry ? (
                <>
                  <button
                    className="reading-shelf-open"
                    onClick={() => setSelected(entry)}
                  >
                    <EntryIcon entry={entry} size={24} />
                    <h2>{entry.nameRu}</h2>
                  </button>
                  <p>{contentSummary(entry).text}</p>
                  <button
                    className="button secondary"
                    onClick={() => setSelected(entry)}
                  >
                    Открыть карточку
                  </button>
                </>
              ) : (
                <p>
                  Не удалось загрузить карточку. Проверьте соединение; запись
                  также могла стать недоступной.
                </p>
              )}
              <button className="quiet-button" onClick={() => remove(id)}>
                {mode === "favorites"
                  ? "Убрать из избранного"
                  : "Убрать из истории"}
              </button>
            </article>
          ))}
        </div>
      )}
      {filtered.length > 12 && (
        <div className="pagination">
          <button
            className="button secondary"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Назад
          </button>
          <span>
            {currentPage} / {Math.ceil(filtered.length / 12)}
          </span>
          <button
            className="button secondary"
            disabled={currentPage * 12 >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Далее
          </button>
        </div>
      )}
      {selected && (
        <Detail
          entry={selected}
          settings={settings}
          sources={sources}
          open={setSelected}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
