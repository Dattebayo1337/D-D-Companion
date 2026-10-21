import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export function verifySources() {
  const manifest = JSON.parse(
    readFileSync("data/raw/srd-sources.json", "utf8"),
  ) as { files: { path: string; sha256: string }[] };
  for (const f of manifest.files)
    if (
      createHash("sha256")
        .update(readFileSync("data/raw/" + f.path))
        .digest("hex") !== f.sha256
    )
      throw new Error("Контрольная сумма исходника не совпадает: " + f.path);
}
