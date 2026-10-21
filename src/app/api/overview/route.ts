import { identity } from "@/services/accounts/service";
import { NextResponse } from "next/server";
import { overview } from "@/services/manager";
import { errorResponse } from "@/shared/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const data = await overview();
    return NextResponse.json(
      (await identity(request))?.role === "admin"
        ? data
        : { ...data, imports: [] },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
