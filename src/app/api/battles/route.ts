import { requireAccount } from "@/services/accounts/service";
import {
  battleCommand,
  listBattles,
  BattleError,
} from "@/services/battles/service";
import { errorResponse, readBody } from "@/shared/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await requireAccount(request);
    return Response.json(await listBattles(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireAccount(request);
    return Response.json(
      await battleCommand(JSON.parse(await readBody(request)), user.id),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "Неверный JSON." }, { status: 400 });
    if (e instanceof BattleError)
      return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof Error && e.constructor === Error)
      return Response.json({ error: e.message }, { status: 400 });
    return errorResponse(e);
  }
}
