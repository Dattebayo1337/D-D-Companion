import { useState } from "react";
import { requestJson } from "@/shared/client";
export function Packages({ refresh }: { refresh: () => void }) {
  const [format, setFormat] = useState("dndpack"),
    [name, setName] = useState("Мои приключения"),
    [author, setAuthor] = useState(""),
    [version, setVersion] = useState("1.0.0"),
    [description, setDescription] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(action: "export" | "validate" | "import") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let payload = "",
        inputFormat = format;
      if (action !== "export") {
        if (!file) throw new Error("Выберите файл.");
        if (file.size > 22 * 1024 * 1024)
          throw new Error("Файл должен быть не больше 22 МБ.");
        inputFormat = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!["json", "csv", "dndpack"].includes(inputFormat))
          throw new Error("Выберите JSON, CSV или .dndpack.");
        if (inputFormat === "dndpack") {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let s = "";
          for (let i = 0; i < bytes.length; i += 8192)
            s += String.fromCharCode(...bytes.subarray(i, i + 8192));
          payload = btoa(s);
        } else payload = await file.text();
      }
      const body = {
        action,
        format: inputFormat,
        ...(action === "export"
          ? {
              manifest: {
                name,
                author,
                version,
                description,
                edition: "Mixed",
                dependencies: [],
              },
            }
          : { payload }),
      };
      if (action === "export") {
        const r = await fetch("/api/workshop/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const b = await r.json();
          throw new Error(
            b.issues?.map((i: { message: string }) => i.message).join("\n") ||
              b.error,
          );
        }
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = `homebrew.${format}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(
          "Пакет скачан. В него вошли авторские карточки обеих редакций, включая черновики.",
        );
      } else {
        const r = await requestJson<{
          valid?: boolean;
          issues?: { message: string }[];
          count?: number;
          imported?: number;
          skipped?: number;
        }>("/api/workshop/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (r.valid === false)
          throw new Error(
            r.issues?.map((i) => i.message).join("\n") || "Ошибка проверки",
          );
        setMessage(
          action === "validate"
            ? `Проверка пройдена. Карточек: ${r.count}. Импорт ещё не выполнен.`
            : `Импортировано: ${r.imported}, без изменений: ${r.skipped}.`,
        );
        if (action === "import") refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="character-panel">
      <h2>Пакеты авторских материалов</h2>
      <p>
        Переносите собственные карточки вместе с источниками. Перед импортом
        можно проверить набор. Повторный импорт не создаёт копий.
      </p>
      <fieldset disabled={busy} className="workshop-editor">
        <div className="workshop-fields">
          <label>
            Название пакета
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Автор
            <input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </label>
          <label>
            Версия пакета
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </label>
          <label>
            Формат
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="dndpack">Пакет .dndpack</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label className="workshop-wide">
            Описание пакета
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <button className="button" onClick={() => run("export")}>
          Экспортировать авторские карточки
        </button>
        <hr />
        <label>
          Файл для импорта
          <input
            type="file"
            accept=".json,.csv,.dndpack"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMessage("");
              setError("");
            }}
          />
        </label>
        <div className="workshop-toolbar">
          <button
            className="button secondary"
            disabled={!file}
            onClick={() => run("validate")}
          >
            Проверить пакет
          </button>
          <button
            className="button"
            disabled={!file}
            onClick={() => run("import")}
          >
            Импортировать пакет
          </button>
        </div>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <p className="muted">
        CSV использует колонки type и json для сохранения вложенных параметров.
        .dndpack — ZIP с манифестом, данными и каталогом assets; вложенные
        изображения пока не поддерживаются. Пакет не содержит коллекции,
        персонажей и кампании.
      </p>
    </div>
  );
}
