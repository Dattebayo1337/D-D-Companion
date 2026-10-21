import { BookOpen, ArrowUpRight, Plus } from "lucide-react";
import type { SourceBook } from "@/entities/content";
import { editionLabels, originLabels } from "@/localization/labels";
export function Sources({
  sources,
  openManager,
}: {
  sources: SourceBook[];
  openManager: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПРОИСХОЖДЕНИЕ КАЖДОЙ ИСТОРИИ</p>
          <h1>Мои источники</h1>
          <p>Книги и наборы, из которых складывается ваша библиотека.</p>
        </div>
        <button className="button primary" onClick={openManager}>
          <Plus size={16} />
          Добавить источник
        </button>
      </div>
      <div className="content-grid">
        {sources.map((source) => (
          <article className="source-card panel" key={source.id}>
            <div className="card-top">
              <BookOpen size={28} />
              <span className="badge">{editionLabels[source.edition]}</span>
            </div>
            <h2>{source.fullNameRu}</h2>
            <p>{originLabels[source.contentType]}</p>
            <dl>
              <dt>Обозначение</dt>
              <dd>{source.shortName}</dd>
              <dt>Издатель / автор</dt>
              <dd>{source.publisher || "Не указан"}</dd>
              <dt>Лицензия</dt>
              <dd>{source.licenseType}</dd>
            </dl>
          </article>
        ))}
      </div>
      {!sources.length && (
        <div className="empty-state">
          <BookOpen size={40} />
          <h2>У каждой истории есть источник</h2>
          <p>
            Встроенные тексты официальных книг не включены.
            <br />
            Импортируйте разрешённый набор с русским переводом.
          </p>
          <button className="button secondary" onClick={openManager}>
            К импорту <ArrowUpRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
