import { readFileSync } from "node:fs";
import { db } from "../src/database/client";
import { importDataset, parseDataset } from "../src/imports/pipeline";
try {
  for (const year of [2014, 2024])
    console.log(
      year,
      await importDataset(
        parseDataset(readFileSync(`data/phb/feats-${year}.json`, "utf8")),
      ),
    );
} finally {
  await db.$disconnect();
}
