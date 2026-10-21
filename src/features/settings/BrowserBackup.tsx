import { useState } from "react";
import {
  applyBrowserBackup,
  captureBrowserBackup,
  parseBrowserBackup,
  type BrowserBackup as Backup,
} from "@/domain/browser-backup";
import { downloadText } from "../tools/shared";
export function BrowserBackup() {
  const [incoming, setIncoming] = useState<Backup | null>(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <section className="panel settings-backup">
      <h2>Копия данных браузера</h2>
      <p>
        Настройки, избранное, история и локальные черновики, включая заметки
        мастера. Персонажи, сохранённые кампании и карты находятся на сервере и
        требуют отдельной копии его базы.
      </p>
      <button
        className="button secondary"
        onClick={() => {
          try {
            downloadText(
              "companion-browser-backup.json",
              JSON.stringify(captureBrowserBackup(localStorage)),
            );
            setError("");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Не удалось создать копию.",
            );
          }
        }}
      >
        Скачать копию браузера
      </button>
      <label>
        Выбрать копию для восстановления
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              if (file.size > 6000000) throw new Error("Файл превышает 6 МБ.");
              setIncoming(parseBrowserBackup(await file.text()));
              setError("");
              setSaved(false);
            } catch (problem) {
              setIncoming(null);
              setError(
                problem instanceof Error
                  ? problem.message
                  : "Не удалось прочитать копию.",
              );
            }
          }}
        />
      </label>
      {incoming && (
        <div>
          <p>
            Будет восстановлено записей: {Object.keys(incoming.values).length}.
            Одноимённые данные заменятся; остальные останутся. Сначала скачайте
            текущую копию. Черновики из файла не сохраняются на сервер
            автоматически.
          </p>
          <button
            className="button primary"
            onClick={() => {
              if (
                !window.confirm(
                  "Восстановить выбранные данные этого браузера? Текущие значения с теми же именами будут заменены.",
                )
              )
                return;
              try {
                applyBrowserBackup(localStorage, incoming);
                setIncoming(null);
                setSaved(true);
                setError("");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Не удалось восстановить копию.",
                );
              }
            }}
          >
            Восстановить
          </button>
          <button
            className="button secondary"
            onClick={() => setIncoming(null)}
          >
            Отмена
          </button>
        </div>
      )}
      {saved && (
        <p role="status">
          Данные восстановлены.{" "}
          <button
            className="button secondary"
            onClick={() => window.location.reload()}
          >
            Перезагрузить приложение
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
