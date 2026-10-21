import { useEffect, useState } from "react";
import { z } from "zod";
import { Coins, Dices } from "lucide-react";
import type { EditionId, SourceBook } from "@/entities/content";
import type { Settings } from "../shell/types";
import { requestJson } from "@/shared/client";
import {
  generateLoot,
  lootOptionsSchema,
  lootResultSchema,
  lootPool,
  lootGold,
  lootText,
  rarities,
  rarityLabels,
  type LootItem,
  type LootOptions,
} from "@/domain/rules/dm-tools";
import {
  useToolDraft,
  ToolEntry,
  numberText as n,
  downloadText,
} from "./shared";
const draftSchema = z.object({
  options: lootOptionsSchema,
  history: z.array(lootResultSchema).max(5),
});
const initial: z.infer<typeof draftSchema> = {
  options: {
    level: 1,
    type: "individual",
    wealth: "standard",
    magicCount: 0,
    rarity: "auto",
    sourceBookId: "",
  },
  history: [],
};
const wealthLabels = { poor: "Скромная", standard: "Обычная", rich: "Богатая" };
export function Loot({
  edition,
  sources,
  settings,
}: {
  edition: EditionId;
  sources: SourceBook[];
  settings: Settings;
}) {
  const {
    value: draft,
    setValue,
    ready,
    storageError,
  } = useToolDraft(`companion-loot-${edition}`, draftSchema, initial);
  const [items, setItems] = useState<LootItem[]>([]);
  const [excluded, setExcluded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [seed, setSeed] = useState("");
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const options = draft.options;
  const result = draft.history[selected];
  const pool = lootPool(edition, options, items);
  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ items: LootItem[]; excluded: number }>(
      `/api/tools/loot-catalog?edition=${edition}`,
      { signal: controller.signal },
    )
      .then((r) => {
        setItems(r.items);
        setExcluded(r.excluded);
        setCatalogError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCatalogError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [edition, retry]);
  function change<K extends keyof LootOptions>(key: K, value: LootOptions[K]) {
    setValue((d) => ({ ...d, options: { ...d.options, [key]: value } }));
    setError("");
  }
  function generate(fresh = false) {
    try {
      if (!fresh && seed !== "" && !/^\d+$/.test(seed))
        throw new Error("Ключ должен содержать только цифры.");
      const key =
        fresh || seed === ""
          ? crypto.getRandomValues(new Uint32Array(1))[0]
          : Number(seed);
      const next = generateLoot(edition, options, items, key);
      setValue((d) => ({ ...d, history: [next, ...d.history].slice(0, 5) }));
      setSelected(0);
      setError("");
      setNotice("");
      if (fresh) setSeed("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать добычу.");
    }
  }
  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(lootText(result));
      setNotice("Добыча скопирована.");
    } catch {
      setNotice("Копирование недоступно. Используйте «Скачать текст».");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ИНСТРУМЕНТЫ МАСТЕРА · {edition.slice(3)}</p>
          <h1>Случайная добыча</h1>
          <p>Монеты, ценности и находки для следующего приключения.</p>
        </div>
        <Coins size={30} strokeWidth={1} />
      </div>
      {storageError && (
        <p className="tool-notice" role="status">
          {storageError}
        </p>
      )}
      {!ready ? (
        <p role="status">Загрузка черновика…</p>
      ) : (
        <div className="tools-layout loot-layout">
          <section className="tool-panel">
            <h2>Что найдут герои</h2>
            <p className="tool-muted">
              Авторская таблица Companion. Уровень задаёт масштаб богатства;
              редакция определяет доступные магические предметы.
            </p>
            <div className="tool-filters">
              <label>
                Уровень приключения
                <select
                  aria-label="Уровень приключения"
                  value={options.level}
                  onChange={(e) => change("level", Number(e.target.value))}
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Тип добычи
                <select
                  value={options.type}
                  onChange={(e) =>
                    change("type", e.target.value as LootOptions["type"])
                  }
                >
                  <option value="individual">Личная добыча</option>
                  <option value="hoard">Клад</option>
                </select>
              </label>
              <label>
                Богатство
                <select
                  value={options.wealth}
                  onChange={(e) =>
                    change("wealth", e.target.value as LootOptions["wealth"])
                  }
                >
                  {Object.entries(wealthLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Магических предметов
                <select
                  value={options.magicCount}
                  onChange={(e) => change("magicCount", Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Редкость
                <select
                  value={options.rarity}
                  onChange={(e) =>
                    change("rarity", e.target.value as LootOptions["rarity"])
                  }
                >
                  <option value="auto">До редкости по уровню</option>
                  {rarities.map((r) => (
                    <option key={r} value={r}>
                      {rarityLabels[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Источник предметов
                <select
                  value={options.sourceBookId}
                  onChange={(e) => change("sourceBookId", e.target.value)}
                >
                  <option value="">Все источники</option>
                  {sources
                    .filter((s) => s.edition === edition)
                    .map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.fullNameRu}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <p className="tool-muted">
              По уровню: 1–4 — до необычных, 5–10 — до редких, 11–16 — до очень
              редких, 17–20 — до легендарных. Внутри набора шанс одинаковый,
              повторов в одной выдаче нет.
            </p>
            {loading ? (
              <p role="status">Загрузка предметов…</p>
            ) : catalogError ? (
              <p role="alert">
                {catalogError}
                <button
                  className="quiet-button"
                  onClick={() => {
                    setLoading(true);
                    setRetry((v) => v + 1);
                  }}
                >
                  Повторить
                </button>
              </p>
            ) : (
              <p className="tool-muted">
                Подходящих предметов: <strong>{pool.length}</strong>. Не
                включены записи с неизвестной или переменной редкостью:{" "}
                {excluded}.
              </p>
            )}
            <details className="tool-details">
              <summary>Повторить определённый результат</summary>
              <label>
                Ключ генерации
                <input
                  aria-label="Ключ генерации"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Пусто — новый случайный ключ"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </label>
              <p className="tool-muted">
                Одинаковые ключ, настройки и набор предметов дают одинаковый
                результат.
              </p>
            </details>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={options.magicCount > 0 && (loading || !!catalogError)}
              onClick={() => generate()}
            >
              <Dices size={18} />
              Сгенерировать добычу
            </button>
          </section>
          <div className="tools-main">
            <section
              className="tool-panel"
              aria-label="Результат добычи"
              aria-live="polite"
            >
              {!result ? (
                <div className="tool-empty">
                  <Coins size={38} strokeWidth={1} />
                  <h2>Сокровища ещё не найдены</h2>
                  <p>Настройте добычу и бросьте кости.</p>
                </div>
              ) : (
                <>
                  <p className="eyebrow">
                    {result.options.type === "hoard" ? "КЛАД" : "ЛИЧНАЯ ДОБЫЧА"}{" "}
                    · {result.edition.slice(3)} · УРОВЕНЬ {result.options.level}
                  </p>
                  <h2>Ваши находки</h2>
                  <p className="tool-muted">
                    {wealthLabels[result.options.wealth]} · ключ {result.seed} ·{" "}
                    {result.items.length} магических предметов
                  </p>
                  <div className="tool-coins">
                    {(
                      [
                        ["cp", "Медные"],
                        ["sp", "Серебряные"],
                        ["gp", "Золотые"],
                        ["pp", "Платиновые"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <strong>{n(result.coins[key])}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <h3>Ценности</h3>
                  {result.valuables.length ? (
                    result.valuables.map((v, i) => (
                      <p key={i}>
                        {v.name} × {v.count}
                        <br />
                        <span className="tool-muted">
                          По {n(v.gp)} зм · всего {n(v.gp * v.count)} зм
                        </span>
                      </p>
                    ))
                  ) : (
                    <p className="tool-muted">
                      В этой находке нет отдельных ценностей.
                    </p>
                  )}
                  <h3>Магические предметы</h3>
                  {result.items.length ? (
                    result.items.map((item) => (
                      <div className="tool-search-result" key={item.id}>
                        <button
                          className="tool-link"
                          onClick={() => setOpened(item.id)}
                        >
                          {item.name}
                        </button>
                        <span className="badge">
                          {rarityLabels[item.rarity]}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="tool-muted">
                      Магические предметы не запрашивались.
                    </p>
                  )}
                  <p className="tool-budget">
                    Монеты и ценности: <strong>{n(lootGold(result))} зм</strong>
                  </p>
                  <p className="tool-muted">
                    Магические предметы не включены в стоимость. Находки не
                    добавляются в инвентарь автоматически.
                  </p>
                  <details className="tool-details">
                    <summary>Как получен результат</summary>
                    <p>
                      Монеты: {result.coinFormula}. Клад увеличивает монетную
                      часть в 10 раз. Скромное богатство — × 0,5, богатое — × 2.
                    </p>
                    <p>
                      Ценности: клад содержит 1к4 предмета; личная добыча — один
                      при 5–6 на к6. Цена зависит от диапазона уровня: 10 / 50 /
                      250 / 1 000 зм.
                    </p>
                  </details>
                  <div className="button-row">
                    <button className="button secondary" onClick={copy}>
                      Копировать
                    </button>
                    <button
                      className="button secondary"
                      onClick={() =>
                        downloadText(
                          `Добыча-${result.seed}.txt`,
                          lootText(result),
                        )
                      }
                    >
                      Скачать текст
                    </button>
                    <button
                      className="button secondary"
                      disabled={
                        options.magicCount > 0 && (loading || !!catalogError)
                      }
                      onClick={() => generate(true)}
                    >
                      Новый бросок
                    </button>
                  </div>
                  {notice && <p role="status">{notice}</p>}
                </>
              )}
            </section>
            {draft.history.length > 0 && (
              <section className="tool-panel">
                <h2>Последние находки</h2>
                <p className="tool-muted">
                  Пять результатов сохраняются в этом браузере отдельно для
                  каждой редакции.
                </p>
                <div className="tool-history">
                  {draft.history.map((r, i) => (
                    <button
                      key={`${r.seed}-${i}`}
                      className={selected === i ? "active" : ""}
                      aria-pressed={selected === i}
                      onClick={() => {
                        setSelected(i);
                        setNotice("");
                      }}
                    >
                      <strong>
                        {r.options.type === "hoard" ? "Клад" : "Добыча"} ·{" "}
                        {n(lootGold(r))} зм
                      </strong>
                      <small>
                        Уровень {r.options.level} · ключ {r.seed}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
      {opened && (
        <ToolEntry
          key={opened}
          id={opened}
          sources={sources}
          settings={settings}
          close={() => setOpened(null)}
        />
      )}
    </>
  );
}
