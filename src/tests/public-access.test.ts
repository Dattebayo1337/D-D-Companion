import test from "node:test";
import assert from "node:assert/strict";
import { isPublicRequest } from "../services/lobby/access";
test("catalogs open without a session while writes and personal data stay protected", () => {
  for (const path of [
    "/",
    "/api/content",
    "/api/content/example",
    "/api/spells",
    "/api/monsters",
    "/api/sources",
    "/api/editions",
    "/api/overview",
    "/api/coverage",
    "/api/tools/loot-catalog",
  ]) {
    assert.equal(isPublicRequest(path, "GET"), true, path);
    assert.equal(isPublicRequest(path, "HEAD"), true, path);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      assert.equal(isPublicRequest(path, method), false, `${method} ${path}`);
  }
  for (const path of [
    "/api/campaigns",
    "/api/characters",
    "/api/battles",
    "/api/workshop",
    "/api/manager",
    "/campaigns/example",
    "/api/content/example/private",
    "/api/unknown",
  ])
    assert.equal(isPublicRequest(path, "GET"), false, path);
  assert.equal(isPublicRequest("/api/lobby", "POST"), true);
});
