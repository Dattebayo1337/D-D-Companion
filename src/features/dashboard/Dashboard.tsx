import {
  ArrowUpRight,
  BookOpen,
  Database,
  Sparkles,
  Skull,
  ArrowRight,
  ShieldCheck,
  Layers,
  Compass,
} from "lucide-react";
import type { Overview, Section } from "../shell/types";
export function Dashboard({
  stats,
  navigate,
}: {
  stats: Overview | null;
  navigate: (s: Section) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ВАШЕ ПРИКЛЮЧЕНИЕ НАЧИНАЕТСЯ ЗДЕСЬ</p>
          <h1>Всё для игры за одним столом.</h1>
          <p>Правила под рукой. Больше места для воображения.</p>
        </div>
        <span className="version-pill">
          <i /> Авторская мастерская · этап 5
        </span>
      </div>
      <section
        className="tabletop-shortcuts"
        aria-label="Быстрый доступ для игры"
      >
        <button className="panel" onClick={() => navigate("readingShelf")}>
          <h2>Мои правила</h2>
          <p>Избранное и недавно открытые карточки.</p>
        </button>
        <button className="panel" onClick={() => navigate("characters")}>
          <h2>Мои персонажи</h2>
          <p>Листы, заклинания, снаряжение и ресурсы.</p>
        </button>
        <button className="panel" onClick={() => navigate("sessions")}>
          <h2>Сессии мастера</h2>
          <p>План встречи, заметки и связанные материалы кампании.</p>
        </button>
      </section>
      <section className="welcome-banner">
        <div>
          <span className="overline">ОДНА БИБЛИОТЕКА. ДВЕ РЕДАКЦИИ.</span>
          <h2>
            Соберите свой
            <br />
            мир приключений
          </h2>
          <p>
            Заклинания, существа и ваши источники —<br />в едином пространстве
            на русском языке.
          </p>
          <button
            className="button ivory"
            onClick={() => navigate("readingShelf")}
          >
            Правила под рукой <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <svg viewBox="0 0 260 280">
            <path d="M130 20 232 82v120l-102 58-102-58V82Z M130 20v80L28 82m102 18 102-18M28 82l48 101 54-83 54 83 48-101M28 202l48-19 54 77 54-77 48 19M76 183h108" />
            <text x="130" y="164" textAnchor="middle">
              20
            </text>
          </svg>
          <span className="art-star star-one">✦</span>
          <span className="art-star star-two">✦</span>
          <span className="art-caption">КАЖДАЯ ИСТОРИЯ — ВАША</span>
        </div>
      </section>
      <div className="stats-grid">
        {[
          {
            label: "Заклинания",
            count: stats?.spells,
            icon: Sparkles,
            section: "spells",
          },
          {
            label: "Существа",
            count: stats?.monsters,
            icon: Skull,
            section: "monsters",
          },
          {
            label: "Источники",
            count: stats?.sources.length,
            icon: BookOpen,
            section: "sources",
          },
          {
            label: "Справочники",
            count: stats?.references,
            icon: Layers,
            section: "reference",
          },
        ].map(({ label, count, icon: Icon, section }) => (
          <button
            className="stat-card"
            onClick={() => navigate(section as Section)}
            key={label}
          >
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <ArrowUpRight className="stat-arrow" size={16} />
            <strong>{count ?? "—"}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>Откройте библиотеку</h2>
            <span>Всё важное рядом</span>
          </div>
          <div className="library-grid">
            <button
              className="library-card spell-card"
              onClick={() => navigate("spells")}
            >
              <div className="library-symbol">
                <Sparkles size={42} strokeWidth={1} />
                <span>✧</span>
              </div>
              <span className="mini-label">МАГИЯ И ВОЗМОЖНОСТИ</span>
              <h3>Заклинания</h3>
              <p>
                Найдите нужную магию по школе,
                <br />
                уровню и редакции.
              </p>
              <span className="text-link">
                Открыть книгу <ArrowRight size={16} />
              </span>
            </button>
            <button
              className="library-card monster-card"
              onClick={() => navigate("monsters")}
            >
              <div className="library-symbol">
                <Skull size={44} strokeWidth={1} />
                <span>✧</span>
              </div>
              <span className="mini-label">ОБИТАТЕЛИ ВАШЕГО МИРА</span>
              <h3>Бестиарий</h3>
              <p>
                Характеристики, способности
                <br />и действия существ.
              </p>
              <span className="text-link">
                Исследовать <ArrowRight size={16} />
              </span>
            </button>
          </div>
        </section>
        <section className="activity">
          <div className="section-heading">
            <h2>Ваши источники</h2>
            <button
              onClick={() => navigate("sources")}
              aria-label="Открыть источники"
            >
              <ArrowUpRight size={17} />
            </button>
          </div>
          {stats?.sources.length ? (
            stats.sources.slice(0, 3).map((source) => (
              <div className="source-mini" key={source.id}>
                <span>
                  <BookOpen size={18} />
                </span>
                <div>
                  <strong>{source.fullNameRu}</strong>
                  <small>
                    {source.edition === "5e_2014"
                      ? "Редакция 2014"
                      : "Редакция 2024"}{" "}
                    ·{" "}
                    {source.contentType === "Homebrew"
                      ? "Авторский набор"
                      : "Импорт"}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-mini">
              <BookOpen size={28} />
              <strong>Чистая страница</strong>
              <p>Добавьте первый разрешённый набор данных в свою библиотеку.</p>
            </div>
          )}
          <button
            className="button secondary full"
            onClick={() => navigate("manager")}
          >
            <Database size={16} /> Управление данными
          </button>
          <p className="license-note">
            <ShieldCheck size={15} /> Только ваши и разрешённые материалы
          </p>
        </section>
      </div>
      <div className="roadmap-note">
        <Compass size={22} />
        <div>
          <strong>Ведите свою историю</strong>
          <p>
            Создавайте персонажей, ведите листы, инвентарь и книгу заклинаний.
            Создавайте кампании, связывайте персонажей мастера, задания и
            локации, записывайте итоги сессий.
          </p>
        </div>
        <span>05 / 06</span>
      </div>
    </>
  );
}
