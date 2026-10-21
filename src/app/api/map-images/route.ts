import { requireAccount, AuthError } from "@/services/accounts/service";
import {
  createImageMap,
  imageMapCommand,
  listImageMaps,
} from "@/services/maps/images";
import { checkOrigin, readBody, errorResponse } from "@/shared/http";
import { MAX_PNG_BYTES } from "@/entities/image-map";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const u = await requireAccount(request);
    return Response.json(await listImageMaps(u.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireAccount(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data"))
      return Response.json(
        await imageMapCommand(
          JSON.parse(await readBody(request, 64 * 1024)),
          user.id,
        ),
      );
    checkOrigin(request);
    const limit = MAX_PNG_BYTES + 128 * 1024;
    if (Number(request.headers.get("content-length")) > limit)
      throw new AuthError("PNG должен быть не больше 10 МБ.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new AuthError("Выберите PNG-файл.", 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new AuthError("PNG должен быть не больше 10 МБ.", 413);
      }
      chunks.push(value);
    }
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
        headers: { "Content-Type": contentType },
      }).formData();
    } catch {
      throw new AuthError("Не удалось прочитать загруженный файл.", 400);
    }
    const file = form.get("file"),
      data = form.get("data");
    if (
      !(file instanceof File) ||
      typeof data !== "string" ||
      file.size > MAX_PNG_BYTES
    )
      throw new AuthError("Выберите PNG до 10 МБ.", 400);
    return Response.json(
      await createImageMap(
        JSON.parse(data),
        new Uint8Array(await file.arrayBuffer()),
        user.id,
      ),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json(
        { error: "Неверное описание карты." },
        { status: 400 },
      );
    return errorResponse(e);
  }
}
