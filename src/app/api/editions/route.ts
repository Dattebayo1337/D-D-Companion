import { db } from "@/database/client";
import { errorResponse } from "@/shared/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await db.edition.findMany({ orderBy: { id: "asc" } }));
  } catch (e) {
    return errorResponse(e);
  }
}
