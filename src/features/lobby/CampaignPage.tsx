"use client";
import { Campaigns } from "../campaigns/Campaigns";
export function CampaignPage({ id }: { id: string }) {
  return (
    <main className="lobby-page">
      <a className="button secondary" href="/play">
        Вернуться в лобби
      </a>
      <Campaigns
        initialCampaignId={id}
        edition="5e_2014"
        openBattles={() =>
          window.location.replace(new URL("/", window.location.origin).href)
        }
      />
    </main>
  );
}
