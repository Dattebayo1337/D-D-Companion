import { requireAccount } from "@/services/accounts/service";
import { listMaps, mapCommand } from "@/services/maps/service";
import { errorResponse, readBody } from "@/shared/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireAccount(request);
    return Response.json(await listMaps(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireAccount(request);
    return Response.json(
      await mapCommand(
        JSON.parse(await readBody(request, 256 * 1024)),
        user.id,
      ),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "Неверный JSON." }, { status: 400 });
    return errorResponse(e);
  }
}
