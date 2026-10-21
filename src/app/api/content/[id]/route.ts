import { identity } from "@/services/accounts/service";
import { applyPersonalTranslations } from "@/services/personal-translations";
import { ownMonster } from "@/services/monsters/service";
import { z } from "zod";
import { db } from "@/database/client";
import { contentInclude, toContent } from "@/database/repository";
import { errorResponse } from "@/shared/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const row = await db.content.findFirst({
      where: { id, translationStatus: "Approved" },
      include: contentInclude,
    });
    const user = await identity(request);
    const personal = !row && user ? await ownMonster(id, user.id) : null;
    if (personal) return Response.json(personal);
    return row
      ? Response.json(
          user?.id
            ? await applyPersonalTranslations(toContent(row), user.id)
            : toContent(row),
          { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
        )
      : Response.json({ error: "Запись не найдена." }, { status: 404 });
  } catch (e) {
    return errorResponse(e);
  }
}
