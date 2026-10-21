import assert from "node:assert/strict";
const root = process.env.SMOKE_URL || "http://127.0.0.1:3000";
async function get(path) {
  const response = await fetch(root + path);
  assert.equal(response.status, 200, path);
  return response.json();
}
const overview = await get("/api/overview");
assert.equal(typeof overview.approved, "number");
const all = await get("/api/content");
assert.ok(Array.isArray(all.items));
for (const entry of all.items) {
  assert.equal(entry.translationStatus, "Approved");
  assert.ok(entry.nameRu);
}
for (const [endpoint, kind] of [
  ["spells", "Spell"],
  ["monsters", "Monster"],
]) {
  const data = await get(`/api/${endpoint}`);
  assert.ok(data.items.every((e) => e.kind === kind));
}
if (all.items[0]) {
  const one = await get("/api/content/" + all.items[0].id);
  assert.equal(one.id, all.items[0].id);
}
assert.equal((await fetch(root + "/api/content?page=-1")).status, 400);
assert.equal(
  (await fetch(root + "/api/content/10000000-0000-4000-8000-999999999999"))
    .status,
  404,
);
assert.equal(
  (
    await fetch(root + "/api/manager?action=import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    })
  ).status,
  400,
);
assert.equal(
  (
    await fetch(root + "/api/manager?action=reindex", {
      method: "POST",
      headers: { origin: "https://example.invalid" },
    })
  ).status,
  400,
);
const report = await get("/api/manager");
assert.ok(Array.isArray(report.localization));
const exported = await get("/api/manager?action=export");
assert.equal(exported.schemaVersion, 1);
const validation = await fetch(root + "/api/manager?action=validate", {
  method: "POST",
  headers: { origin: root, "content-type": "application/json" },
  body: JSON.stringify(exported),
});
assert.equal(validation.status, 200, "same-origin browser import");
assert.equal((await validation.json()).valid, true);
console.log(
  "HTTP smoke: списки, карточка, контракт экспорта и ошибочные запросы проверены.",
);
