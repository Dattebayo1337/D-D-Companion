import { useState } from "react";
import {
  campaignLabels,
  type CampaignData,
  type CampaignEntry,
} from "@/entities/campaign";
import { searchCampaign } from "@/domain/campaign-search";
export function CampaignSearch({
  data,
  edit,
}: {
  data: CampaignData;
  edit: (e: CampaignEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const results = searchCampaign(data, query, archived);
  const general =
    query.trim() &&
    [data.notes, data.description, data.calendar]
      .join(" ")
      .toLocaleLowerCase("ru")
      .includes(query.trim().toLocaleLowerCase("ru"));
  return (
    <details className="tool-panel">
      <summary>Поиск во всей кампании</summary>
      <p>
        Поиск включает личные заметки и секреты мастера. Результаты не
        публикуются игрокам.
      </p>
      <label>
        Имя, место или фраза
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Включить архив
      </label>
      {general && (
        <p>
          Совпадение в общих заметках, описании или календаре — откройте вкладку
          обзора.
        </p>
      )}
      {query.trim() && <p>Найдено записей: {results.length}</p>}
      {results.map((e) => (
        <button className="campaign-session" key={e.id} onClick={() => edit(e)}>
          {campaignLabels[e.kind]} · {e.name}
          {e.archived ? " · архив" : ""}
        </button>
      ))}
    </details>
  );
}
