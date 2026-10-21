import { requireAccount } from "@/services/accounts/service";
import {
  catalog,
  listCharacters,
  characterCommand,
  CharacterError,
  rollAbilities,
} from "@/services/characters/service";
import { editionSchema } from "@/entities/content";
import { readBody, errorResponse, checkOrigin } from "@/shared/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireAccount(request);
    const url = new URL(request.url);
    const edition = editionSchema.parse(url.searchParams.get("edition"));
    return Response.json(
      url.searchParams.has("catalog")
        ? await catalog(edition)
        : await listCharacters(edition, user.id),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireAccount(request);
    checkOrigin(request);
    const body = JSON.parse(await readBody(request));
    if (body.action === "roll") return Response.json(rollAbilities());
    return Response.json(await characterCommand(body, user.id));
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "Неверный JSON." }, { status: 400 });
    if (e instanceof CharacterError)
      return Response.json({ error: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
