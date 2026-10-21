"use client";
import Link from "next/link";
import { Maps } from "../maps/Maps";
import { Workshop } from "../workshop/Workshop";
import { Collections } from "../workshop/Collections";
import { WorkshopNavigation } from "../workshop/navigation";
import type { Content } from "@/entities/content";
import { referenceLabels } from "@/localization/reference";
import { useEffect, useState } from "react";
import {
  Search,
  ChevronRight,
  Menu,
  House,
  Sparkles,
  Skull,
  Database,
  Compass,
  CircleHelp,
} from "lucide-react";
import { Battles } from "../battles/Battles";
import { DmScreen } from "../tools/DmScreen";
import { Campaigns } from "../campaigns/Campaigns";
import { Characters } from "../characters/Characters";
import { Lobby } from "../lobby/Lobby";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "../dashboard/Dashboard";
import { Compendium } from "../compendium/Compendium";
import { ReadingShelf } from "../compendium/ReadingShelf";
import { Subclasses } from "../compendium/Subclasses";
import { Loot } from "../tools/Loot";
import { Encounter } from "../tools/Encounter";
import { DataManager } from "../manager/DataManager";
import { Sources } from "../sources/Sources";
import { SettingsView } from "../settings/SettingsView";
import { requestJson } from "@/shared/client";
import type { Overview, Section, Settings } from "./types";
const titles: Record<Section, string> = {
  readingShelf: "Под рукой",
  maps: "Карты",
  lobby: "Общее лобби",
  workshop: "Мастерская автора",
  collections: "Коллекции",
  battles: "Бои",
  dmScreen: "Экран мастера",
  campaigns: "Кампании",
  npcs: "Персонажи мастера",
  quests: "Задания",
  locations: "Локации",
  sessions: "Сессии",
  loot: "Случайная добыча",
  encounter: "Калькулятор боя",
  characters: "Персонажи",
  home: "Главная",
  reference: "Справочники",
  spells: "Заклинания",
  monsters: "Бестиарий",
  sources: "Источники",
  manager: "Менеджер данных",
  settings: "Настройки",
  search: "Поиск",
  future: "Следующие этапы",
};
const initial: Settings = {
  theme: "light",
  showOriginal: false,
  metric: false,
};
export function Companion() {
  const [admin, setAdmin] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [host, setHost] = useState<boolean | null>(null);
  useEffect(() => {
    requestJson<{ user: { displayName: string; role: string } | null }>(
      "/api/account",
    )
      .then((data) => {
        setHost(Boolean(data.user));
        setAdmin(data.user?.role === "admin");
        setAccountName(data.user?.displayName ?? "");
      })
      .catch(() => setHost(false));
  }, []);
  const [cloneEntry, setCloneEntry] = useState<Content | null>(null);
  const [battleCampaignId, setBattleCampaignId] = useState<string | null>(null);
  const [category, setCategory] =
    useState<keyof typeof referenceLabels>("Class");
  const [section, setSection] = useState<Section>("home");
  const [edition, setEdition] = useState<"5e_2014" | "5e_2024">("5e_2024");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [future, setFuture] = useState("");
  const [settings, setSettings] = useState<Settings>(initial);
  const [stats, setStats] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    requestJson<Overview>("/api/overview")
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedEdition = localStorage.getItem("companion-edition");
        if (savedEdition === "5e_2014" || savedEdition === "5e_2024")
          setEdition(savedEdition);
        const value = JSON.parse(
          localStorage.getItem("companion-settings") ?? "null",
        );
        if (
          value &&
          ["light", "dark"].includes(value.theme) &&
          typeof value.showOriginal === "boolean" &&
          typeof value.metric === "boolean"
        )
          setSettings(value);
      } catch {
        /* Invalid preferences leave defaults intact. */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function changeSettings(s: Settings) {
    setSettings(s);
    try {
      localStorage.setItem("companion-settings", JSON.stringify(s));
    } catch {
      setError("Браузер не разрешил сохранить настройки.");
    }
  }
  function changeEdition(value: "5e_2014" | "5e_2024") {
    setEdition(value);
    try {
      localStorage.setItem("companion-edition", value);
    } catch {
      setError("Редакция выбрана, но браузер не разрешил сохранить выбор.");
    }
  }
  function navigate(s: Section) {
    if (s === "workshop") setCloneEntry(null);
    if (s === "battles") setBattleCampaignId(null);
    setCatalogQuery("");
    setSection(s);
    setQuery("");
    setInput("");
    setMobile(false);
  }
  const privateSection = [
    "characters",
    "campaigns",
    "npcs",
    "quests",
    "locations",
    "sessions",
    "battles",
    "workshop",
    "collections",
    "manager",
  ].includes(section);
  return (
    <WorkshopNavigation.Provider
      value={(entry) => {
        changeEdition(entry.edition);
        navigate("workshop");
        setCloneEntry(entry);
      }}
    >
      <div
        className={`app ${settings.theme === "dark" ? "dark" : ""} ${mobile ? "menu-open" : ""}`}
      >
        <Sidebar
          accountName={accountName}
          reference={(category) => {
            setCategory(category);
            navigate("reference");
          }}
          section={section}
          navigate={navigate}
          future={(name) => {
            setFuture(name);
            setSection("future");
            setMobile(false);
          }}
        />
        {mobile && (
          <button
            className="mobile-scrim"
            aria-label="Закрыть меню"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Открыть меню"
            >
              <Menu size={22} />
            </button>
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(input);
                setSection("search");
              }}
            >
              <Search size={19} />
              <input
                placeholder="Поиск по вашей библиотеке…"
                aria-label="Глобальный поиск"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" aria-label="Найти">
                ↵
              </button>
            </form>
            <div className="topbar-right">
              <Link
                className="quiet-button account-link"
                href={host ? "/account" : "/login"}
              >
                {host ? accountName || "Аккаунт" : "Войти / регистрация"}
              </Link>
              <span className="local-status">
                <i />
                {host ? "Аккаунт" : "Гость"}
              </span>
              <span className="topbar-divider" />
              <span className="edition-title">Редакция</span>
              <div
                className="edition-switch"
                role="group"
                aria-label="Редакция правил"
              >
                {(["5e_2014", "5e_2024"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={"Правила " + value.slice(3)}
                    aria-pressed={edition === value}
                    onClick={() => changeEdition(value)}
                  >
                    {value.slice(3)}
                  </button>
                ))}
              </div>
            </div>
          </header>
          <main>
            <div className="breadcrumb">
              <span>{host ? "Личное пространство" : "Библиотека"}</span>
              <ChevronRight size={13} />
              <strong>{titles[section]}</strong>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
                <button
                  className="quiet-button"
                  onClick={() => setRevision((v) => v + 1)}
                >
                  Повторить
                </button>
              </div>
            )}
            {["manager", "workshop"].includes(section) && host && !admin ? (
              <section className="lobby-panel">
                <h1>{titles[section]}</h1>
                <p>
                  Изменять общую библиотеку может администратор установки. Ваши
                  персонажи, коллекции, кампании и лобби доступны в
                  соответствующих разделах.
                </p>
              </section>
            ) : privateSection && !host ? (
              <section className="lobby-panel">
                <h1>{titles[section]}</h1>
                <p>
                  {host === null
                    ? "Проверяем доступ…"
                    : "Войдите или создайте аккаунт, чтобы хранить свои данные. Справочники можно читать без входа."}
                </p>
                {host === false && (
                  <a className="button primary" href="/login">
                    Войти / создать аккаунт
                  </a>
                )}
              </section>
            ) : (
              <>
                {section === "home" && (
                  <Dashboard stats={stats} navigate={navigate} />
                )}
                {section === "readingShelf" && (
                  <ReadingShelf
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "reference" && category === "Subclass" && (
                  <Subclasses
                    key={edition}
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {["spells", "monsters", "search", "reference"].includes(
                  section,
                ) &&
                  !(section === "reference" && category === "Subclass") && (
                    <Compendium
                      signedIn={Boolean(host)}
                      key={`${section}-${category}-${edition}-${query}`}
                      category={section === "reference" ? category : undefined}
                      kind={
                        section === "spells"
                          ? "Spell"
                          : section === "monsters"
                            ? "Monster"
                            : section === "reference"
                              ? "Reference"
                              : undefined
                      }
                      edition={edition}
                      query={query}
                      localQuery={catalogQuery}
                      onQueryChange={setCatalogQuery}
                      sources={stats?.sources ?? []}
                      settings={settings}
                    />
                  )}
                {(
                  [
                    "campaigns",
                    "npcs",
                    "quests",
                    "locations",
                    "sessions",
                  ] as string[]
                ).includes(section) && (
                  <Campaigns
                    openBattles={(id, rules) => {
                      if (rules) changeEdition(rules);
                      navigate("battles");
                      setBattleCampaignId(id);
                    }}
                    key={section}
                    edition={edition}
                    initialTab={
                      section === "npcs"
                        ? "npc"
                        : section === "quests"
                          ? "quest"
                          : section === "locations"
                            ? "location"
                            : section === "sessions"
                              ? "live"
                              : "overview"
                    }
                  />
                )}
                {section === "maps" && <Maps signedIn={Boolean(host)} />}
                {section === "lobby" && <Lobby />}
                {section === "characters" && (
                  <Characters
                    key={edition}
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "workshop" && (
                  <Workshop
                    key={`${edition}-${cloneEntry?.id ?? "own"}`}
                    edition={edition}
                    clone={cloneEntry}
                    sources={stats?.sources ?? []}
                    settings={settings}
                    refresh={() => setRevision((v) => v + 1)}
                  />
                )}
                {section === "collections" && (
                  <Collections
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "battles" && (
                  <Battles
                    key={`${edition}-${battleCampaignId}`}
                    edition={edition}
                    campaignId={battleCampaignId}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "dmScreen" && (
                  <DmScreen
                    key={edition}
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "loot" && (
                  <Loot
                    key={edition}
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "encounter" && (
                  <Encounter
                    openBattles={() => navigate("battles")}
                    key={edition}
                    edition={edition}
                    sources={stats?.sources ?? []}
                    settings={settings}
                  />
                )}
                {section === "manager" && (
                  <DataManager
                    stats={stats}
                    refresh={() => setRevision((v) => v + 1)}
                  />
                )}
                {section === "sources" && (
                  <Sources
                    sources={stats?.sources ?? []}
                    openManager={() => navigate("manager")}
                  />
                )}
                {section === "settings" && (
                  <SettingsView value={settings} change={changeSettings} />
                )}
                {section === "future" && (
                  <div className="empty-state future-state">
                    <Compass size={46} strokeWidth={1} />
                    <p className="eyebrow">ДОРОЖНАЯ КАРТА</p>
                    <h1>
                      {future === "Homebrew"
                        ? "Редактор авторского контента"
                        : future}
                    </h1>
                    <p>
                      Этот раздел запланирован на следующие этапы.
                      <br />
                      Уже доступны заклинания, бестиарий, справочники,
                      <br />
                      источники и менеджер данных.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => navigate("home")}
                    >
                      Вернуться в библиотеку
                    </button>
                  </div>
                )}
              </>
            )}
            <footer className="main-footer">
              <span>
                D&D Companion <span>·</span> Истории объединяют.
              </span>
              <span>
                <CircleHelp size={13} /> Версия · 0.5.0
              </span>
            </footer>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Мобильная навигация">
          {(
            [
              { id: "home", label: "Главная", Icon: House },
              { id: "spells", label: "Магия", Icon: Sparkles },
              { id: "monsters", label: "Существа", Icon: Skull },
              { id: "manager", label: "Данные", Icon: Database },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </WorkshopNavigation.Provider>
  );
}
