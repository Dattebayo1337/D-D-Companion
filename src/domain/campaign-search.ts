import type { CampaignData } from "@/entities/campaign";
export function searchCampaign(
  data: CampaignData,
  query: string,
  archived = false,
) {
  const normalize = (s: string) =>
    s.toLocaleLowerCase("ru").replaceAll("ё", "е");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return data.entries.filter(
    (e) =>
      (archived || !e.archived) &&
      words.every((w) =>
        normalize(
          [e.name, e.notes, ...Object.values(e.fields)].join(" "),
        ).includes(w),
      ),
  );
}
