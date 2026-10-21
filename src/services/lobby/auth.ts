import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export const HOST_COOKIE = "dnd_host";
export const PLAYER_COOKIE = "dnd_player";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const secretToken = () => randomBytes(32).toString("base64url");
export function hostKey() {
  if (process.env.DND_HOST_KEY) {
    if (process.env.DND_HOST_KEY.length < 32)
      throw Error("DND_HOST_KEY must contain at least 32 characters");
    return process.env.DND_HOST_KEY;
  }
  const directory = join(process.cwd(), ".local");
  const file = join(directory, "host-key.txt");
  mkdirSync(directory, { recursive: true });
  try {
    writeFileSync(file, secretToken(), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return readFileSync(file, "utf8").trim();
}
export function cookieValue(request: Request, name: string) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + "="))
      ?.slice(name.length + 1) ?? ""
  );
}
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
}
const signature = (value: string) =>
  createHmac("sha256", hostKey()).update(value).digest("base64url");
export function hostSession() {
  const value = `${Date.now() + SESSION_SECONDS * 1000}.${secretToken()}`;
  return `${value}.${signature(value)}`;
}
export function isHost(request: Request) {
  const parts = cookieValue(request, HOST_COOKIE).split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    Number(parts[0]) <= Date.now()
  )
    return false;
  return equalSecret(signature(parts.slice(0, 2).join(".")), parts[2]);
}
export function sessionCookie(
  request: Request,
  name: string,
  token: string,
  age = SESSION_SECONDS,
) {
  // Public deployments set APP_ORIGIN to their HTTPS origin; never infer it from client headers.
  const secure =
    process.env.APP_ORIGIN?.startsWith("https://") ||
    new URL(request.url).protocol === "https:";
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
}
