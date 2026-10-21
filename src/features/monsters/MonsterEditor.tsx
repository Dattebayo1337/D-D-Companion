"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { EditionId, Monster, SourceBook } from "@/entities/content";
import {
  customMonsterData,
  isPersonalMonster,
  type PersonalMonster,
} from "@/entities/custom-monster";
import { blankContent } from "@/entities/workshop";
import { Fields, fieldTitle } from "../workshop/Fields";
import { Detail } from "../compendium/Detail";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
const groups = [
  [
    "Параметры существа",
    [
      "size",
      "type",
      "subtypeRu",
      "alignmentRu",
      "armorClass",
      "armorTypeRu",
      "hitPoints",
      "hitDice",
      "challengeRating",
      "xp",
      "proficiencyBonus",
    ],
  ],
  ["Характеристики и передвижение", ["abilities", "speed"]],
  [
    "Навыки, чувства и языки",
    ["savingThrowsRu", "skillsRu", "sensesRu", "languagesRu", "environment"],
  ],
  [
    "Сопротивления и иммунитеты",
    ["resistances", "immunities", "vulnerabilities", "conditionImmunities"],
  ],
  [
    "Особенности и действия",
    ["traits", "actions", "bonusActions", "reactions", "spellcastingRu"],
  ],
  [
    "Легендарные способности и логово",
    ["legendaryActions", "lairActions", "regionalEffects"],
  ],
] as const;
export function MonsterEditor({
  initial,
  copy = false,
  edition,
  sources,
  settings,
  close,
  saved,
}: {
  initial?: Monster;
  copy?: boolean;
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
  close: () => void;
  saved: (entry: PersonalMonster) => void;
}) {
  const [base] = useState<Monster>(
    () =>
      initial ??
      (blankContent("Monster", edition, crypto.randomUUID()) as Monster),
  );
  const original =
    initial && isPersonalMonster(initial) && !copy ? initial : null;
  const [name, setName] = useState(
    copy ? `${base.nameRu.slice(0, 175)} — своя версия` : base.nameRu,
  );
  const [description, setDescription] = useState(
    copy && base.monster.statBlockComplete
      ? `Авторская версия существа «${base.nameRu}».`
      : base.descriptionRu,
  );
  const [monster, setMonster] = useState({
    ...base.monster,
    statBlockComplete: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<Monster | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    outside = useRef(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  function dismiss() {
    if (
      !busy &&
      (!dirty || window.confirm("Закрыть редактор без сохранения изменений?"))
    )
      close();
  }
  function data() {
    return {
      nameRu: name,
      descriptionRu: description,
      edition: base.edition,
      monster,
      source: copy
        ? `Авторская версия: ${base.source}`.slice(0, 1000)
        : (original?.source ?? "Мой бестиарий"),
      license: initial ? base.license : "Личный авторский материал",
    };
  }
  async function submit(archive?: boolean) {
    const parsed = customMonsterData.safeParse(data());
    if (archive === undefined && !parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${fieldTitle(i.path.join("."))}: ${i.message}`)
          .join("\n"),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestJson<PersonalMonster>(
        "/api/custom-monsters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            archive === undefined
              ? {
                  action: "save",
                  ...(original ? { id: original.id } : {}),
                  version: original?.contentVersion ?? 0,
                  data: parsed.success ? parsed.data : data(),
                }
              : {
                  action: "archive",
                  id: original!.id,
                  version: original!.contentVersion,
                  archived: archive,
                },
          ),
        },
      );
      saved(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <dialog
        ref={dialog}
        className="detail-dialog reading-dialog-wide monster-editor workshop"
        aria-label={original ? "Редактирование монстра" : "Создание монстра"}
        onCancel={(e) => {
          e.preventDefault();
          dismiss();
        }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          outside.current =
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom;
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            outside.current &&
            (e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom)
          )
            dismiss();
          outside.current = false;
        }}
      >
        <header className="lobby-heading">
          <div>
            <p className="eyebrow">МОЙ БЕСТИАРИЙ · {base.edition.slice(3)}</p>
            <h2>
              {original
                ? "Редактировать монстра"
                : copy
                  ? "Своя версия существа"
                  : "Создать монстра"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Закрыть редактор монстра"
            disabled={busy}
            onClick={dismiss}
          >
            <X size={22} />
          </button>
        </header>
        <p>
          Запись видна только вашему аккаунту. Её можно использовать в
          калькуляторе сложности, боях и личных коллекциях.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          onChange={() => setDirty(true)}
        >
          <fieldset disabled={busy} className="monster-editor-body">
            <label>
              Название монстра
              <input
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Описание монстра
              <textarea
                rows={4}
                maxLength={50000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <p className="muted">
              Опасность указывайте как 0, 0.125 (1/8), 0.25 (1/4), 0.5 (1/2) или
              целое число от 1 до 30. Опыт задаётся отдельно; баланс существа
              определяет автор.
            </p>
            {groups.map(([title, keys], i) => (
              <details
                key={title}
                open={i < 2}
                className="monster-editor-section"
              >
                <summary>{title}</summary>
                <Fields
                  classes={[]}
                  value={Object.fromEntries(keys.map((k) => [k, monster[k]]))}
                  change={(value) => {
                    setMonster((previous) => ({ ...previous, ...value }));
                    setDirty(true);
                  }}
                />
              </details>
            ))}
            {initial && (
              <p className="muted">
                Основа: {base.source}. Условия: {base.license}
              </p>
            )}
          </fieldset>
          {error && (
            <p
              className="error"
              role="alert"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {error}
            </p>
          )}
          <div className="monster-editor-actions">
            <button type="submit" disabled={busy} className="button primary">
              {busy ? "Сохранение…" : "Сохранить монстра"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                setPreview({
                  ...base,
                  nameRu: name || "Новое существо",
                  descriptionRu: description,
                  monster,
                })
              }
            >
              Предпросмотр
            </button>
            <button
              type="button"
              className="quiet-button"
              disabled={busy}
              onClick={dismiss}
            >
              Отмена
            </button>
            {original && (
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "Изменения формы не будут сохранены. Продолжить?",
                    )
                  )
                    void submit(!original.personalArchived);
                }}
              >
                {original.personalArchived
                  ? "Восстановить из архива"
                  : "Убрать в архив"}
              </button>
            )}
          </div>
        </form>
      </dialog>
      {preview && (
        <Detail
          entry={preview}
          allowClone={false}
          sources={sources}
          settings={settings}
          close={() => setPreview(null)}
          open={() => {}}
        />
      )}
    </>
  );
}
