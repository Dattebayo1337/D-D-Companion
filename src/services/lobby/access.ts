/** Catalog reads do not authorize mutations or private data. */
export function isPublicRequest(path: string, method: string): boolean {
  if (["/api/lobby", "/api/host-session", "/api/account"].includes(path))
    return true;
  if (!["GET", "HEAD"].includes(method)) return false;
  return (
    [
      "/",
      "/offline.html",
      "/offline-reader.js",
      "/offline-reader.css",
      "/offline-sw.js",
      "/login",
      "/play",
      "/icon.svg",
      "/favicon.ico",
      "/api/content",
      "/api/spells",
      "/api/monsters",
      "/api/sources",
      "/api/editions",
      "/api/overview",
      "/api/mobile/status",
      "/api/coverage",
      "/api/tools/loot-catalog",
    ].includes(path) ||
    /^\/api\/content\/[^/]+$/.test(path) ||
    /^\/api\/content\/[0-9a-f-]{36}\/versions$/i.test(path) ||
    path.startsWith("/_next/static/")
  );
}
