import { referenceLabels } from "@/localization/reference";
import {
  BookOpen,
  House,
  Sparkles,
  Skull,
  Users,
  Swords,
  Library,
  Settings,
  Database,
  ChevronDown,
  Hexagon,
  Map,
  ScrollText,
  Layers,
  Shield,
  Star,
} from "lucide-react";
import type { Section } from "./types";
const primary = [
  { id: "home", label: "Главная", icon: House },
  { id: "readingShelf", label: "Под рукой", icon: Star },
  { id: "spells", label: "Заклинания", icon: Sparkles },
  { id: "monsters", label: "Бестиарий", icon: Skull },
  { id: "maps", label: "Карты", icon: Map },
] as const;
export function Sidebar({
  section,
  accountName,
  reference,
  navigate,
}: {
  section: Section;
  accountName?: string;
  reference: (category: keyof typeof referenceLabels) => void;
  navigate: (s: Section) => void;
  future: (name: string) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Hexagon size={34} />
        <div>
          D&D <b>COMPANION</b>
          <small>ВАША КНИГА ПРИКЛЮЧЕНИЙ</small>
        </div>
      </div>
      <div className="workspace">
        <span className="workspace-icon">
          <BookOpen size={19} />
        </span>
        <div>
          Общая библиотека<small>Правила и приключения</small>
        </div>
        <ChevronDown size={14} />
      </div>
      <nav aria-label="Основная навигация">
        <p className="nav-label">БИБЛИОТЕКА</p>
        {primary.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={section === id ? "nav-item active" : "nav-item"}
            onClick={() => navigate(id)}
          >
            <Icon size={19} />
            {label}
            {section === id && <span className="active-dot" />}
          </button>
        ))}
        <details className="nav-more">
          <summary>
            <Layers size={19} /> Справочник <ChevronDown size={14} />
          </summary>
          <div>
            {Object.entries(referenceLabels).map(([key, name]) => (
              <button
                key={key}
                onClick={() => reference(key as keyof typeof referenceLabels)}
              >
                {name}
              </button>
            ))}
          </div>
        </details>
        <p className="nav-label">ПРИКЛЮЧЕНИЯ</p>
        <button
          className={section === "lobby" ? "nav-item active" : "nav-item"}
          onClick={() => navigate("lobby")}
        >
          <Users size={19} />
          Общее лобби
        </button>
        <button
          className={section === "characters" ? "nav-item active" : "nav-item"}
          onClick={() => navigate("characters")}
        >
          <Users size={19} />
          Персонажи
        </button>
        <button
          className={section === "campaigns" ? "nav-item active" : "nav-item"}
          onClick={() => navigate("campaigns")}
        >
          <Map size={19} />
          Кампании
        </button>
        <button
          className={section === "battles" ? "nav-item active" : "nav-item"}
          onClick={() => navigate("battles")}
        >
          <Swords size={19} />
          Бои
        </button>
        <details className="nav-more">
          <summary>
            <ScrollText size={19} /> Инструменты мастера{" "}
            <ChevronDown size={14} />
          </summary>
          <div>
            <button
              className={section === "loot" ? "active" : ""}
              onClick={() => navigate("loot")}
            >
              Случайная добыча
            </button>
            <button
              className={section === "encounter" ? "active" : ""}
              onClick={() => navigate("encounter")}
            >
              Калькулятор боя
            </button>
            {(
              [
                { id: "npcs", name: "Неигровые персонажи" },
                { id: "quests", name: "Задания" },
                { id: "locations", name: "Локации" },
                { id: "sessions", name: "Журнал сессий" },
              ] as const
            ).map(({ id, name }) => (
              <button
                className={section === id ? "active" : ""}
                key={id}
                onClick={() => navigate(id)}
              >
                {name}
              </button>
            ))}
            <button
              className={section === "dmScreen" ? "active" : ""}
              onClick={() => navigate("dmScreen")}
            >
              Экран мастера
            </button>
          </div>
        </details>
        <p className="nav-label">ВАШЕ ПРОСТРАНСТВО</p>
        <button
          className={`nav-item ${section === "sources" ? "active" : ""}`}
          onClick={() => navigate("sources")}
        >
          <Library size={19} />
          Источники
        </button>
        <button
          className={`nav-item ${section === "manager" ? "active" : ""}`}
          onClick={() => navigate("manager")}
        >
          <Database size={19} />
          Менеджер данных
        </button>
        {(["workshop", "collections"] as const).map((name) => (
          <button
            key={name}
            className={`nav-item ${section === name ? "active" : ""}`}
            onClick={() => navigate(name)}
          >
            <Layers size={19} />
            {name === "workshop" ? "Авторский контент" : "Коллекции"}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <span>
          <Shield size={15} /> Личные данные — в аккаунте
        </span>
        <button
          className={`nav-item ${section === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Settings size={18} />
          Настройки
        </button>
        <div className="profile">
          <span>{accountName?.slice(0, 1) ?? "Г"}</span>
          <div>
            {accountName || "Гость"}
            <small>
              {accountName ? "Личный аккаунт" : "Справочники без входа"}
            </small>
          </div>
        </div>
      </div>
    </aside>
  );
}
