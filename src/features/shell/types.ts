import type { SourceBook } from "@/entities/content";
export type Section =
  | "readingShelf"
  | "maps"
  | "lobby"
  | "workshop"
  | "collections"
  | "battles"
  | "dmScreen"
  | "campaigns"
  | "npcs"
  | "quests"
  | "locations"
  | "sessions"
  | "loot"
  | "encounter"
  | "characters"
  | "reference"
  | "home"
  | "spells"
  | "monsters"
  | "sources"
  | "manager"
  | "settings"
  | "search"
  | "future";
export type Overview = {
  references: number;
  spells: number;
  monsters: number;
  approved: number;
  drafts: number;
  sources: SourceBook[];
  imports: { id: string; name: string; count: number; importedAt: string }[];
};
export type Settings = {
  theme: "light" | "dark";
  showOriginal: boolean;
  metric: boolean;
};
