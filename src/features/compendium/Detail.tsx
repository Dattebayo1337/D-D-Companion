import { OfflineSave } from "./OfflineSave";
import { isPersonalMonster } from "@/entities/custom-monster";
import type { Monster } from "@/entities/content";
import { EntryIcon, EntrySummary } from "./EntrySummary";
import { ReferenceLinks } from "./ReferenceLinks";
import { EditionComparison } from "./EditionComparison";
import { PersonalTranslations } from "./PersonalTranslations";
import { ReadingBookmark } from "./ReadingBookmark";
import { requestJson } from "@/shared/client";
import type { PersonalizedContent } from "@/services/personal-translations";
import { referenceLabels } from "@/localization/reference";
import { RulesText } from "./RulesText";
import { readingContent } from "@/domain/reading-content";
import { X, BookOpen, Shield, Heart } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useContext,
  useState,
} from "react";
import { WorkshopNavigation } from "../workshop/navigation";
import type { Content, SourceBook } from "@/entities/content";
import {
  abilityLabels,
  castingLabels,
  componentLabels,
  damageLabels,
  distanceLabel,
  editionLabels,
  originLabels,
  schoolLabels,
  sizeLabels,
  typeLabels,
} from "@/localization/labels";
import type { Settings } from "../shell/types";
export function Detail({
  entry: initialEntry,
  sources,
  settings,
  close: onClose,
  open: onOpen,
  editMonster,
  copyMonster,
  allowClone = true,
}: {
  entry: Content;
  sources: SourceBook[];
  settings: Settings;
  close: () => void;
  open: (entry: Content) => void;
  editMonster?: (entry: Monster) => void;
  copyMonster?: (entry: Monster) => void;
  allowClone?: boolean;
}) {
  const [resolved, setResolved] = useState<{
    base: Content;
    value: Content;
  } | null>(null);
  const entry = resolved?.base === initialEntry ? resolved.value : initialEntry;
  useEffect(() => {
    if (
      isPersonalMonster(initialEntry) ||
      initialEntry.translationStatus !== "Approved" ||
      !allowClone
    )
      return;
    const controller = new AbortController();
    requestJson<Content>(`/api/content/${initialEntry.id}`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted)
          setResolved({ base: initialEntry, value });
      })
      .catch(() => {
        /* Previews and unavailable records retain the supplied snapshot. */
      });
    return () => controller.abort();
  }, [initialEntry, allowClone]);
  const personalText = (entry as PersonalizedContent).personalText;
  const dialog = useRef<HTMLDialogElement>(null);
  const [translationDirty, setTranslationDirty] = useState(false);
  const canLeave = () =>
    !translationDirty ||
    window.confirm(
      "В редакторе перевода есть несохранённые изменения. Покинуть карточку?",
    );
  const close = () => {
    if (canLeave()) onClose();
  };
  const open = (next: Content) => {
    if (canLeave()) onOpen(next);
  };
  const clone = useContext(WorkshopNavigation);
  const outsideStart = useRef(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const expanded = expandedEntry === entry.id;
  const summaryOnly = entry.contentOrigin === "MetadataOnly";
  const { features, properties, progression, hasDetails } =
    readingContent(entry);
  const detailLabel =
    entry.kind === "Reference" ? "Описание и умения" : "Описание и правила";
  useLayoutEffect(() => {
    dialog.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [entry.id, expanded]);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, [entry.id]);
  const source = sources.find((s) => s.id === entry.sourceBookId);
  return (
    <dialog
      className={`detail-dialog reading-dialog${
        entry.kind === "Monster" ||
        (entry.kind === "Reference" &&
          ["Class", "Subclass", "Rule"].includes(entry.reference.category))
          ? " reading-dialog-wide"
          : ""
      }`}
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onPointerDown={(event) => {
        const r = event.currentTarget.getBoundingClientRect();
        outsideStart.current =
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom;
      }}
      onClick={(event) => {
        const r = event.currentTarget.getBoundingClientRect();
        if (
          outsideStart.current &&
          (event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom)
        )
          close();
        outsideStart.current = false;
      }}
    >
      <article>
        <header>
          <span className="badge">
            {entry.kind === "Spell"
              ? "Заклинание"
              : entry.kind === "Reference"
                ? referenceLabels[entry.reference.category]
                : "Существо"}{" "}
            · {editionLabels[entry.edition]}
          </span>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Закрыть карточку"
          >
            <X size={20} />
          </button>
        </header>
        <h2 className="entry-title">
          <EntryIcon entry={entry} size={32} />
          {entry.nameRu}
        </h2>
        {allowClone &&
          !isPersonalMonster(entry) &&
          entry.translationStatus === "Approved" && (
            <ReadingBookmark key={entry.id} entry={entry} />
          )}
        {allowClone &&
          !isPersonalMonster(entry) &&
          entry.translationStatus === "Approved" && (
            <OfflineSave ids={[entry.id]} />
          )}
        {!!personalText?.fields.length && (
          <p className="detail-content-note">
            Показан ваш личный перевод. Сравнение редакций использует исходные
            тексты библиотеки.
          </p>
        )}
        {settings.showOriginal && (
          <p className="original">{entry.nameOriginal}</p>
        )}
        <p className="detail-subtitle">
          {entry.kind === "Spell"
            ? `${entry.spell.level === 0 ? "Заговор" : `${entry.spell.level}-й уровень`} · ${schoolLabels[entry.spell.school]}`
            : entry.kind === "Reference"
              ? referenceLabels[entry.reference.category]
              : `${sizeLabels[entry.monster.size]} · ${typeLabels[entry.monster.type]} · ${entry.monster.alignmentRu}`}
        </p>
        <nav className="detail-reading-mode" aria-label="Режим описания">
          <button
            className={`button ${!expanded ? "primary" : "secondary"}`}
            aria-pressed={!expanded}
            onClick={() => setExpandedEntry(null)}
          >
            Кратко
          </button>
          {hasDetails && (
            <button
              className={`button ${expanded ? "primary" : "secondary"}`}
              aria-pressed={expanded}
              onClick={() => setExpandedEntry(entry.id)}
            >
              {detailLabel}
            </button>
          )}
          {summaryOnly && /^https?:\/\//i.test(entry.source) && (
            <a
              className="button secondary"
              href={entry.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              Полные правила в источнике ↗
            </a>
          )}
        </nav>
        {!expanded && <EntrySummary entry={entry} />}
        {!hasDetails && (
          <p className="detail-content-note">
            {summaryOnly
              ? "В этой записи пока есть только краткий обзор. Полные правила доступны по ссылке на источник."
              : "Весь сохранённый текст этой записи помещается в кратком режиме."}
          </p>
        )}
        {editMonster && isPersonalMonster(entry) && (
          <button
            className="button secondary"
            onClick={() => editMonster(entry)}
          >
            Редактировать моего монстра
          </button>
        )}
        {entry.kind === "Monster" && copyMonster ? (
          <button className="quiet-button" onClick={() => copyMonster(entry)}>
            Создать свою версию
          </button>
        ) : (
          allowClone &&
          clone && (
            <button
              className="button secondary"
              onClick={() => {
                if (!canLeave()) return;
                onClose();
                clone(entry);
              }}
            >
              Создать авторскую копию
            </button>
          )
        )}
        {expanded && hasDetails && (
          <div className="detail-full-description" aria-label={detailLabel}>
            {summaryOnly && (
              <p className="detail-content-note">
                В базе сохранён авторский обзор. Полный текст правил, таблицы и
                исключения доступны по кнопке источника выше.
              </p>
            )}
            {entry.kind === "Reference" ? (
              <>
                <RulesText text={entry.descriptionRu} />
                {properties.length > 0 && (
                  <section aria-label="Свойства записи">
                    <h3>Свойства</h3>
                    <div className="detail-facts">
                      {properties.map((property, index) => (
                        <Fact
                          key={index}
                          label={property.nameRu}
                          value={property.valueRu}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {progression.length > 0 && (
                  <section aria-label="Развитие по уровням">
                    <h3>Развитие по уровням</h3>
                    <div className="rules-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Уровень</th>
                            <th>Бонус мастерства</th>
                            <th>Умения</th>
                            <th>Ресурсы</th>
                            <th>Ячейки заклинаний</th>
                          </tr>
                        </thead>
                        <tbody>
                          {progression.map((row) => (
                            <tr key={row.level}>
                              <td>{row.level}</td>
                              <td>+{row.proficiencyBonus}</td>
                              <td>{row.featuresRu}</td>
                              <td>{row.resourcesRu || "—"}</td>
                              <td>
                                {row.spellSlots
                                  .map((count, index) =>
                                    count ? `${index + 1}-й: ${count}` : "",
                                  )
                                  .filter(Boolean)
                                  .join("; ") || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {features.length > 0 && (
                  <section aria-label="Умения и особенности">
                    <h3>Ключевые особенности по уровням</h3>
                    {features.map((feature, index) => (
                      <section key={`${feature.level}-${index}`}>
                        <h4>
                          {feature.level !== null
                            ? `${feature.level}-й уровень · ${feature.nameRu}`
                            : feature.nameRu}
                        </h4>
                        <RulesText text={feature.descriptionRu} />
                      </section>
                    ))}
                  </section>
                )}
              </>
            ) : entry.kind === "Spell" ? (
              <>
                <div className="detail-facts">
                  <Fact
                    label="Время накладывания"
                    value={
                      entry.spell.castingTimeRu ||
                      castingLabels[entry.spell.castingTime]
                    }
                  />
                  <Fact
                    label="Дальность"
                    value={
                      entry.spell.rangeKind === "Distance"
                        ? distanceLabel(entry.spell.rangeFeet, settings.metric)
                        : entry.spell.rangeRu ||
                          (
                            {
                              Self: "На себя",
                              Touch: "Касание",
                              Sight: "В пределах видимости",
                              Unlimited: "Неограниченная",
                              Special: "Особая",
                            } as const
                          )[entry.spell.rangeKind]
                    }
                  />
                  <Fact label="Длительность" value={entry.spell.durationRu} />
                  <Fact
                    label="Компоненты"
                    value={entry.spell.components
                      .map((c) => componentLabels[c])
                      .join(", ")}
                  />
                </div>
                {entry.spell.classes.length > 0 && (
                  <Fact label="Классы" value={entry.spell.classes.join(", ")} />
                )}
                <div className="tags">
                  {entry.spell.ritual && <span>Ритуал</span>}
                  {entry.spell.concentration && <span>Концентрация</span>}
                </div>
                <RulesText text={entry.descriptionRu} />
                {entry.spell.targetRu && (
                  <Fact label="Цель" value={entry.spell.targetRu} />
                )}{" "}
                {entry.spell.materialComponentRu && (
                  <Fact
                    label="Материальный компонент"
                    value={entry.spell.materialComponentRu}
                  />
                )}
                <div className="detail-facts">
                  {entry.spell.damage && (
                    <Fact
                      label="Урон"
                      value={`${entry.spell.damage} ${entry.spell.damageType ? damageLabels[entry.spell.damageType] : ""}`}
                    />
                  )}{" "}
                  {entry.spell.healing && (
                    <Fact label="Лечение" value={entry.spell.healing} />
                  )}{" "}
                  {entry.spell.savingThrow && (
                    <Fact
                      label="Спасбросок"
                      value={abilityLabels[entry.spell.savingThrow]}
                    />
                  )}{" "}
                  {entry.spell.attackType && (
                    <Fact
                      label="Атака"
                      value={
                        entry.spell.attackType === "Melee"
                          ? "Рукопашная"
                          : "Дальнобойная"
                      }
                    />
                  )}
                </div>
                {entry.spell.higherLevelsRu && (
                  <>
                    <h3>На более высоких уровнях</h3>
                    <RulesText text={entry.spell.higherLevelsRu} />
                  </>
                )}
              </>
            ) : entry.monster.statBlockComplete ? (
              <RulesText text={entry.descriptionRu} />
            ) : (
              <>
                <div className="monster-vitals">
                  <span>
                    <Shield size={19} /> <b>{entry.monster.armorClass}</b> Класс
                    доспеха
                  </span>
                  <span>
                    <Heart size={19} /> <b>{entry.monster.hitPoints}</b> Хиты (
                    {entry.monster.hitDice})
                  </span>
                </div>
                <div className="ability-grid">
                  {Object.entries(entry.monster.abilities).map(
                    ([key, value]) => (
                      <div key={key}>
                        <small>
                          {abilityLabels[key as keyof typeof abilityLabels]}
                        </small>
                        <strong>{value}</strong>
                      </div>
                    ),
                  )}
                </div>
                <div className="detail-facts">
                  <Fact
                    label="Скорость"
                    value={Object.entries(entry.monster.speed)
                      .filter(([, v]) => v > 0)
                      .map(
                        ([k, v]) =>
                          `${({ walk: "Ходьба", fly: "Полёт", swim: "Плавание", climb: "Лазание", burrow: "Копание" } as Record<string, string>)[k]} ${distanceLabel(v, settings.metric)}`,
                      )
                      .join(", ")}
                  />
                  <Fact
                    label="Опасность"
                    value={`${entry.monster.challengeRating} · ${entry.monster.xp} опыта`}
                  />
                  <Fact label="Чувства" value={entry.monster.sensesRu} />
                  <Fact label="Языки" value={entry.monster.languagesRu} />
                  <Fact
                    label="Бонус мастерства"
                    value={`+${entry.monster.proficiencyBonus}`}
                  />
                </div>
                <RulesText text={entry.descriptionRu} />
                {[
                  ["Спасброски", entry.monster.savingThrowsRu],
                  ["Навыки", entry.monster.skillsRu],
                  [
                    "Сопротивления",
                    entry.monster.resistances
                      .map((x) => damageLabels[x])
                      .join(", "),
                  ],
                  [
                    "Иммунитеты к урону",
                    entry.monster.immunities
                      .map((x) => damageLabels[x])
                      .join(", "),
                  ],
                  [
                    "Уязвимости",
                    entry.monster.vulnerabilities
                      .map((x) => damageLabels[x])
                      .join(", "),
                  ],
                  [
                    "Иммунитеты к состояниям",
                    entry.monster.conditionImmunities.join(", "),
                  ],
                  ["Заклинания", entry.monster.spellcastingRu],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <Fact key={label} label={label} value={value} />
                  ))}
                {(
                  [
                    ["Особенности", entry.monster.traits],
                    ["Действия", entry.monster.actions],
                    ["Бонусные действия", entry.monster.bonusActions],
                    ["Реакции", entry.monster.reactions],
                    ["Легендарные действия", entry.monster.legendaryActions],
                    ["Действия логова", entry.monster.lairActions],
                    ["Региональные эффекты", entry.monster.regionalEffects],
                  ] as const
                )
                  .filter(([, v]) => v.length)
                  .map(([label, list]) => (
                    <section key={label}>
                      <h3>{label}</h3>
                      {list.map((f, i) => (
                        <div className="monster-feature" key={i}>
                          <h4>{f.nameRu}</h4>
                          <RulesText text={f.descriptionRu} />
                        </div>
                      ))}
                    </section>
                  ))}
              </>
            )}
          </div>
        )}
        {entry.kind === "Reference" && (
          <ReferenceLinks key={entry.id} entry={entry} open={open} />
        )}
        {!isPersonalMonster(entry) && (
          <>
            <PersonalTranslations
              key={`personal-${entry.id}`}
              entry={entry}
              saved={onOpen}
              dirtyChanged={setTranslationDirty}
            />
            <EditionComparison key={entry.id} entry={entry} />
          </>
        )}
        <footer className="detail-source">
          <BookOpen size={17} />
          <div>
            <strong>
              {isPersonalMonster(entry)
                ? entry.source
                : (source?.fullNameRu ?? entry.source)}
            </strong>
            <p>
              {originLabels[entry.contentOrigin]} · Версия{" "}
              {entry.contentVersion}{" "}
              {entry.sourcePage && `· стр. ${entry.sourcePage}`}
            </p>
            <small>{entry.license}</small>
            {entry.contentOrigin === "MetadataOnly" &&
              /^https?:\/\//i.test(entry.source) && (
                <p>
                  <a
                    href={entry.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Источник сводки ↗
                  </a>
                </p>
              )}
          </div>
        </footer>
      </article>
    </dialog>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <small>{label}</small>
      <span>{value}</span>
    </div>
  );
}
