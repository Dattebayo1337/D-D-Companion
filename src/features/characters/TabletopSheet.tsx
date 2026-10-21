import { useState } from "react";
import type { CharacterData } from "@/entities/character";
import type { Content } from "@/entities/content";
import type { deriveCharacter } from "@/domain/rules/character";
import { contentSummary, shortPassage } from "@/domain/content-summary";

export function TabletopSheet({
  character: c,
  stats,
  entries,
  command,
  patch,
  open,
  navigate,
}: {
  character: CharacterData;
  stats: ReturnType<typeof deriveCharacter>;
  entries: Content[];
  command: (
    action: string,
    extra?: Record<string, unknown>,
  ) => Promise<boolean>;
  patch: (patch: Partial<CharacterData>) => void;
  open: (entry: Content) => void;
  navigate: (tab: string) => void;
}) {
  const [amount, setAmount] = useState("1");
  const value = Number(amount);
  const valid =
    amount.trim() !== "" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 100000;
  const entry = (id: string) => entries.find((e) => e.id === id);
  const spellIds = [
    ...new Set(
      c.spells.filter((s) => s.status !== "Known").map((s) => s.spellId),
    ),
  ];
  return (
    <div className="tabletop-sheet">
      <section className="tool-panel">
        <h2>Хиты и состояние</h2>
        <p className="tabletop-hp">
          {c.hp} / {stats.maxHp} <small>хитов · временных: {c.tempHp}</small>
        </p>
        <label>
          Количество
          <input
            type="number"
            min={1}
            max={100000}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <div className="character-row">
          <button
            className="button secondary"
            disabled={!valid}
            onClick={() => void command("damage", { amount: value })}
          >
            Получить урон
          </button>
          <button
            className="button secondary"
            disabled={!valid}
            onClick={() => void command("heal", { amount: value })}
          >
            Лечение
          </button>
          <button
            className="button secondary"
            disabled={!valid}
            onClick={() => void command("tempHp", { amount: value })}
          >
            Временные хиты
          </button>
        </div>
        <p>
          Изменения сохраняются сразу. Вводите итоговый урон после сопротивлений
          и других поправок. Временные хиты не складываются: остаётся большее
          значение.
        </p>
        <h3>Концентрация</h3>
        {c.concentrationId ? (
          <>
            <button
              className="quiet-button"
              disabled={!entry(c.concentrationId)}
              onClick={() => {
                const item = entry(c.concentrationId!);
                if (item) open(item);
              }}
            >
              {entry(c.concentrationId)?.nameRu ?? "Заклинание недоступно"}
            </button>
            <button
              className="button secondary"
              onClick={() => patch({ concentrationId: null })}
            >
              Прекратить концентрацию
            </button>
          </>
        ) : (
          <p>Нет активной концентрации.</p>
        )}
        <h3>Состояния</h3>
        {c.conditionIds.length ? (
          c.conditionIds.map((id) => (
            <button
              key={id}
              className="button secondary"
              disabled={!entry(id)}
              onClick={() => {
                const item = entry(id);
                if (item) open(item);
              }}
            >
              {entry(id)?.nameRu ?? "Состояние недоступно"}
            </button>
          ))
        ) : (
          <p>Состояний нет.</p>
        )}
        <p>
          Истощение: {c.exhaustion}. Спасброски от смерти:{" "}
          {c.deathSaves.success} успехов, {c.deathSaves.failure} провалов.
        </p>
        <button className="quiet-button" onClick={() => navigate("Лист")}>
          Изменить состояния и спасброски
        </button>
      </section>
      <section className="tool-panel">
        <h2>Расходуемые способности</h2>
        {!stats.resources.length && (
          <p>
            Для этого персонажа нет автоматически отслеживаемых ресурсов. Особые
            способности доступны во вкладке «Умения».
          </p>
        )}
        {stats.resources.map((r) => {
          const spent = c.resourcesUsed[r.key] ?? 0;
          return (
            <div className="tabletop-resource" key={r.key}>
              <strong>
                {r.name}: {Math.max(0, r.max - spent)} / {r.max}
              </strong>
              <div className="character-row">
                <button
                  className="button secondary"
                  aria-label={`Потратить: ${r.name}`}
                  disabled={spent >= r.max}
                  onClick={() =>
                    void command("resource", { key: r.key, amount: spent + 1 })
                  }
                >
                  Потратить
                </button>
                <button
                  className="button secondary"
                  aria-label={`Вернуть: ${r.name}`}
                  disabled={!spent}
                  onClick={() =>
                    void command("resource", { key: r.key, amount: spent - 1 })
                  }
                >
                  Вернуть
                </button>
              </div>
            </div>
          );
        })}
        <button className="quiet-button" onClick={() => navigate("Умения")}>
          Все умения персонажа
        </button>
        <h3>Отдых завершён</h3>
        <div className="character-row">
          <button
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Применить восстановление после короткого отдыха? Кости хитов расходуются отдельно во вкладке «Лист».",
                )
              )
                void command("short");
            }}
          >
            Короткий отдых
          </button>
          <button
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Применить длительный отдых и восстановить хиты и ресурсы по редакции персонажа?",
                )
              )
                void command("long");
            }}
          >
            Длительный отдых
          </button>
        </div>
      </section>
      <section className="tool-panel">
        <h2>Ячейки заклинаний</h2>
        {!stats.slots.some(Boolean) && !stats.pact.max && (
          <p>Ячеек заклинаний нет.</p>
        )}
        <div className="character-stats">
          {stats.slots.map(
            (max, i) =>
              max > 0 && (
                <div key={i}>
                  <small>{i + 1}-й уровень</small>
                  <strong>
                    {Math.max(0, max - c.slotsSpent[i])} / {max}
                  </strong>
                </div>
              ),
          )}
        </div>
        {stats.pact.max > 0 && (
          <p>
            Магия договора: {Math.max(0, stats.pact.max - c.pactSpent)} /{" "}
            {stats.pact.max}, уровень ячейки {stats.pact.level}.
          </p>
        )}
        <button
          className="button secondary"
          onClick={() => navigate("Заклинания")}
        >
          Применить заклинание / управлять книгой
        </button>
        <h3>Подготовленные и всегда доступные</h3>
        {!spellIds.length && (
          <p>Отметьте нужные заклинания в книге персонажа.</p>
        )}
        {spellIds.map((id) => {
          const item = entry(id);
          return (
            <details key={id}>
              <summary>{item?.nameRu ?? "Заклинание недоступно"}</summary>
              {item && (
                <>
                  <p>{contentSummary(item).text}</p>
                  <button
                    className="button secondary"
                    onClick={() => open(item)}
                  >
                    Описание и правила
                  </button>
                </>
              )}
            </details>
          );
        })}
      </section>
      <section className="tool-panel">
        <h2>Под рукой</h2>
        <div className="character-row">
          <button
            className="button secondary"
            onClick={() => navigate("Инвентарь")}
          >
            Снаряжение и монеты
          </button>
          <button
            className="button secondary"
            onClick={() => navigate("Заметки")}
          >
            Заметки персонажа
          </button>
        </div>
        <p className="session-prose">
          {c.notes ? shortPassage(c.notes, 360) : "Заметок пока нет."}
        </p>
      </section>
    </div>
  );
}
