import { readFile } from "node:fs/promises";
import { db } from "../src/database/client";
import { importDataset, parseDataset } from "../src/imports/pipeline";
try {
  for (const year of [2014, 2024])
    console.log(
      year,
      await importDataset(
        parseDataset(
          await readFile(`data/phb/subclasses-${year}.json`, "utf8"),
        ),
      ),
    );
} finally {
  await db.$disconnect();
}
