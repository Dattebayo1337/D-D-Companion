import { inflateRawSync } from "node:zlib";
import { z } from "zod";
import { type Dataset } from "@/entities/content";
import { parseDataset, DatasetError, MAX_IMPORT_BYTES } from "./pipeline";
const bad = (message: string): never => {
  throw new DatasetError([{ path: "package", message }]);
};
export const manifestSchema = z
  .object({
    name: z.string().min(1).max(200),
    author: z.string().max(200),
    version: z.string().min(1).max(80),
    description: z.string().max(5000),
    edition: z.enum(["5e_2014", "5e_2024", "Mixed"]),
    dependencies: z.array(z.string().uuid()).max(1000),
  })
  .strict();
export type Manifest = z.infer<typeof manifestSchema>;
function crc32(data: Buffer) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
// Small standard ZIP writer (stored entries), readable by ordinary archive tools.
export function zipFiles(files: Record<string, Buffer>) {
  const local: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const n = Buffer.from(name),
      crc = crc32(data),
      h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x800, 6);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(n.length, 26);
    local.push(h, n, data);
    const d = Buffer.alloc(46);
    d.writeUInt32LE(0x02014b50);
    d.writeUInt16LE(20, 4);
    d.writeUInt16LE(20, 6);
    d.writeUInt16LE(0x800, 8);
    d.writeUInt32LE(crc, 16);
    d.writeUInt32LE(data.length, 20);
    d.writeUInt32LE(data.length, 24);
    d.writeUInt16LE(n.length, 28);
    d.writeUInt32LE(offset, 42);
    central.push(d, n);
    offset += h.length + n.length + data.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22),
    count = Object.keys(files).length;
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
export function unzipFiles(bytes: Buffer) {
  if (bytes.length > MAX_IMPORT_BYTES) bad("Пакет превышает 32 МБ.");
  const result: Record<string, Buffer> = Object.create(null);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      bytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + bytes.readUInt16LE(i + 20) === bytes.length
    ) {
      end = i;
      break;
    }
  if (end < 0) bad("Некорректный ZIP-контейнер.");
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6))
    bad("Многотомные архивы не поддерживаются.");
  const count = bytes.readUInt16LE(end + 10);
  let p = bytes.readUInt32LE(end + 16),
    total = 0;
  if (
    count > 128 ||
    count !== bytes.readUInt16LE(end + 8) ||
    p + bytes.readUInt32LE(end + 12) !== end
  )
    bad("Некорректный каталог ZIP.");
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || bytes.readUInt32LE(p) !== 0x02014b50)
      bad("Повреждён каталог ZIP.");
    const flags = bytes.readUInt16LE(p + 8),
      method = bytes.readUInt16LE(p + 10),
      crc = bytes.readUInt32LE(p + 16),
      size = bytes.readUInt32LE(p + 20),
      rawSize = bytes.readUInt32LE(p + 24),
      nl = bytes.readUInt16LE(p + 28),
      extra = bytes.readUInt16LE(p + 30),
      comment = bytes.readUInt16LE(p + 32),
      at = bytes.readUInt32LE(p + 42);
    if (p + 46 + nl + extra + comment > end) bad("Повреждён каталог ZIP.");
    const name = bytes.subarray(p + 46, p + 46 + nl).toString("utf8");
    p += 46 + nl + extra + comment;
    if (
      !name ||
      name.includes("\\") ||
      name.startsWith("/") ||
      name.split("/").some((v) => v === ".." || v === ".") ||
      name.includes(":") ||
      name.includes("\0") ||
      Object.hasOwn(result, name)
    )
      bad("Небезопасный или повторяющийся путь в пакете.");
    if (!["manifest.json", "data/dataset.json", "assets/"].includes(name))
      bad(
        "Поддерживаются manifest.json, data/dataset.json и пустой каталог assets/.",
      );
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      rawSize > MAX_IMPORT_BYTES ||
      (total += rawSize) > MAX_IMPORT_BYTES
    )
      bad("Шифрованный, слишком большой или неподдерживаемый архив.");
    if (at + 30 > bytes.length || bytes.readUInt32LE(at) !== 0x04034b50)
      bad("Повреждён заголовок ZIP.");
    const localNameLength = bytes.readUInt16LE(at + 26),
      start = at + 30 + localNameLength + bytes.readUInt16LE(at + 28);
    if (
      bytes.subarray(at + 30, at + 30 + localNameLength).toString("utf8") !==
        name ||
      start + size > bytes.readUInt32LE(end + 16)
    )
      bad("Несогласованные записи ZIP.");
    let data: Buffer;
    try {
      data =
        method === 0
          ? bytes.subarray(start, start + size)
          : inflateRawSync(bytes.subarray(start, start + size), {
              maxOutputLength: Math.max(1, rawSize),
            });
    } catch {
      bad("Не удалось распаковать данные.");
    }
    if (data!.length !== rawSize || crc32(data!) !== crc)
      bad("Контрольная сумма ZIP не совпадает.");
    result[name] = data!;
  }
  if (p !== end) bad("Некорректная длина каталога ZIP.");
  return result;
}
export function packDataset(data: Dataset, manifest: Manifest) {
  return zipFiles({
    "manifest.json": Buffer.from(
      JSON.stringify(manifestSchema.parse(manifest), null, 2),
    ),
    "data/dataset.json": Buffer.from(JSON.stringify(data, null, 2)),
    "assets/": Buffer.alloc(0),
  });
}
export function unpackDataset(bytes: Buffer) {
  const files = unzipFiles(bytes);
  if (!files["manifest.json"] || !files["data/dataset.json"])
    bad("Нет манифеста или набора данных.");
  let manifest: Manifest;
  try {
    manifest = manifestSchema.parse(
      JSON.parse(files["manifest.json"].toString()),
    );
  } catch {
    bad("Неверный манифест пакета.");
  }
  const data = parseDataset(files["data/dataset.json"].toString());
  if (
    manifest!.edition !== "Mixed" &&
    data.entries.some((e) => e.edition !== manifest!.edition)
  )
    bad("Редакция пакета не совпадает с содержимым.");
  return { manifest: manifest!, data };
}
// CSV uses one typed JSON cell per entity to preserve nested mechanics without loss.
export function datasetToCsv(data: Dataset) {
  const rows: [[string, string], ...[string, string][]] = [
    ["type", "json"],
    ["meta", JSON.stringify({ schemaVersion: 1, name: data.name })],
  ];
  for (const type of ["sources", "entries", "terms", "relations"] as const)
    for (const value of data[type]) rows.push([type, JSON.stringify(value)]);
  return (
    "\ufeff" +
    rows
      .map((r) => r.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","))
      .join("\r\n")
  );
}
export function csvToDataset(raw: string) {
  if (Buffer.byteLength(raw) > MAX_IMPORT_BYTES) bad("CSV превышает 32 МБ.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  raw = raw.replace(/^\ufeff/, "");
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) bad("Незакрытые кавычки CSV.");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  if (rows.shift()?.join(",") !== "type,json")
    bad("CSV должен содержать колонки type,json.");
  const result: Record<string, unknown> = {
    sources: [],
    entries: [],
    terms: [],
    relations: [],
  };
  let meta = false;
  for (const [type, value, ...rest] of rows) {
    if (rest.length || !value) bad("Неверная строка CSV.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      bad("Некорректный JSON в ячейке CSV.");
    }
    if (type === "meta") {
      if (meta) bad("Повторные метаданные CSV.");
      const m = z
        .object({ schemaVersion: z.literal(1), name: z.string() })
        .strict()
        .parse(parsed);
      Object.assign(result, m);
      meta = true;
    } else if (["sources", "entries", "terms", "relations"].includes(type))
      (result[type] as unknown[]).push(parsed);
    else bad("Неизвестный тип строки CSV.");
  }
  return parseDataset(JSON.stringify(result));
}
