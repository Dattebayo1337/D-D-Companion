import type { CharacterData } from "@/entities/character";
import type { Content } from "@/entities/content";
import { SharedSheet } from "../lobby/SharedSheet";
import { RulesText } from "../compendium/RulesText";
import { PrintPreview } from "./PrintPreview";
import { castingLabels, componentLabels } from "@/localization/labels";
export function CharacterPrint({
  character,
  content,
}: {
  character: CharacterData;
  content: Content[];
}) {
  const ids = new Set(
    character.spells.filter((s) => s.status !== "Known").map((s) => s.spellId),
  );
  return (
    <div className="print-actions">
      <PrintPreview title="Печатный лист">
        <SharedSheet character={character} content={content} />
      </PrintPreview>
      <PrintPreview title="Памятка заклинаний">
        <h1>{character.name} · подготовленные заклинания</h1>
        <p>
          Редакция {character.edition === "5e_2014" ? "2014" : "2024"}.
          Подготовленные и всегда доступные.
        </p>
        {!ids.size && <p>Подготовленные заклинания не выбраны.</p>}
        {[...ids].map((id) => {
          const e = content.find((e) => e.id === id && e.kind === "Spell");
          return (
            <section key={id} className="print-spell">
              <h2>{e?.nameRu ?? "Заклинание недоступно"}</h2>
              {e?.kind === "Spell" && (
                <>
                  <p>
                    Уровень {e.spell.level} ·{" "}
                    {e.spell.castingTimeRu ||
                      castingLabels[e.spell.castingTime]}{" "}
                    ·{" "}
                    {e.spell.rangeRu ||
                      (e.spell.rangeKind === "Distance"
                        ? `${e.spell.rangeFeet} фт.`
                        : {
                            Self: "На себя",
                            Touch: "Касание",
                            Sight: "Видимость",
                            Unlimited: "Неограниченная",
                            Special: "Особая",
                          }[e.spell.rangeKind])}{" "}
                    · {e.spell.durationRu}
                  </p>
                  <p>
                    Компоненты:{" "}
                    {e.spell.components
                      .map((c) => componentLabels[c])
                      .join(", ")}
                    {e.spell.concentration ? " · Концентрация" : ""}
                    {e.spell.ritual ? " · Ритуал" : ""}
                  </p>
                  <RulesText text={e.spell.materialComponentRu} />
                  <RulesText text={e.spell.targetRu} />
                  <RulesText text={e.descriptionRu} />
                  {!!e.spell.higherLevelsRu && (
                    <>
                      <h3>На больших уровнях</h3>
                      <RulesText text={e.spell.higherLevelsRu} />
                    </>
                  )}
                  <p>Источник: {e.source}</p>
                </>
              )}
            </section>
          );
        })}
      </PrintPreview>
    </div>
  );
}
