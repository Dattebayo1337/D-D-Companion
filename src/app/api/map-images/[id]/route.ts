import { db } from "@/database/client";
import { requireAccount, AuthError } from "@/services/accounts/service";
import { errorResponse } from "@/shared/http";
import { imageMapSchema } from "@/entities/image-map";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAccount(request),
      { id } = await ctx.params,
      url = new URL(request.url),
      thumb = url.searchParams.get("thumbnail") === "1";
    const row = await db.imageMap.findFirst({
      where: { id, ownerId: user.id },
      select: { data: true, image: !thumb, thumbnail: thumb },
    });
    if (!row) throw new AuthError("Карта не найдена.", 404);
    const name = imageMapSchema.parse(row.data).name;
    return new Response(new Uint8Array(thumb ? row.thumbnail : row.image), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="map.png"; filename*=UTF-8''${encodeURIComponent(name + ".png").replace(/'/g, "%27")}`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
