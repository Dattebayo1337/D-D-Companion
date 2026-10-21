import { useEffect, useState } from "react";
import type { Content, ReferenceEntry } from "@/entities/content";
import { requestJson } from "@/shared/client";
export function ReferenceLinks({
  entry,
  open,
}: {
  entry: ReferenceEntry;
  open: (entry: Content) => void;
}) {
  const [links, setLinks] = useState<Content[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const url = entry.reference.parentId
      ? `/api/content/${entry.reference.parentId}`
      : `/api/content?kind=Reference&parentId=${entry.id}`;
    requestJson<Content | { items: Content[] }>(url)
      .then((r) => {
        if (alive) {
          setLinks("items" in r ? r.items : [r]);
          setError("");
        }
      })
      .catch(() => {
        if (alive) setError("Не удалось загрузить связанные статьи.");
      });
    return () => {
      alive = false;
    };
  }, [entry.id, entry.reference.parentId]);
  return (
    <div className="reference-links">
      {error && <p role="alert">{error}</p>}
      {links.length > 0 && (
        <>
          <h3>{entry.reference.parentId ? "Основной класс" : "Подклассы"}</h3>
          {links.map((e) => (
            <button
              className="button secondary"
              key={e.id}
              onClick={() => open(e)}
            >
              {e.nameRu}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
