import { spawnSync, spawn } from "node:child_process";

if ((process.env.DND_HOST_KEY ?? "").length < 32) {
  console.error("Set DND_HOST_KEY to a persistent random secret of at least 32 characters.");
  process.exit(1);
}
const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit" });
if (migration.error || migration.status !== 0) process.exit(migration.status || 1);
const [command, ...args] = process.argv.slice(2);
if (!command) process.exit(1);
const child = spawn(command, args, { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => { console.error(error); process.exit(1); });
child.on("exit", (code, signal) => process.exit(code ?? (signal === "SIGTERM" ? 0 : 1)));
