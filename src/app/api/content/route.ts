import { identity } from "@/services/accounts/service";
import { searchWithCustom } from "@/services/monsters/search";
import { filtersSchema } from "@/search/service";
import { errorResponse } from "@/shared/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await identity(request);
    return Response.json(
      await searchWithCustom(
        filtersSchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
        user ? user.id : undefined,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
