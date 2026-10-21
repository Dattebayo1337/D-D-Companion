import { useState } from "react";
import { Coverage } from "./Coverage";
import {
  Upload,
  FileJson,
  CheckCircle2,
  Download,
  RefreshCw,
  Languages,
  AlertCircle,
} from "lucide-react";
import { requestJson } from "@/shared/client";
import type { Audit, Issue } from "@/entities/content";
import type { Overview } from "../shell/types";
export function DataManager({
  stats,
  refresh,
}: {
  stats: Overview | null;
  refresh: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [name, setName] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function operation(action: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "audit") {
        const a = await requestJson<Audit>("/api/manager");
        setAudit(a);
        setMessage(`Проверено записей: ${a.count}.`);
      } else if (action === "reindex") {
        const r = await requestJson<{ count: number }>(
          "/api/manager?action=reindex",
          { method: "POST" },
        );
        setMessage(`Поисковый индекс обновлён. Записей: ${r.count}.`);
      } else if (action === "validate") {
        const a = await requestJson<Audit>("/api/manager?action=validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: raw,
        });
        setAudit(a);
        setMessage(
          a.valid
            ? "Набор прошёл проверку структуры и ссылок."
            : "Обнаружены ошибки в наборе.",
        );
      } else {
        const r = await requestJson<{
          imported: number;
          skipped: number;
          localization: Issue[];
        }>("/api/manager?action=import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: raw,
        });
        setMessage(
          `Импортировано: ${r.imported}. Без изменений: ${r.skipped}. Замечаний к переводу: ${r.localization.length}.`,
        );
        setAudit(null);
        refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось выполнить операцию.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    setAudit(null);
    setMessage("");
    setRaw("");
    setName("");
    if (
      !file.name.toLowerCase().endsWith(".json") ||
      (file.type && !["application/json", "text/plain"].includes(file.type))
    ) {
      setError("Выберите файл JSON.");
      return;
    }
    if (file.size > 32 * 1024 * 1024) {
      setError("Размер файла превышает 32 МБ.");
      return;
    }
    setRaw(await file.text());
    setName(file.name);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПОРЯДОК В ВАШЕЙ БИБЛИОТЕКЕ</p>
          <h1>Менеджер данных</h1>
          <p>Импортируйте источники и проверяйте качество русских переводов.</p>
        </div>
        <a
          className="button secondary"
          href="/api/manager?action=export"
          download
        >
          <Download size={16} />
          Экспорт набора
        </a>
      </div>
      <Coverage />
      <div className="manager-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>Добавить набор данных</h2>
            <FileJson size={20} />
          </div>
          <p className="muted-copy">
            Структурированные данные с указанием редакции, источника и лицензии.
            Все изменения применяются одной транзакцией.
          </p>
          <label className="upload-zone">
            <Upload size={28} strokeWidth={1.5} />
            <strong>{name || "Выберите файл для импорта"}</strong>
            <span>JSON · до 32 МБ · формат набора версии 1</span>
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Файл набора данных"
              onChange={(e) => void selectFile(e.target.files?.[0])}
            />
          </label>
          <div className="button-row">
            <button
              className="button secondary"
              disabled={!raw || busy}
              onClick={() => void operation("validate")}
            >
              Проверить набор
            </button>
            <button
              className="button primary"
              disabled={!raw || busy}
              onClick={() => void operation("import")}
            >
              <Upload size={16} />
              {busy ? "Обработка…" : "Импортировать"}
            </button>
          </div>
          <div className="callout">
            <AlertCircle size={18} />
            <p>
              Черновики сохраняются в базе, но появятся в справочнике только
              после утверждения перевода. Официальные данные защищены от правок.
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Качество данных</h2>
            <CheckCircle2 size={20} />
          </div>
          <div className="quality-counts">
            <div>
              <strong>{stats?.approved ?? 0}</strong>
              <small>Утверждено</small>
            </div>
            <div>
              <strong>{stats?.drafts ?? 0}</strong>
              <small>Черновики</small>
            </div>
          </div>
          <button
            className="check-action"
            disabled={busy}
            onClick={() => void operation("audit")}
          >
            <Languages size={20} />
            <span>
              <strong>Проверить русскую локализацию</strong>
              <small>Пропуски, шаблоны и терминология</small>
            </span>
            <span>→</span>
          </button>
          <button
            className="check-action"
            disabled={busy}
            onClick={() => void operation("reindex")}
          >
            <RefreshCw size={20} />
            <span>
              <strong>Обновить поисковый индекс</strong>
              <small>Названия, псевдонимы и формы слов</small>
            </span>
            <span>→</span>
          </button>
          <p className="muted-copy small">
            Повторы UUID, ссылки и редакции проверяются при каждом импорте.
            Неизвестные свойства и исполняемый код не принимаются.
          </p>
        </section>
      </div>
      {message && (
        <div className="success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {audit && (
        <section className="panel audit-report">
          <h2>Результат проверки</h2>
          {!audit.issues.length && !audit.localization.length ? (
            <p className="success">Ошибок не обнаружено.</p>
          ) : (
            <>
              <IssueList title="Ошибки набора" issues={audit.issues} />
              <IssueList title="Локализация" issues={audit.localization} />
            </>
          )}
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>Последние импорты</h2>
          <span>История изменений</span>
        </div>
        {stats?.imports.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Набор</th>
                  <th>Дата</th>
                  <th>Новых версий</th>
                </tr>
              </thead>
              <tbody>
                {stats.imports.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{new Date(i.importedAt).toLocaleString("ru-RU")}</td>
                    <td>{i.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-copy">История появится после первого импорта.</p>
        )}
      </section>
    </>
  );
}
function IssueList({ title, issues }: { title: string; issues: Issue[] }) {
  return issues.length ? (
    <>
      <h3>
        {title} · {issues.length}
      </h3>
      <ul>
        {issues.slice(0, 100).map((i, n) => (
          <li key={n}>
            <strong>{i.message}</strong>
            <code>{i.path}</code>
          </li>
        ))}
      </ul>
      {issues.length > 100 && (
        <p>
          Показаны первые 100 замечаний. Полный отчёт доступен через API и
          команду проверки.
        </p>
      )}
    </>
  ) : null;
}
