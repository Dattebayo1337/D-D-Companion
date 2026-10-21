import { requireAccount } from "@/services/accounts/service";
import {
  listCampaigns,
  campaignCommand,
  CampaignError,
} from "@/services/campaigns/service";
import { readBody, errorResponse } from "@/shared/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await requireAccount(request);
    return Response.json(await listCampaigns(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireAccount(request);
    return Response.json(
      await campaignCommand(JSON.parse(await readBody(request)), user.id),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "Неверный JSON." }, { status: 400 });
    if (e instanceof CampaignError)
      return Response.json({ error: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
