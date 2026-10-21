import { useEffect, useState } from "react";
import type { Content } from "@/entities/content";
import type { PersonalizedContent } from "@/services/personal-translations";
import { requestJson } from "@/shared/client";
type Data = {
  original: { nameRu: string; descriptionRu: string };
  overrides: { field: string; customValue: string; originalValue: string }[];
};
export function PersonalTranslations({
  entry,
  saved,
  dirtyChanged,
}: {
  entry: Content;
  saved: (entry: Content) => void;
  dirtyChanged: (dirty: boolean) => void;
}) {
  const [data, setData] = useState<Data | null>(null),
    [text, setText] = useState("");
  const [field, setField] = useState<"nameRu" | "descriptionRu">(
    "descriptionRu",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const personal = (entry as PersonalizedContent).personalText;
  const dirty =
    !!data &&
    text !==
      (data.overrides.find((o) => o.field === field)?.customValue ??
        data.original[field]);
  useEffect(() => {
    dirtyChanged(dirty || busy);
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty || busy) window.addEventListener("beforeunload", prevent);
    return () => {
      dirtyChanged(false);
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty, busy, dirtyChanged]);
  const fill = (value: Data, key: typeof field) =>
    setText(
      value.overrides.find((o) => o.field === key)?.customValue ??
        value.original[key],
    );
  async function save(reset: boolean) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      await requestJson<Data>("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entry.id,
          field,
          customValue: reset ? null : text,
          expectedValue:
            data.overrides.find((o) => o.field === field)?.customValue ?? null,
        }),
      });
      const updated = await requestJson<Content>(`/api/content/${entry.id}`);
      setData(null);
      saved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить текст.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="personal-translations">
      {!!personal?.fields.length && (
        <p className="detail-content-note">
          В карточке показан ваш личный текст. Общая библиотека и данные других
          игроков не изменены.
        </p>
      )}
      {!!personal?.staleFields.length && (
        <p role="status">
          Источник обновился. Ваш прежний перевод сохранён в редакторе, но пока
          показан актуальный текст библиотеки.
        </p>
      )}
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          if (data) {
            if (
              text !==
                (data.overrides.find((o) => o.field === field)?.customValue ??
                  data.original[field]) &&
              !window.confirm("Закрыть редактор без сохранения?")
            )
              return;
            setData(null);
            return;
          }
          setBusy(true);
          setError("");
          try {
            const value = await requestJson<Data>(
              `/api/translations?entityId=${entry.id}`,
            );
            setData(value);
            fill(value, field);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Не удалось открыть редактор.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {data ? "Закрыть редактор перевода" : "Мой перевод / пояснение"}
      </button>
      {error && (
        <p role="alert">
          {error} {!data && <a href="/login">Вход в аккаунт</a>}
        </p>
      )}
      {data && (
        <div className="translation-editor">
          <p>
            Личный текст применяется только к названию или основному описанию в
            открываемой карточке. Поиск, отдельные умения и игровые числа
            сохраняют данные библиотеки.
          </p>
          <label>
            Поле
            <select
              disabled={busy}
              value={field}
              onChange={(e) => {
                const key = e.target.value as typeof field;
                if (
                  text !==
                    (data.overrides.find((o) => o.field === field)
                      ?.customValue ?? data.original[field]) &&
                  !window.confirm("Сменить поле без сохранения?")
                )
                  return;
                setField(key);
                fill(data, key);
              }}
            >
              <option value="descriptionRu">Описание</option>
              <option value="nameRu">Название</option>
            </select>
          </label>
          <label>
            Ваш вариант
            <textarea
              rows={field === "nameRu" ? 2 : 9}
              maxLength={field === "nameRu" ? 500 : 50000}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={busy || !text.trim()}
            onClick={() => void save(false)}
          >
            Сохранить мой текст
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Удалить ваш вариант этого поля и показать текст библиотеки?",
                )
              )
                void save(true);
            }}
          >
            Вернуть текст библиотеки
          </button>
        </div>
      )}
    </section>
  );
}
