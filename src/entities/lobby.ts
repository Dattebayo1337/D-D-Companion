import type { Tabletop } from "./tabletop";
import { z } from "zod";
import type { CharacterData } from "./character";
import type { CampaignData } from "./campaign";
import type { Content } from "./content";
export const lobbySettings = z
  .object({
    name: z.string().trim().min(1).max(120),
    campaignId: z.string().uuid().nullable(),
    characterIds: z
      .array(z.string().uuid())
      .max(30)
      .refine((ids) => new Set(ids).size === ids.length),
    notes: z.string().max(20000),
  })
  .strict();
export type LobbySettings = z.infer<typeof lobbySettings>;
export type LobbyView = {
  id: string;
  name: string;
  version: number;
  role: "Мастер" | "Игрок";
  memberName: string;
  characters: { id: string; version: number; data: CharacterData }[];
  content: Content[];
  tabletop: Tabletop;
  participants: { id: string; name: string }[];
  master?: { settings: LobbySettings; campaign: CampaignData | null };
};
export type LobbyIndex = {
  lobbies: { id: string; name: string; closed: boolean }[];
  characters: { id: string; name: string; edition: string }[];
  campaigns: { id: string; name: string; characterIds: string[] }[];
};
