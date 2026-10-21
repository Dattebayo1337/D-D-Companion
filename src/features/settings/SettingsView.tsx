import { Moon, Sun, Languages, Ruler } from "lucide-react";
import type { Settings } from "../shell/types";
import { BrowserBackup } from "./BrowserBackup";
export function SettingsView({
  value,
  change,
}: {
  value: Settings;
  change: (s: Settings) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">УДОБНО ИМЕННО ВАМ</p>
          <h1>Настройки</h1>
          <p>Личное оформление и отображение игровых данных.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="setting-row">
          <Sun size={22} />
          <div>
            <h3>Оформление</h3>
            <p>Светлая бумага или тёмный графит с медными акцентами.</p>
          </div>
          <div className="segmented">
            <button
              className={value.theme === "light" ? "selected" : ""}
              onClick={() => change({ ...value, theme: "light" })}
            >
              <Sun size={16} />
              Светлая
            </button>
            <button
              className={value.theme === "dark" ? "selected" : ""}
              onClick={() => change({ ...value, theme: "dark" })}
            >
              <Moon size={16} />
              Тёмная
            </button>
          </div>
        </div>
        <div className="setting-row">
          <Languages size={22} />
          <div>
            <h3>Оригинальные названия</h3>
            <p>Показывать английское название под русским.</p>
          </div>
          <input
            type="checkbox"
            aria-label="Оригинальные названия"
            checked={value.showOriginal}
            onChange={(e) =>
              change({ ...value, showOriginal: e.target.checked })
            }
          />
        </div>
        <div className="setting-row">
          <Ruler size={22} />
          <div>
            <h3>Метрические единицы</h3>
            <p>Отображать метры. Исходные значения не изменяются.</p>
          </div>
          <input
            type="checkbox"
            aria-label="Метрические единицы"
            checked={value.metric}
            onChange={(e) => change({ ...value, metric: e.target.checked })}
          />
        </div>
      </section>
      <p className="muted-copy">
        Настройки сохраняются в этом браузере. Игровые данные хранятся в
        локальной базе сервера.
      </p>
      <BrowserBackup />
    </>
  );
}
