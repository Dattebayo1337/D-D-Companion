import { requireAdmin } from "@/services/accounts/service";
import { NextResponse } from "next/server";
import {
  parseDataset,
  importDataset,
  validateAgainstDatabase,
} from "@/imports/pipeline";
import { auditDatabase, exportDataset, reindex } from "@/services/manager";
import { checkOrigin, errorResponse, readBody } from "@/shared/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const action = new URL(request.url).searchParams.get("action");
    if (action === "export")
      return NextResponse.json(await exportDataset(), {
        headers: {
          "Content-Disposition":
            'attachment; filename="companion-dataset.json"',
        },
      });
    return NextResponse.json(await auditDatabase());
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    checkOrigin(request);
    const action = new URL(request.url).searchParams.get("action");
    if (action === "reindex") return NextResponse.json(await reindex());
    const data = parseDataset(await readBody(request));
    if (action === "validate")
      return NextResponse.json(await validateAgainstDatabase(data));
    if (action !== "import")
      return NextResponse.json(
        { error: "Неизвестная операция." },
        { status: 400 },
      );
    return NextResponse.json(await importDataset(data));
  } catch (e) {
    return errorResponse(e);
  }
}
