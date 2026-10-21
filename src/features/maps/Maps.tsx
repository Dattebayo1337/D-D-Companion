"use client";
/* Private PNG thumbnails bypass the public image optimizer. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Map, Plus, X, Download, Undo2, Redo2, Upload } from "lucide-react";
import {
  imageMapCategories,
  imageMapUrl,
  type ImageMapRecord,
} from "@/entities/image-map";
import { ImageMapDialog } from "./ImageMapDialog";
import {
  blankMap,
  mapCategories,
  mapSchema,
  mapSvg,
  playerMap,
  resizeMap,
  symbolLabels,
  symbols,
  terrains,
  type AdventureMap,
  type MapRecord,
  type Terrain,
} from "@/entities/map";
import { requestJson } from "@/shared/client";
import { mapTemplates } from "./templates";
import { MapBoard } from "./MapBoard";
type CampaignOption = { id: string; name: string; archived: boolean };
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[<>:"/\\|?*]/g, "_");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Maps({ signedIn }: { signedIn: boolean }) {
  const [images, setImages] = useState<ImageMapRecord[]>([]);
  const [openedImage, setOpenedImage] = useState<
    ImageMapRecord | "upload" | null
  >(null);
  const [format, setFormat] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [records, setRecords] = useState<MapRecord[]>([]),
    [campaigns, setCampaigns] = useState<CampaignOption[]>([]),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [scope, setScope] = useState("all"),
    [category, setCategory] = useState(""),
    [campaignFilter, setCampaignFilter] = useState("");
  const [opened, setOpened] = useState<{
    data: AdventureMap;
    record?: MapRecord;
    edit: boolean;
  } | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    Promise.all([
      requestJson<MapRecord[]>("/api/maps"),
      requestJson<CampaignOption[]>("/api/campaigns"),
      requestJson<ImageMapRecord[]>("/api/map-images"),
    ])
      .then(([m, c, png]) => {
        if (active) {
          setRecords(m);
          setImages(png);
          setCampaigns(c.filter((p) => !p.archived));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [signedIn]);
  const rows = [
    ...(scope === "all" || scope === "templates"
      ? mapTemplates.map((data) => ({
          data,
          record: undefined as MapRecord | undefined,
        }))
      : []),
    ...(scope !== "templates"
      ? records
          .filter((r) => r.archived === (scope === "archived"))
          .map((record) => ({ data: record.data, record }))
      : []),
  ].filter(
    (r) =>
      format !== "png" &&
      (!category || r.data.category === category) &&
      (!campaignFilter || r.record?.campaignId === campaignFilter) &&
      `${r.data.name} ${r.data.description}`
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  const imageRows = images.filter(
    (r) =>
      format !== "grid" &&
      scope !== "templates" &&
      r.archived === (scope === "archived") &&
      (!category || r.data.category === category) &&
      (!campaignFilter || r.data.campaignId === campaignFilter) &&
      `${r.data.name} ${r.data.description}`
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  return (
    <section className="maps-section">
      <div className="maps-heading">
        <div>
          <h1>
            <Map size={28} /> Карты приключений
          </h1>
          <p>
            Готовые схемы и ваши собственные миры. Подходят для обеих редакций.
          </p>
        </div>
        {signedIn ? (
          <div className="map-header-actions">
            <button
              className="primary-button"
              onClick={() => setOpenedImage("upload")}
            >
              <Upload size={18} /> Загрузить PNG
            </button>
            <button
              className="primary-button"
              onClick={() => setOpened({ data: blankMap(), edit: true })}
            >
              <Plus size={18} /> Создать схему
            </button>
          </div>
        ) : (
          <Link href="/login">Войти и создать карту</Link>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="maps-filters">
        <label>
          Формат
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">Все форматы</option>
            <option value="png">Карты PNG</option>
            <option value="grid">Схемы по клеткам</option>
          </select>
        </label>
        <label>
          Поиск
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название или описание"
          />
        </label>
        <label>
          Раздел
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">Все карты</option>
            <option value="templates">Готовые схемы</option>
            {signedIn && (
              <>
                <option value="mine">Мои карты</option>
                <option value="archived">Архив</option>
              </>
            )}
          </select>
        </label>
        <label>
          Местность
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Любая</option>
            {[...new Set([...mapCategories, ...imageMapCategories])].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        {signedIn && (
          <label>
            Кампания
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
            >
              <option value="">Все кампании</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="muted">
        {signedIn
          ? "Мои карты и заметки доступны только вашему аккаунту. "
          : "Готовые схемы доступны без входа. "}
        Загружайте обычные карты в PNG или создавайте схемы по клеткам.
      </p>
      <div className="map-catalog">
        {imageRows.slice(0, visibleCount).map((r) => (
          <button
            className="map-card"
            key={r.id}
            onClick={() => setOpenedImage(r)}
          >
            <img
              className="png-card-preview"
              src={imageMapUrl(r.id, true)}
              alt={r.data.name}
              loading="lazy"
            />
            <div>
              <small>
                {r.archived ? "Архив" : "Моя карта"} · PNG · {r.data.category}
              </small>
              <h2>{r.data.name}</h2>
              <p>{r.data.description || "Без описания"}</p>
              <span>
                {r.width} × {r.height} пикселей
              </span>
            </div>
          </button>
        ))}
        {rows.slice(0, visibleCount).map((r, i) => (
          <button
            className="map-card"
            key={r.record?.id ?? `template-${i}`}
            onClick={() => setOpened({ ...r, edit: false })}
          >
            <MapBoard data={r.data} player />
            <div>
              <small>
                {r.record
                  ? r.record.archived
                    ? "Архив"
                    : "Моя карта"
                  : "Готовая схема"}{" "}
                · {r.data.category}
              </small>
              <h2>{r.data.name}</h2>
              <p>{r.data.description || "Без описания"}</p>
              <span>
                {r.data.width} × {r.data.height} · {r.data.feetPerCell} футов /
                клетка
              </span>
            </div>
          </button>
        ))}
      </div>
      {Math.max(rows.length, imageRows.length) > visibleCount && (
        <button onClick={() => setVisibleCount((n) => n + 12)}>
          Показать ещё карты
        </button>
      )}
      {!rows.length && !imageRows.length && (
        <p>Карты не найдены. Измените фильтры или создайте новую карту.</p>
      )}
      {opened && (
        <MapEditor
          key={opened.record?.id ?? opened.data.name}
          initial={opened.data}
          record={opened.record}
          edit={opened.edit}
          signedIn={signedIn}
          campaigns={campaigns}
          close={() => setOpened(null)}
          saved={(r) => {
            setRecords((prev) => [r, ...prev.filter((p) => p.id !== r.id)]);
            setOpened({ data: r.data, record: r, edit: false });
          }}
        />
      )}
      {openedImage && (
        <ImageMapDialog
          key={typeof openedImage === "string" ? "upload" : openedImage.id}
          record={typeof openedImage === "string" ? undefined : openedImage}
          campaigns={campaigns}
          close={() => setOpenedImage(null)}
          saved={(r) => {
            setImages((prev) => [r, ...prev.filter((p) => p.id !== r.id)]);
            setOpenedImage(r);
          }}
        />
      )}
    </section>
  );
}
function MapEditor({
  initial,
  record,
  edit,
  signedIn,
  campaigns,
  close,
  saved,
}: {
  initial: AdventureMap;
  record?: MapRecord;
  edit: boolean;
  signedIn: boolean;
  campaigns: CampaignOption[];
  close: () => void;
  saved: (r: MapRecord) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    file = useRef<HTMLInputElement>(null);
  const [data, setData] = useState(initial),
    [editing, setEditing] = useState(edit),
    [current, setCurrent] = useState(record),
    [campaignId, setCampaignId] = useState(record?.campaignId ?? "");
  const [player, setPlayer] = useState(false),
    [grid, setGrid] = useState(true),
    [zoom, setZoom] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [tool, setTool] = useState("floor"),
    [label, setLabel] = useState(""),
    [secret, setSecret] = useState(false),
    [past, setPast] = useState<AdventureMap[]>([]),
    [future, setFuture] = useState<AdventureMap[]>([]);
  const [width, setWidth] = useState(initial.width),
    [height, setHeight] = useState(initial.height);
  const [baseline, setBaseline] = useState(
    JSON.stringify({ data: initial, campaignId: record?.campaignId ?? "" }),
  );
  const dirty =
    JSON.stringify({ data, campaignId }) !== baseline || (!current && editing);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  function leave() {
    if (!busy && (!dirty || confirm("Закрыть карту без сохранения изменений?")))
      close();
  }
  function checkpoint() {
    setPast((p) => [...p.slice(-39), data]);
    setFuture([]);
  }
  function change(next: AdventureMap) {
    checkpoint();
    setData(next);
  }
  function undo() {
    if (!past.length) return;
    setFuture((f) => [data, ...f]);
    setData(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, data]);
    setData(future[0]);
    setFuture((f) => f.slice(1));
  }
  function paint(x: number, y: number) {
    setData((prev) => {
      if (tool === "erase")
        return {
          ...prev,
          markers: prev.markers.filter((p) => p.x !== x || p.y !== y),
        };
      if (tool in terrains) {
        const cells = [...prev.cells];
        cells[y * prev.width + x] = tool as Terrain;
        return { ...prev, cells };
      }
      if (
        prev.markers.length >= 200 &&
        !prev.markers.some((p) => p.x === x && p.y === y)
      )
        return prev;
      return {
        ...prev,
        markers: [
          ...prev.markers.filter((p) => p.x !== x || p.y !== y),
          {
            id: crypto.randomUUID(),
            x,
            y,
            kind: tool as keyof typeof symbols,
            label,
            secret,
          },
        ],
      };
    });
  }
  async function save(archive?: boolean) {
    setError("");
    setBusy(true);
    try {
      const payload =
        archive !== undefined && current
          ? {
              action: "archive",
              id: current.id,
              version: current.version,
              archived: archive,
            }
          : {
              action: "save",
              id: current?.id,
              version: current?.version ?? 0,
              campaignId: campaignId || null,
              data: mapSchema.parse(data),
            };
      const r = await requestJson<MapRecord>("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setBaseline(
        JSON.stringify({
          data: r.data,
          campaignId: r.campaignId ?? "",
        }),
      );
      setCurrent(r);
      setData(r.data);
      setEditing(false);
      saved(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить карту.");
    } finally {
      setBusy(false);
    }
  }
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 256 * 1024) throw Error("Файл превышает 256 КБ.");
      const next = mapSchema.parse(JSON.parse(await f.text()));
      change(next);
      setWidth(next.width);
      setHeight(next.height);
      setError("");
    } catch {
      setError(
        "Не удалось импортировать карту. Нужен JSON карты из этого конструктора размером до 256 КБ.",
      );
    }
  }
  const editable = editing && !player && !busy;
  return (
    <dialog
      ref={dialog}
      className="map-dialog"
      onCancel={(e) => {
        e.preventDefault();
        leave();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) leave();
      }}
      aria-label="Карта приключения"
    >
      <div className="map-dialog-inner">
        <header className="maps-heading">
          <div>
            <small>
              {editing
                ? "КОНСТРУКТОР КАРТ"
                : current
                  ? "МОЯ КАРТА"
                  : "ГОТОВАЯ СХЕМА"}
            </small>
            <h2>{data.name}</h2>
          </div>
          <div className="map-header-actions">
            {editing && (
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy ? "Сохранение…" : "Сохранить карту"}
              </button>
            )}
            <button aria-label="Закрыть карту" onClick={leave} disabled={busy}>
              <X />
            </button>
          </div>
        </header>
        {error && <p role="alert">{error}</p>}
        <div className="map-toolbar">
          <label>
            <input
              type="checkbox"
              checked={player}
              onChange={(e) => setPlayer(e.target.checked)}
            />{" "}
            Вид для игроков
          </label>
          <label>
            <input
              type="checkbox"
              checked={grid}
              onChange={(e) => setGrid(e.target.checked)}
            />{" "}
            Сетка
          </label>
          <label>
            Масштаб
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value="0.5">50%</option>
              <option value="1">100%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
          </label>
          <button
            onClick={() =>
              download(
                `${data.name}${player ? " — игроки" : " — мастер"}.svg`,
                mapSvg(data, player, grid),
                "image/svg+xml",
              )
            }
          >
            <Download size={16} /> SVG {player ? "для игроков" : "мастера"}
          </button>
          <button
            onClick={() =>
              download(
                `${data.name}${player ? " — игроки" : ""}.json`,
                JSON.stringify(player ? playerMap(data) : data, null, 2),
                "application/json",
              )
            }
          >
            Экспорт JSON
          </button>
          {!editing && signedIn && (
            <>
              {current && !current.archived && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setPlayer(false);
                  }}
                >
                  Редактировать
                </button>
              )}
              <button
                onClick={() => {
                  setCurrent(undefined);
                  setCampaignId("");
                  setData({ ...data, name: `${data.name} — копия` });
                  setEditing(true);
                  setPlayer(false);
                }}
              >
                Создать свою версию
              </button>
              {current && (
                <button
                  disabled={busy}
                  onClick={() => void save(!current.archived)}
                >
                  {current.archived ? "Восстановить" : "В архив"}
                </button>
              )}
            </>
          )}
        </div>
        {player && (
          <p className="map-hint">
            Скрытые метки и заметки мастера исключены из этого вида и обоих
            экспортов. Сохранение карты остаётся личным.
          </p>
        )}
        <div className={editable ? "map-workspace" : "map-workspace viewing"}>
          {editable && (
            <aside className="map-controls">
              <label>
                Название
                <input
                  maxLength={160}
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </label>
              <label>
                Описание
                <textarea
                  maxLength={4000}
                  value={data.description}
                  onChange={(e) =>
                    setData({ ...data, description: e.target.value })
                  }
                />
              </label>
              <label>
                Местность
                <select
                  value={data.category}
                  onChange={(e) =>
                    setData({
                      ...data,
                      category: e.target.value as AdventureMap["category"],
                    })
                  }
                >
                  {mapCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Кампания
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                >
                  <option value="">Без привязки</option>
                  {campaignId &&
                    !campaigns.some((c) => c.id === campaignId) && (
                      <option value={campaignId}>
                        Недоступная кампания — выберите другую
                      </option>
                    )}
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <details>
                <summary>Размер и масштаб</summary>
                <label>
                  Ширина (8–60)
                  <input
                    type="number"
                    min={8}
                    max={60}
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                  />
                </label>
                <label>
                  Высота (8–60)
                  <input
                    type="number"
                    min={8}
                    max={60}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                  />
                </label>
                <button
                  onClick={() => {
                    if (
                      !Number.isInteger(width) ||
                      !Number.isInteger(height) ||
                      width < 8 ||
                      width > 60 ||
                      height < 8 ||
                      height > 60
                    ) {
                      setError(
                        "Размер каждой стороны — целое число от 8 до 60.",
                      );
                      return;
                    }
                    if (
                      (width < data.width || height < data.height) &&
                      !confirm(
                        "Уменьшить карту? Клетки и метки за новой границей будут обрезаны. Действие можно отменить.",
                      )
                    )
                      return;
                    change(resizeMap(data, width, height));
                    setError("");
                  }}
                >
                  Изменить размер
                </button>
                <label>
                  Футов в клетке
                  <input
                    type="number"
                    min={1}
                    max={5280}
                    value={data.feetPerCell}
                    onChange={(e) =>
                      setData({ ...data, feetPerCell: Number(e.target.value) })
                    }
                  />
                </label>
              </details>
              <h3>Поверхность</h3>
              <div className="map-palette">
                {Object.entries(terrains).map(([id, t]) => (
                  <button
                    key={id}
                    aria-pressed={tool === id}
                    onClick={() => setTool(id)}
                  >
                    <i style={{ background: t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
              <h3>Объекты</h3>
              <div className="map-palette">
                {Object.entries(symbols).map(([id, s]) => (
                  <button
                    key={id}
                    aria-pressed={tool === id}
                    onClick={() => setTool(id)}
                  >
                    {s} {symbolLabels[id as keyof typeof symbols]}
                  </button>
                ))}
                <button
                  aria-pressed={tool === "erase"}
                  onClick={() => setTool("erase")}
                >
                  Убрать объект
                </button>
              </div>
              <label>
                Подпись нового объекта
                <input
                  maxLength={80}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={secret}
                  onChange={(e) => setSecret(e.target.checked)}
                />{" "}
                Скрытый объект
              </label>
              <small>
                До 200 объектов. Повторное размещение заменяет объект в клетке.
              </small>
              <label>
                Заметки мастера
                <textarea
                  maxLength={20000}
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                />
              </label>
              <button onClick={() => file.current?.click()}>Импорт JSON</button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </aside>
          )}
          <main className="map-stage">
            <div className="map-stage-bar">
              <span>
                {data.width} × {data.height} · {data.feetPerCell} футов / клетка
              </span>
              {editable && (
                <>
                  <button
                    disabled={!past.length}
                    onClick={undo}
                    aria-label="Отменить изменение"
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    disabled={!future.length}
                    onClick={redo}
                    aria-label="Повторить изменение"
                  >
                    <Redo2 size={17} />
                  </button>
                </>
              )}
            </div>
            <div className="map-scroll">
              <div
                style={
                  !editable
                    ? { width: `${zoom * 100}%`, minWidth: 300 }
                    : undefined
                }
              >
                <MapBoard
                  data={data}
                  player={player}
                  grid={grid}
                  zoom={zoom}
                  paint={editable ? paint : undefined}
                  begin={checkpoint}
                />
              </div>
            </div>
            <p>{data.description}</p>
            {editable && (
              <p className="muted">
                Рисуйте мышью или касанием. С клавиатуры: стрелки и пробел.
                Изменения сохраняются кнопкой «Сохранить карту».
              </p>
            )}
            {!player && !editable && data.notes && (
              <div className="map-notes">
                <h3>Заметки мастера</h3>
                <p>{data.notes}</p>
              </div>
            )}
          </main>
        </div>
        <footer className="map-footer">
          <button disabled={busy} onClick={leave}>
            Закрыть
          </button>
          {dirty && <span>Есть несохранённые изменения</span>}
        </footer>
      </div>
    </dialog>
  );
}
