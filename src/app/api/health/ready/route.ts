import { db } from "@/database/client";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    // Read real application tables through Prisma, not just a web-process probe.
    await db.$queryRaw`SELECT (SELECT id FROM Account LIMIT 1) AS account, (SELECT id FROM Content LIMIT 1) AS content`;
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
