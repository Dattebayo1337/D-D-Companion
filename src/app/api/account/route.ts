import {
  accountCommand,
  identity,
  ACCOUNT_COOKIE,
} from "@/services/accounts/service";
import {
  HOST_COOKIE,
  PLAYER_COOKIE,
  sessionCookie,
} from "@/services/lobby/auth";
import { errorResponse, readBody } from "@/shared/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return Response.json(
      { user: await identity(request) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const result = await accountCommand(
      request,
      JSON.parse(await readBody(request, 8192)),
    );
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (result.token || result.logout) {
      headers.append(
        "Set-Cookie",
        sessionCookie(
          request,
          ACCOUNT_COOKIE,
          result.token ?? "",
          result.logout ? 0 : undefined,
        ),
      );
      headers.append("Set-Cookie", sessionCookie(request, HOST_COOKIE, "", 0));
      if (result.logout)
        headers.append(
          "Set-Cookie",
          sessionCookie(request, PLAYER_COOKIE, "", 0),
        );
    }
    return Response.json(
      {
        ok: true,
        ...(result.recoveryCode ? { recoveryCode: result.recoveryCode } : {}),
      },
      { headers },
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "Неверный JSON." }, { status: 400 });
    return errorResponse(e);
  }
}
