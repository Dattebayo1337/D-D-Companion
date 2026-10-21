import { useState } from "react";
import { z } from "zod";
import { Dices } from "lucide-react";
import { rollDice, type DiceMode } from "@/domain/rules/dice";
import { useToolDraft } from "./shared";
const historySchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      time: z.string(),
      formula: z.string(),
      mode: z.string(),
      name: z.string(),
      source: z.string(),
      rolls: z.array(z.number()),
      kept: z.array(z.number()),
      modifier: z.number(),
      total: z.number(),
    }),
  )
  .max(50);
const modes = {
  normal: "Обычный",
  advantage: "Преимущество",
  disadvantage: "Помеха",
  critical: "Критический урон",
};
export function DiceRoller() {
  const {
    value: history,
    setValue: setHistory,
    ready,
    storageError,
  } = useToolDraft("companion-dice-history", historySchema, []);
  const [formula, setFormula] = useState("1d20+5"),
    [mode, setMode] = useState<DiceMode>("normal"),
    [name, setName] = useState(""),
    [source, setSource] = useState(""),
    [error, setError] = useState("");
  return (
    <section className="tool-panel dice-roller">
      <h2>
        <Dices size={24} />
        Кубы
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const result = rollDice(formula, mode);
            setHistory((old) =>
              [
                {
                  ...result,
                  id: crypto.randomUUID(),
                  time: new Date().toISOString(),
                  formula,
                  mode: modes[mode],
                  name,
                  source,
                },
                ...old,
              ].slice(0, 50),
            );
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          Формула
          <input
            value={formula}
            maxLength={40}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="2d6+3"
          />
        </label>
        <div className="dice-presets">
          {[4, 6, 8, 10, 12, 20, 100].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setFormula(`1d${d}`);
                setMode("normal");
              }}
            >
              к{d}
            </button>
          ))}
        </div>
        <label>
          Режим
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as DiceMode)}
          >
            {Object.entries(modes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="tool-form-grid">
          <label>
            Персонаж
            <input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Источник броска
            <input
              value={source}
              maxLength={160}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Атака, проверка…"
            />
          </label>
        </div>
        <button className="button primary" disabled={!ready}>
          Бросить кубы
        </button>
      </form>
      {(error || storageError) && (
        <p className="error" role="alert">
          {error || storageError}
        </p>
      )}
      {history[0] && (
        <div className="dice-result" role="status">
          <strong>{history[0].total}</strong>
          <span>
            {history[0].formula} · {history[0].mode}
          </span>
          <p>
            Кубы: {history[0].rolls.join(", ")} · Модификатор:{" "}
            {history[0].modifier >= 0 ? "+" : ""}
            {history[0].modifier}
          </p>
        </div>
      )}
      <p className="muted">
        Преимущество и помеха: 1d20 с модификатором. Критический урон удваивает
        число кубов, сохраняя модификатор.
      </p>
      <details>
        <summary>История бросков ({history.length}/50)</summary>
        <ol className="dice-history">
          {history.map((r) => (
            <li key={r.id}>
              <strong>{r.total}</strong>
              <div>
                {r.formula} · {r.mode}
                <small>
                  {r.name || "Без персонажа"}
                  {r.source ? ` · ${r.source}` : ""} ·{" "}
                  {new Date(r.time).toLocaleTimeString("ru-RU")}
                </small>
                <small>
                  Кубы: {r.rolls.join(", ")} · Учтены: {r.kept.join(", ")} ·
                  Модификатор {r.modifier}
                </small>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
