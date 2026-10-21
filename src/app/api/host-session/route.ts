import { readBody, errorResponse } from "@/shared/http";
import {
  equalSecret,
  hostKey,
  hostSession,
  HOST_COOKIE,
  sessionCookie,
} from "@/services/lobby/auth";
import { identity, rateLimit } from "@/services/accounts/service";
import { db } from "@/database/client";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return Response.json(
    { host: Boolean(await identity(request)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    const body = z
      .object({
        key: z.string().max(256).optional(),
        logout: z.boolean().optional(),
      })
      .strict()
      .parse(JSON.parse(await readBody(request)));
    if (body.logout)
      return Response.json(
        { ok: true },
        {
          headers: { "Set-Cookie": sessionCookie(request, HOST_COOKIE, "", 0) },
        },
      );
    await rateLimit("legacy-key-login", 5, 15 * 60000);
    if (await db.account.count({ where: { role: "admin" } }))
      return Response.json(
        { error: "Войдите по логину и паролю." },
        { status: 403 },
      );
    if (!body.key || !equalSecret(body.key.trim(), hostKey()))
      return Response.json(
        { error: "Неверный ключ мастера." },
        { status: 401 },
      );
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": sessionCookie(request, HOST_COOKIE, hostSession()),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
