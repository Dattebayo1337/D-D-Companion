import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { datasetSchema } from "../entities/content";
import {
  emptyCampaign,
  campaignSchema,
  type CampaignEntry,
} from "../entities/campaign";
import { offlineCard } from "../domain/offline-card";
import { searchCampaign } from "../domain/campaign-search";
import { SessionDesk } from "../features/campaigns/SessionDesk";
import { isPublicRequest } from "../services/lobby/access";
test("Автономная карточка сохраняет все истории духов, источник, редакцию и ограничения обзора", () => {
  const entry = datasetSchema
    .parse(JSON.parse(readFileSync("data/dndsu/options-2014.json", "utf8")))
    .entries.find((e) => e.nameOriginal === "College of Spirits")!;
  const result = offlineCard(entry);
  assert.equal(result.edition, "5e_2014");
  assert.equal(result.source, entry.source);
  const text = result.blocks.map((b) => b.text).join("\n");
  for (let n = 1; n <= 12; n++) assert.ok(text.includes(`| ${n} |`));
  assert.throws(() =>
    offlineCard({ ...entry, translationStatus: "MachineDraft" }),
  );
  assert.throws(() =>
    offlineCard({ ...entry, personalText: { secret: "private" } } as never),
  );
  assert.ok(isPublicRequest("/offline-sw.js", "GET"));
  assert.equal(isPublicRequest("/offline-sw.js", "POST"), false);
});
test("Кампания: поиск всех типов, архив по выбору, предыдущая встреча и новые поля проходят схему", () => {
  const entry = (name: string, kind: CampaignEntry["kind"]): CampaignEntry => ({
    id: randomUUID(),
    name,
    kind,
    fields: {},
    notes: "",
    links: [],
    parentId: null,
    archived: false,
  });
  const data = emptyCampaign("5e_2014");
  const first = entry("Первая встреча", "session");
  first.fields = {
    summary: "Нашли проход",
    goal: "Дойти до моста",
    questions: "Где проводник?",
  };
  const last = entry("Вторая встреча", "session");
  const npc = entry("Проводник", "npc");
  npc.fields.secrets = "Живёт у моста";
  const archived = entry("Архив", "location");
  archived.notes = "моста";
  archived.archived = true;
  data.entries = [first, npc, archived, last];
  campaignSchema.parse(data);
  assert.equal(searchCampaign(data, "живет моста")[0].id, npc.id);
  assert.equal(searchCampaign(data, "моста").length, 2);
  assert.equal(searchCampaign(data, "моста", true).length, 3);
  const html = renderToStaticMarkup(
    createElement(SessionDesk, {
      data,
      change: () => {},
      edit: () => {},
      create: () => {},
    }),
  );
  assert.match(html, /На чём остановились/);
  assert.match(html, /Нашли проход/);
  assert.match(html, /Где проводник/);
  assert.match(html, /Памятка встречи мастеру/);
});
