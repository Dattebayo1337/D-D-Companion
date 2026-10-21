import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyCampaign, type CampaignEntry } from "../entities/campaign";
import {
  SessionDesk,
  sessionMaterials,
} from "../features/campaigns/SessionDesk";
function entry(kind: CampaignEntry["kind"], name: string): CampaignEntry {
  return {
    id: randomUUID(),
    kind,
    name,
    fields: {},
    notes: "",
    links: [],
    parentId: null,
    archived: false,
  };
}
test("Материалы сессии: прямые и обратные связи без чужих и архивных записей", () => {
  const session = entry("session", "Встреча"),
    npc = entry("npc", "Трактирщик"),
    location = entry("location", "Трактир"),
    hidden = entry("quest", "Архив"),
    unrelated = entry("npc", "Другой");
  session.links = [npc.id, hidden.id];
  location.links = [session.id];
  hidden.archived = true;
  const entries = [session, npc, location, hidden, unrelated];
  assert.deepEqual(
    sessionMaterials(entries, session.id).map((e) => e.id),
    [npc.id, location.id],
  );
  assert.deepEqual(sessionMaterials(entries, unrelated.id), []);
  session.archived = true;
  assert.deepEqual(sessionMaterials(entries, session.id), []);
});
test("Экран сессии показывает отдельные план, заметки и итоги, не подменяя заметки кампании", () => {
  const data = emptyCampaign("5e_2014"),
    session = entry("session", "Переправа");
  session.fields = { plan: "Осмотреть мост", summary: "Нашли проход" };
  session.notes = "Договор с проводником";
  data.notes = "Общая история мира";
  data.entries = [session];
  const html = renderToStaticMarkup(
    createElement(SessionDesk, {
      data,
      change: () => {},
      edit: () => {},
      create: () => {},
    }),
  );
  for (const text of [
    "Осмотреть мост",
    "Нашли проход",
    "Договор с проводником",
    "Общая история мира",
  ])
    assert.ok(html.includes(text));
  assert.equal((html.match(/<textarea/g) ?? []).length, 5);
});
