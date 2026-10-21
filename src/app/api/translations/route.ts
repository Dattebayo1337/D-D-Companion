import { z } from "zod";
import { AuthError, requireAccount } from "@/services/accounts/service";
import {
  personalTranslations,
  savePersonalTranslation,
} from "@/services/personal-translations";
import { errorResponse, readBody } from "@/shared/http";
export async function GET(request: Request) {
  try {
    const user = await requireAccount(request);
    if (!user.id) throw new AuthError("Войдите в личный аккаунт.");
    const id = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("entityId"));
    return Response.json(await personalTranslations(id, user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireAccount(request);
    if (!user.id) throw new AuthError("Войдите в личный аккаунт.");
    return Response.json(
      await savePersonalTranslation(
        JSON.parse(await readBody(request, 220000)),
        user.id,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return e instanceof SyntaxError
      ? Response.json({ error: "Некорректный JSON." }, { status: 400 })
      : errorResponse(e);
  }
}
