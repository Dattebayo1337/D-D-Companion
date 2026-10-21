import { db } from "@/database/client";
import { contentInclude, toContent } from "@/database/repository";
import { editionSchema } from "@/entities/content";
import { itemRarity, type LootItem } from "@/domain/rules/dm-tools";
import { errorResponse } from "@/shared/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const edition = editionSchema.parse(
      new URL(request.url).searchParams.get("edition"),
    );
    const rows = await db.content.findMany({
      where: {
        editionId: edition,
        kind: "Reference",
        translationStatus: "Approved",
        reference: { is: { category: "MagicItem" } },
      },
      include: contentInclude,
      orderBy: { id: "asc" },
    });
    const items: LootItem[] = [];
    for (const row of rows) {
      const entry = toContent(row);
      if (entry.kind !== "Reference") continue;
      const rarity = itemRarity(entry);
      if (rarity)
        items.push({
          id: entry.id,
          name: entry.nameRu,
          edition: entry.edition,
          rarity,
          sourceBookId: entry.sourceBookId,
        });
    }
    return Response.json({ items, excluded: rows.length - items.length });
  } catch (e) {
    return errorResponse(e);
  }
}
