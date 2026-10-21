import { CampaignPage } from "@/features/lobby/CampaignPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CampaignPage id={(await params).id} />;
}
