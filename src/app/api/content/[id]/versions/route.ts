import { z } from "zod";
import { contentVersions } from "@/services/content-versions";
import { errorResponse } from "@/shared/http";
import { db } from "@/database/client";
import { contentInclude, toContent } from "@/database/repository";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const items = await contentVersions(id);
    const row =
      items === null
        ? null
        : await db.content.findFirst({
            where: { id, translationStatus: "Approved" },
            include: contentInclude,
          });
    return !row
      ? Response.json({ error: "Запись не найдена." }, { status: 404 })
      : Response.json({ original: toContent(row), items });
  } catch (error) {
    return errorResponse(error);
  }
}
