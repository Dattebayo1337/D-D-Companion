"use client";
/* Private images and local object URLs must bypass the public image optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { X, Upload, Download } from "lucide-react";
import {
  imageMapCategories,
  imageMapSchema,
  imageMapUrl,
  MAX_PNG_BYTES,
  type ImageMapData,
  type ImageMapRecord,
} from "@/entities/image-map";
import { requestJson } from "@/shared/client";
export function ImageMapDialog({
  record,
  campaigns,
  close,
  saved,
}: {
  record?: ImageMapRecord;
  campaigns: { id: string; name: string }[];
  close: () => void;
  saved: (r: ImageMapRecord) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number } | null>(
      null,
    );
  const [current, setCurrent] = useState(record),
    [editing, setEditing] = useState(!record),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [data, setData] = useState<ImageMapData>(
    record?.data ?? {
      name: "",
      description: "",
      category: "Регион",
      notes: "",
      campaignId: null,
    },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [imageError, setImageError] = useState(false),
    [zoom, setZoom] = useState(0);
  const dirty =
    file !== null ||
    JSON.stringify(data) !==
      JSON.stringify(
        current?.data ?? {
          name: "",
          description: "",
          category: "Регион",
          notes: "",
          campaignId: null,
        },
      );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  function leave() {
    if (!busy && (!dirty || confirm("Закрыть карту без сохранения изменений?")))
      close();
  }
  function choose(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX_PNG_BYTES || !f.name.toLowerCase().endsWith(".png")) {
      setError("Выберите PNG-файл до 10 МБ.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setImageError(false);
    setError("");
    if (!data.name)
      setData((d) => ({
        ...d,
        name: f.name.replace(/\.png$/i, "").slice(0, 160),
      }));
  }
  async function save(archived?: boolean) {
    setError("");
    setBusy(true);
    try {
      let r: ImageMapRecord;
      if (!current) {
        if (!file) throw Error("Выберите PNG-файл.");
        const parsed = imageMapSchema.safeParse(data);
        if (!parsed.success)
          throw Error("Проверьте название и описание карты.");
        const form = new FormData();
        form.set("file", file);
        form.set("data", JSON.stringify(parsed.data));
        r = await requestJson<ImageMapRecord>("/api/map-images", {
          method: "POST",
          body: form,
        });
      } else {
        const parsed = imageMapSchema.safeParse(data);
        if (archived === undefined && !parsed.success)
          throw Error("Проверьте название и описание карты.");
        r = await requestJson<ImageMapRecord>("/api/map-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            archived !== undefined
              ? {
                  action: "archive",
                  id: current.id,
                  version: current.version,
                  archived,
                }
              : {
                  action: "save",
                  id: current.id,
                  version: current.version,
                  data,
                },
          ),
        });
      }
      setCurrent(r);
      setData(r.data);
      setFile(null);
      setPreview("");
      setEditing(false);
      saved(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить карту.");
    } finally {
      setBusy(false);
    }
  }
  const src = current ? imageMapUrl(current.id) : preview;
  return (
    <dialog
      ref={dialog}
      className="map-dialog image-map-dialog"
      aria-label="PNG-карта"
      onCancel={(e) => {
        e.preventDefault();
        leave();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) leave();
      }}
    >
      <div className="map-dialog-inner">
        <header className="maps-heading">
          <div>
            <small>КАРТА · PNG</small>
            <h2>{data.name || "Загрузка карты"}</h2>
          </div>
          <div className="map-header-actions">
            {editing && (
              <button
                className="primary-button"
                disabled={busy || (!current && (!file || imageError))}
                onClick={() => void save()}
              >
                <Upload size={16} />
                {busy
                  ? "Сохранение…"
                  : current
                    ? "Сохранить описание"
                    : "Загрузить карту"}
              </button>
            )}
            <button
              aria-label="Закрыть PNG-карту"
              disabled={busy}
              onClick={leave}
            >
              <X />
            </button>
          </div>
        </header>
        {error && <p role="alert">{error}</p>}
        <div className="map-toolbar">
          <label>
            Масштаб изображения
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={0}>Вписать целиком</option>
              <option value={0.25}>25%</option>
              <option value={0.5}>50%</option>
              <option value={1}>100%</option>
              <option value={2}>200%</option>
            </select>
          </label>
          {current && (
            <a
              className="button"
              href={`${imageMapUrl(current.id)}?download=1`}
              download
            >
              <Download size={16} /> Скачать PNG
            </a>
          )}
          {current && !editing && (
            <>
              <button disabled={busy} onClick={() => setEditing(true)}>
                Изменить описание
              </button>
              <button
                disabled={busy}
                onClick={() => void save(!current.archived)}
              >
                {current.archived ? "Восстановить" : "В архив"}
              </button>
            </>
          )}
          {current && (
            <span>
              {current.width} × {current.height} пикселей
            </span>
          )}
        </div>
        <div className={editing ? "map-workspace" : "map-workspace viewing"}>
          {editing && (
            <aside className="map-controls">
              {!current && (
                <label className="png-upload">
                  PNG-файл
                  <input
                    type="file"
                    accept="image/png,.png"
                    disabled={busy}
                    onChange={(e) => {
                      choose(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <small>
                    До 10 МБ, 8192 пикселей по стороне и 16 мегапикселей.
                  </small>
                  {file && (
                    <span>
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)} МБ
                    </span>
                  )}
                </label>
              )}
              <label>
                Название карты
                <input
                  maxLength={160}
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  disabled={busy}
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
                  disabled={busy}
                />
              </label>
              <label>
                Тип карты
                <select
                  value={data.category}
                  onChange={(e) =>
                    setData({
                      ...data,
                      category: e.target.value as ImageMapData["category"],
                    })
                  }
                  disabled={busy}
                >
                  {imageMapCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Кампания
                <select
                  value={data.campaignId ?? ""}
                  onChange={(e) =>
                    setData({ ...data, campaignId: e.target.value || null })
                  }
                  disabled={busy}
                >
                  <option value="">Без привязки</option>
                  {data.campaignId &&
                    !campaigns.some((c) => c.id === data.campaignId) && (
                      <option value={data.campaignId}>
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
              <label>
                Личные заметки
                <textarea
                  maxLength={20000}
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  disabled={busy}
                />
              </label>
              <p className="muted">
                Карта сохраняется в вашем аккаунте. Изображение открывается без
                сетки и игровых жетонов.
              </p>
            </aside>
          )}
          <div className="map-stage">
            {src ? (
              <>
                <div
                  className="png-map-scroll"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = {
                      x: e.clientX,
                      y: e.clientY,
                      left: e.currentTarget.scrollLeft,
                      top: e.currentTarget.scrollTop,
                    };
                  }}
                  onPointerMove={(e) => {
                    const p = drag.current;
                    if (p) {
                      e.currentTarget.scrollLeft = p.left - e.clientX + p.x;
                      e.currentTarget.scrollTop = p.top - e.clientY + p.y;
                    }
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                >
                  <img
                    src={src}
                    alt={data.name || "Предпросмотр PNG-карты"}
                    draggable={false}
                    style={{
                      width:
                        zoom === 0
                          ? "100%"
                          : current
                            ? current.width * zoom
                            : undefined,
                      maxWidth: zoom === 0 ? "100%" : "none",
                      maxHeight: zoom === 0 ? "65dvh" : undefined,
                      objectFit: "contain",
                      ...(zoom !== 0 && !current ? { zoom } : {}),
                    }}
                    onError={() => {
                      setImageError(true);
                      setError("Не удалось открыть изображение PNG.");
                    }}
                  />
                </div>
                <p className="muted">
                  Увеличьте карту и перемещайте её перетаскиванием или полосами
                  прокрутки.
                </p>
              </>
            ) : (
              <div className="png-empty">
                <Upload size={38} />
                <h3>Загрузите карту мира, региона или города</h3>
                <p>Выберите PNG-файл, чтобы увидеть предпросмотр.</p>
              </div>
            )}
            {!editing && (
              <>
                <p>{data.description || "Без описания"}</p>
                {data.notes && (
                  <details className="map-notes">
                    <summary>Личные заметки</summary>
                    <p>{data.notes}</p>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
        <footer className="map-footer">
          <button onClick={leave} disabled={busy}>
            Закрыть
          </button>
          {dirty && <span>Есть несохранённые изменения</span>}
        </footer>
      </div>
    </dialog>
  );
}
