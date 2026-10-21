import { tabletopCommand, handoutImage } from "@/services/lobby/tabletop";
import {
  lobbyCommand,
  lobbyIndex,
  lobbyView,
  LobbyError,
} from "@/services/lobby/service";
import { errorResponse, readBody } from "@/shared/http";
import { PLAYER_COOKIE, sessionCookie } from "@/services/lobby/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const failure = (error: unknown) =>
  error instanceof LobbyError
    ? Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      )
    : error instanceof SyntaxError
      ? Response.json({ error: "Неверный JSON." }, { status: 400 })
      : errorResponse(error);
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.has("handout"))
      return await handoutImage(
        request,
        url.searchParams.get("id") ?? "",
        url.searchParams.get("handout") ?? "",
      );
    const data = url.searchParams.has("index")
      ? await lobbyIndex(request)
      : await lobbyView(request, url.searchParams.get("id") ?? undefined);
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = JSON.parse(await readBody(request));
    const result = await (body.action === "tabletop"
      ? tabletopCommand(request, body)
      : lobbyCommand(request, body));
    const headers: Record<string, string> = {
      "Cache-Control": "private, no-store",
    };
    if ("token" in result && typeof result.token === "string") {
      headers["Set-Cookie"] = sessionCookie(
        request,
        PLAYER_COOKIE,
        result.token,
      );
      return Response.json({ id: result.id }, { headers });
    }
    if (body.action === "leave")
      headers["Set-Cookie"] = sessionCookie(request, PLAYER_COOKIE, "", 0);
    return Response.json(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
