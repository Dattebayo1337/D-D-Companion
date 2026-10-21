import { useState } from "react";
import type { Content } from "@/entities/content";
import { requestJson } from "@/shared/client";
import { compareContent } from "@/domain/content-comparison";
import { editionLabels, originLabels } from "@/localization/labels";
import { RulesText } from "./RulesText";
type Candidate = { entry: Content; match: "relation" | "name" };
export function EditionComparison({ entry }: { entry: Content }) {
  const [items, setItems] = useState<Candidate[] | null>(null);
  const [original, setOriginal] = useState<Content | null>(null);
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [onlyChanges, setOnlyChanges] = useState(false);
  const selected = items?.find((c) => c.entry.id === chosen);
  const pair =
    selected && original
      ? [original, selected.entry].sort((a, b) =>
          a.edition.localeCompare(b.edition),
        )
      : [];
  return (
    <section className="edition-comparison" aria-label="Сравнение редакций">
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          if (visible) {
            setVisible(false);
            return;
          }
          setVisible(true);
          if (items) return;
          setBusy(true);
          setError("");
          try {
            const result = await requestJson<{
              original: Content;
              items: Candidate[];
            }>(`/api/content/${entry.id}/versions`);
            setOriginal(result.original);
            setItems(result.items);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Не удалось загрузить версии.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Ищу версии…"
          : visible
            ? "Закрыть сравнение"
            : "Сравнить редакции"}
      </button>
      {visible && (
        <>
          {error && (
            <p role="alert">{error} Закройте сравнение и попробуйте снова.</p>
          )}
          {items?.length === 0 && (
            <p>
              Связанная версия в другой редакции не найдена. Это не означает,
              что такого правила не существует.
            </p>
          )}
          {!!items?.length && (
            <label className="comparison-selector">
              Версия для сравнения
              <select
                value={chosen}
                onChange={(e) => setChosen(e.target.value)}
              >
                <option value="">Выберите запись</option>
                {items.map((c) => (
                  <option key={c.entry.id} value={c.entry.id}>
                    {c.entry.nameRu} · {editionLabels[c.entry.edition]} ·{" "}
                    {c.match === "relation"
                      ? "связь в базе"
                      : "совпадение названия"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selected && original && (
            <>
              <p className="detail-content-note">
                {selected.match === "name"
                  ? "Предположительное соответствие по названию. Проверьте источники: варианты из разных книг могут отличаться."
                  : "Версии связаны в базе данных."}{" "}
                Сравниваются сохранённые данные, включая обзоры. Различие текста
                не обязательно означает изменение механики.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={onlyChanges}
                  onChange={(e) => setOnlyChanges(e.target.checked)}
                />{" "}
                Только различия
              </label>
              <div className="comparison-origins">
                {pair.map((e) => (
                  <p key={e.id}>
                    <strong>
                      {editionLabels[e.edition]} · {e.nameRu}
                    </strong>
                    <br />
                    {originLabels[e.contentOrigin]} · версия {e.contentVersion}
                    {/^https?:\/\//i.test(e.source) && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={e.source}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Источник ↗
                        </a>
                      </>
                    )}
                  </p>
                ))}
              </div>
              {compareContent(pair[0], pair[1])
                .filter((r) => !onlyChanges || r.changed)
                .map((row) => (
                  <section
                    key={row.label}
                    className={`comparison-row${row.changed ? " comparison-changed" : ""}`}
                  >
                    <h4>
                      {row.label}
                      {row.changed ? " · различается" : " · совпадает"}
                    </h4>
                    <div className="comparison-columns">
                      {[row.left, row.right].map((value, i) => (
                        <div key={i}>
                          <small>{editionLabels[pair[i].edition]}</small>
                          {value ? (
                            <RulesText text={value} />
                          ) : (
                            <p>Не указано в записи</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
