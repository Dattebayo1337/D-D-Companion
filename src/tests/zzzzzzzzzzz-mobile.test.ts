import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { GET } from "../app/api/mobile/status/route";
import { isPublicRequest } from "../services/lobby/access";
test("Mobile handshake is public without exposing private data", async () => {
  assert.deepEqual(await GET().json(), {
    application: "dnd-companion",
    protocol: 1,
  });
  assert.equal(isPublicRequest("/api/mobile/status", "GET"), true);
  assert.equal(isPublicRequest("/api/mobile/status", "POST"), false);
  assert.equal(isPublicRequest("/api/map-images", "GET"), false);
});
test("Android download hook handles detached export anchors, limits blob origin and preserves ordinary links", async () => {
  const posts: string[] = [],
    alerts: string[] = [],
    requests: string[] = [];
  let clicked = 0;
  class Anchor {
    href = "";
    download = "";
    hasAttribute() {
      return true;
    }
    click() {
      clicked++;
    }
  }
  class Reader {
    result = "data:application/json;base64,e30=";
    onload = () => {};
    readAsDataURL() {
      this.onload();
    }
  }
  const window: {
    CompanionFiles: unknown;
    print?: () => void;
    __companionSaveBlob?: (url: string, name: string) => Promise<void>;
  } = { CompanionFiles: { postMessage: (s: string) => posts.push(s) } };
  const context = {
    window,
    location: { origin: "https://game.example" },
    HTMLAnchorElement: Anchor,
    FileReader: Reader,
    document: { addEventListener: () => {} },
    alert: (s: string) => alerts.push(s),
    fetch: async (url: string) => {
      requests.push(url);
      return { blob: async () => ({ size: 2, type: "application/json" }) };
    },
  };
  const script = readFileSync(
    "android/app/src/main/assets/downloads.js",
    "utf8",
  );
  vm.runInNewContext(script, context);
  const anchor = new Anchor();
  anchor.href = "blob:https://game.example/123";
  anchor.download = "character.json";
  anchor.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(clicked, 0);
  assert.equal(JSON.parse(posts[0]).name, "character.json");
  anchor.href = "https://game.example/api/map-images/1?download=1";
  anchor.click();
  assert.equal(clicked, 1);
  await window.__companionSaveBlob!(
    "blob:https://evil.example/123",
    "bad.json",
  );
  assert.equal(requests.length, 1);
  assert.equal(alerts.length, 1);
  window.print!();
  assert.equal(posts.at(-1), "print");
});

test("iOS bridge supports detached exports, print and acknowledged offline storage; rejects foreign download origins", async () => {
  const posts: unknown[] = [],
    alerts: string[] = [],
    requests: string[] = [];
  let clicked = 0;
  class Anchor {
    href = "";
    download = "copy.json";
    downloadable = true;
    hasAttribute() {
      return this.downloadable;
    }
    click() {
      clicked++;
    }
  }
  class Reader {
    result = "data:application/json;base64,e30=";
    onload = () => {};
    readAsDataURL() {
      this.onload();
    }
  }
  const window = {
    top: null as unknown,
    webkit: {
      messageHandlers: {
        CompanionFiles: { postMessage: (value: unknown) => posts.push(value) },
        CompanionOffline: {
          postMessage: async (value: unknown) => {
            posts.push(value);
            return true;
          },
        },
      },
    },
    print: () => {},
    CompanionOffline: { save: async (value: unknown) => Boolean(value) && false },
  };
  window.top = window;
  vm.runInNewContext(readFileSync("ios/Companion/bridge.js", "utf8"), {
    window,
    URL,
    HTMLAnchorElement: Anchor,
    FileReader: Reader,
    location: { origin: "https://game.example" },
    document: { addEventListener: () => {} },
    alert: (message: string) => alerts.push(message),
    fetch: async (url: string) => {
      requests.push(url);
      return {
        ok: true,
        blob: async () => ({ size: 2, type: "application/json" }),
      };
    },
  });
  const a = new Anchor();
  a.href = "blob:https://game.example/123";
  a.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal((posts[0] as { name: string }).name, "copy.json");
  a.href = "https://evil.example/file";
  a.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 1);
  assert.equal(alerts.length, 1);
  a.downloadable = false;
  a.click();
  assert.equal(clicked, 1);
  window.print();
  assert.equal((posts.at(-1) as { action: string }).action, "print");
  assert.equal(await window.CompanionOffline.save({ id: "card" }), true);
});
