import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { requestJson } from "@/shared/client";
import { referenceLabels } from "@/localization/reference";
type Report = {
  checkedAt: string;
  localCount: number;
  localizationIssues: unknown[];
  notComparable: string[];
  coverage: {
    edition: string;
    category: string;
    url: string;
    local: number;
    indexed: number;
    matchedByName: number;
    unmatched: number;
    missingCandidates: { nameRu: string; url: string }[];
  }[];
};
export function Coverage() {
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel coverage-panel">
      <div className="section-heading">
        <h2>
          <ClipboardCheck size={21} /> Полнота справочников
        </h2>
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setReport(await requestJson<Report>("/api/coverage"));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Показать сверку с ДнД.су
        </button>
      </div>
      <p className="muted-copy">
        Снимок открытых каталогов сайта и нашей базы. Совпадение названия не
        означает наличие полного текста правила.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {report && (
        <>
          <p>
            Дата сверки: {report.checkedAt.slice(0, 10)} · {report.localCount}{" "}
            записей без авторских материалов · замечаний к русской локализации:{" "}
            {report.localizationIssues.length}.
          </p>
          <p className="tool-notice">
            База заполнена частично. В индексах сайта встречаются варианты,
            сторонние книги и материалы совместимости. Несовпадения — кандидаты
            для ручной проверки.
          </p>
          <div className="coverage-table">
            <table>
              <thead>
                <tr>
                  <th>Редакция и раздел</th>
                  <th>В базе</th>
                  <th>На сайте</th>
                  <th>Совпало</th>
                  <th>Требуют сверки</th>
                </tr>
              </thead>
              <tbody>
                {report.coverage.map((r) => (
                  <tr key={r.edition + r.category}>
                    <td>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.edition.slice(3)} ·{" "}
                        {r.category === "Spell"
                          ? "Заклинания"
                          : r.category === "Monster"
                            ? "Бестиарий"
                            : r.category === "Equipment"
                              ? "Оружие, доспехи и снаряжение"
                              : referenceLabels[
                                  r.category as keyof typeof referenceLabels
                                ]}
                      </a>
                    </td>
                    <td>{r.local}</td>
                    <td>{r.indexed}</td>
                    <td>{r.matchedByName}</td>
                    <td>
                      <details>
                        <summary>{r.unmatched}</summary>
                        {r.missingCandidates.map((e) => (
                          <p key={e.url}>
                            <a href={e.url} target="_blank" rel="noreferrer">
                              {e.nameRu}
                            </a>
                          </p>
                        ))}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.notComparable.map((s) => (
            <p className="muted-copy" key={s}>
              {s}
            </p>
          ))}
          <a
            className="button secondary"
            href="/api/coverage?download=1"
            download
          >
            Скачать полный отчёт
          </a>
        </>
      )}
    </section>
  );
}
