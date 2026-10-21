import { sources } from "@/database/repository";
import { errorResponse } from "@/shared/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await sources());
  } catch (e) {
    return errorResponse(e);
  }
}
