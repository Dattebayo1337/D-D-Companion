import { readFile } from "node:fs/promises";
import { db } from "../src/database/client";
import {
  parseDataset,
  importDataset,
  validateAgainstDatabase,
} from "../src/imports/pipeline";
import { auditDatabase } from "../src/services/manager";
async function main() {
  const [command, file] = process.argv.slice(2);
  if (command === "localization") {
    const report = await auditDatabase();
    console.log(JSON.stringify(report, null, 2));
    if (!report.valid) process.exitCode = 1;
    return;
  }
  if (!file) throw new Error("Укажите путь к JSON-набору.");
  const data = parseDataset(await readFile(file, "utf8"));
  if (command === "validate") {
    const report = await validateAgainstDatabase(data);
    console.log(JSON.stringify(report, null, 2));
    if (!report.valid) process.exitCode = 1;
  } else if (command === "import")
    console.log(JSON.stringify(await importDataset(data), null, 2));
  else throw new Error("Неизвестная команда.");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
