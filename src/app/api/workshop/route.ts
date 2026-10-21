import { requireAccount, requireAdmin } from "@/services/accounts/service";
import {
  listAuthors,
  saveAuthor,
  listCollections,
  saveCollection,
} from "@/services/workshop";
import { readBody, errorResponse } from "@/shared/http";
import { editionSchema } from "@/entities/content";
import { DatasetError } from "@/imports/pipeline";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await requireAccount(req);
    if (new URL(req.url).searchParams.get("mode") !== "collections")
      await requireAdmin(req);
    const p = new URL(req.url).searchParams;
    return Response.json(
      p.get("mode") === "collections"
        ? await listCollections(user.id)
        : await listAuthors(editionSchema.parse(p.get("edition"))),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    const user = await requireAccount(req);
    if (new URL(req.url).searchParams.get("mode") !== "collections")
      await requireAdmin(req);
    let input;
    try {
      input = JSON.parse(await readBody(req));
    } catch (e) {
      if (e instanceof SyntaxError)
        throw new DatasetError([
          { path: "file", message: "Некорректный JSON." },
        ]);
      throw e;
    }
    return Response.json(
      new URL(req.url).searchParams.get("mode") === "collections"
        ? await saveCollection(input, user.id)
        : await saveAuthor(input),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
