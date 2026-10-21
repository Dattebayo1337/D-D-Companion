import type { CharacterData } from "@/entities/character";
import { skillLabels } from "@/entities/character";
import type { Content } from "@/entities/content";
import {
  abilityLabels,
  castingLabels,
  componentLabels,
  schoolLabels,
} from "@/localization/labels";
import {
  deriveCharacter,
  classRules,
  castingAbility,
} from "@/domain/rules/character";
import { RulesText } from "../compendium/RulesText";
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
export function SharedSheet({
  character: c,
  content,
}: {
  character: CharacterData;
  content: Content[];
}) {
  const entries = new Map(content.map((e) => [e.id, e]));
  const name = (id: string) =>
    entries.get(id)?.nameRu ?? "Запись справочника недоступна";
  const supported = c.classes.every((x) => classRules[x.classId]);
  const stats = supported ? deriveCharacter(c) : null;
  const rule = (id: string) => {
    const entry = entries.get(id);
    return (
      entry && (
        <details className="lobby-rule" key={id}>
          <summary>{entry.nameRu}</summary>
          {entry.kind === "Spell" && (
            <div className="detail-facts">
              <p>
                {entry.spell.level === 0
                  ? "Заговор"
                  : `${entry.spell.level}-й уровень`}{" "}
                · {schoolLabels[entry.spell.school]}
              </p>
              <p>
                Время:{" "}
                {entry.spell.castingTimeRu ||
                  castingLabels[entry.spell.castingTime]}
              </p>
              <p>
                Дальность:{" "}
                {entry.spell.rangeRu ||
                  (entry.spell.rangeKind === "Distance"
                    ? `${entry.spell.rangeFeet} фт.`
                    : (
                        {
                          Self: "На себя",
                          Touch: "Касание",
                          Sight: "В пределах видимости",
                          Unlimited: "Неограниченная",
                          Special: "Особая",
                        } as Record<string, string>
                      )[entry.spell.rangeKind])}
              </p>
              <p>
                Длительность: {entry.spell.durationRu}
                {entry.spell.concentration ? " · Концентрация" : ""}
                {entry.spell.ritual ? " · Ритуал" : ""}
              </p>
              <p>
                Компоненты:{" "}
                {entry.spell.components
                  .map((c) => componentLabels[c])
                  .join(", ")}
                {entry.spell.materialComponentRu &&
                  ` — ${entry.spell.materialComponentRu}`}
              </p>
            </div>
          )}
          <RulesText text={entry.descriptionRu} />
          {entry.kind === "Spell" && entry.spell.higherLevelsRu && (
            <>
              <h4>На более высоких уровнях</h4>
              <RulesText text={entry.spell.higherLevelsRu} />
            </>
          )}
          {entry.kind === "Reference" &&
            entry.reference.properties.length > 0 && (
              <dl>
                {entry.reference.properties.map((p, i) => (
                  <div key={i}>
                    <dt>
                      <b>{p.nameRu}</b>
                    </dt>
                    <dd>{p.valueRu}</dd>
                  </div>
                ))}
              </dl>
            )}
          {entry.kind === "Reference" &&
            entry.reference.features
              .filter((f) => !entry.descriptionRu.includes(f.descriptionRu))
              .map((f, i) => (
                <section key={i}>
                  <h4>
                    {f.level ? `${f.level}-й уровень · ` : ""}
                    {f.nameRu}
                  </h4>
                  <RulesText text={f.descriptionRu} />
                </section>
              ))}
        </details>
      )
    );
  };
  return (
    <article className="shared-sheet" aria-label={`Полный лист: ${c.name}`}>
      <header>
        <p className="eyebrow">
          ПОЛНЫЙ ЛИСТ · ТОЛЬКО ПРОСМОТР ·{" "}
          {c.edition === "5e_2014" ? "2014" : "2024"}
        </p>
        <h2>{c.name}</h2>
        <p>
          {name(c.speciesRaceId)} · {name(c.backgroundId)}
        </p>
        <p>
          {c.classes
            .map(
              (x) =>
                `${name(x.classId)} ${x.level}${x.subclassId ? ` — ${name(x.subclassId)}` : ""}`,
            )
            .join(" · ")}
        </p>
        <p>
          Опыт: {c.experience} · Мировоззрение: {c.alignment || "не указано"}
        </p>
      </header>
      {!stats && (
        <p role="status">
          Для этого класса нет автоматического расчёта. Ниже показаны
          сохранённые значения.
        </p>
      )}
      <div className="lobby-stats">
        <div>
          <small>Хиты</small>
          <strong>
            {c.hp} / {stats?.maxHp ?? "—"}
          </strong>
          <small>Временные: {c.tempHp}</small>
        </div>
        <div>
          <small>КД</small>
          <strong>{stats?.ac ?? c.adjustments.ac ?? "—"}</strong>
        </div>
        <div>
          <small>Инициатива</small>
          <strong>{stats ? signed(stats.initiative) : "—"}</strong>
        </div>
        <div>
          <small>Скорость</small>
          <strong>{c.adjustments.speed} фт.</strong>
        </div>
        <div>
          <small>Мастерство</small>
          <strong>{stats ? signed(stats.proficiency) : "—"}</strong>
        </div>
        <div>
          <small>Пассивная внимательность</small>
          <strong>{stats?.passivePerception ?? "—"}</strong>
        </div>
      </div>
      <h3>Характеристики и спасброски</h3>
      <div className="lobby-stats">
        {Object.entries(c.abilities).map(([key, value]) => (
          <div key={key}>
            <small>{abilityLabels[key as keyof typeof abilityLabels]}</small>
            <strong>
              {stats?.scores[key as keyof typeof c.abilities] ?? value}{" "}
              {stats &&
                `(${signed(stats.mods[key as keyof typeof c.abilities])})`}
            </strong>
            <small>
              База {value}, поправка +
              {c.abilityBonuses[key as keyof typeof c.abilities] ?? 0}
            </small>
            <small>Спасбросок: {stats ? signed(stats.saves[key]) : "—"}</small>
          </div>
        ))}
      </div>
      <h3>Навыки</h3>
      <div className="lobby-skills">
        {Object.entries(skillLabels).map(([key, label]) => (
          <p key={key}>
            {label} <b>{stats ? signed(stats.skills[key]) : "—"}</b>
          </p>
        ))}
      </div>
      <h3>Состояния и ресурсы</h3>
      <p>
        Истощение: {c.exhaustion} · Спасброски от смерти: {c.deathSaves.success}{" "}
        успеха / {c.deathSaves.failure} провала
      </p>
      <p>Концентрация: {c.concentrationId ? name(c.concentrationId) : "нет"}</p>
      <p>Состояния: {c.conditionIds.map(name).join(", ") || "нет"}</p>
      {stats?.hitDice.map((d) => (
        <p key={d.classId}>
          Кости хитов · {name(d.classId)}: {d.remaining} / {d.max} к{d.die}
        </p>
      ))}
      {stats?.resources.map((r) => (
        <p key={r.key}>
          {r.name}: {Math.max(0, r.max - (c.resourcesUsed[r.key] ?? 0))} /{" "}
          {r.max}
        </p>
      ))}
      <h3>Инвентарь и деньги</h3>
      <div className="rules-table">
        <table>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Количество</th>
              <th>Экипирован</th>
              <th>Настройка</th>
            </tr>
          </thead>
          <tbody>
            {c.inventory.map((i) => (
              <tr key={i.id}>
                <td>{name(i.contentId)}</td>
                <td>{i.quantity}</td>
                <td>{i.equipped ? "Да" : "Нет"}</td>
                <td>{i.attuned ? "Да" : "Нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!c.inventory.length && <p>Инвентарь пуст.</p>}
      <p>
        {Object.entries(c.currency)
          .map(
            ([k, v]) =>
              `${({ CP: "Медь", SP: "Серебро", EP: "Электрум", GP: "Золото", PP: "Платина" } as Record<string, string>)[k]}: ${v}`,
          )
          .join(" · ")}
      </p>
      {[...new Set(c.inventory.map((i) => i.contentId))].map(rule)}
      <h3>Заклинания</h3>
      {stats?.slots.map(
        (max, index) =>
          max > 0 && (
            <p key={index}>
              Ячейки {index + 1}-го уровня:{" "}
              {Math.max(0, max - c.slotsSpent[index])} / {max}
            </p>
          ),
      )}
      {!!stats?.pact.max && (
        <p>
          Магия договора, {stats.pact.level}-й уровень:{" "}
          {Math.max(0, stats.pact.max - c.pactSpent)} / {stats.pact.max}
        </p>
      )}
      {stats &&
        c.classes
          .filter((x) => castingAbility(x.classId))
          .map((x) => {
            const a = castingAbility(x.classId)!;
            return (
              <p key={x.classId}>
                {name(x.classId)}: Сл {8 + stats.proficiency + stats.mods[a]},
                атака {signed(stats.proficiency + stats.mods[a])}
              </p>
            );
          })}
      {!c.spells.length && <p>Заклинания не выбраны.</p>}
      {c.spells.map((s, i) => (
        <section key={i}>
          <p>
            {name(s.classId)} ·{" "}
            {
              {
                Known: "Известно",
                Prepared: "Подготовлено",
                Always: "Всегда подготовлено",
              }[s.status]
            }
          </p>
          {rule(s.spellId)}
        </section>
      ))}
      <h3>Умения и происхождение</h3>
      {[
        ...new Set([
          c.speciesRaceId,
          c.backgroundId,
          ...c.classes.flatMap((x) => [
            x.classId,
            ...(x.subclassId ? [x.subclassId] : []),
          ]),
          ...c.featIds,
          ...c.conditionIds,
        ]),
      ].map(rule)}
      <h3>Языки и владения</h3>
      <RulesText text={c.languages || "Языки не указаны."} />
      <RulesText
        text={c.proficiencies || "Дополнительные владения не указаны."}
      />
      <h3>Заметки персонажа</h3>
      <RulesText text={c.notes || "Заметок нет."} />
    </article>
  );
}
