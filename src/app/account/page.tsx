"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { requestJson } from "@/shared/client";
type User = {
  username: string;
  displayName: string;
  role: string;
  id: string | null;
};
export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    requestJson<{ user: User | null }>("/api/account")
      .then((r) => setUser(r.user))
      .catch((e) => setError(e.message));
  }, []);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    try {
      return await requestJson<{ recoveryCode?: string }>("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="lobby-page">
      <section className="lobby-panel login-panel">
        <p className="eyebrow">ЛИЧНЫЙ АККАУНТ</p>
        <h1>{user?.displayName ?? "Аккаунт"}</h1>
        {user && (
          <p>
            @{user.username} ·{" "}
            {user.role === "admin" ? "Администратор установки" : "Пользователь"}
          </p>
        )}
        <p>
          Вы — мастер созданных вами лобби и игрок в лобби, куда вас пригласили.
        </p>
        <div className="lobby-actions">
          <Link href="/">Библиотека</Link>
          <Link href="/play">Мои лобби</Link>
        </div>
        {code && (
          <section role="status">
            <h2>Новый резервный код</h2>
            <p>
              Сохраните его в менеджере паролей. Прежний код и все предыдущие
              сессии отключены.
            </p>
            <input
              aria-label="Новый резервный код"
              readOnly
              value={code}
              onFocus={(e) => e.currentTarget.select()}
            />
          </section>
        )}
        {user?.id ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (password !== confirm) {
                setError("Пароли не совпадают.");
                return;
              }
              const r = await action({
                action: "password",
                currentPassword,
                password,
              });
              if (r?.recoveryCode) {
                setCode(r.recoveryCode);
                setCurrentPassword("");
                setPassword("");
                setConfirm("");
              }
            }}
          >
            <h2>Сменить пароль</h2>
            <label>
              Текущий пароль
              <input
                required
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label>
              Новый пароль — минимум 12 символов
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Повторите новый пароль
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy}>
              Сменить пароль и завершить прежние сессии
            </button>
          </form>
        ) : (
          <Link href="/login">Создать личный аккаунт</Link>
        )}
        {error && (
          <p role="alert" className="lobby-error">
            {error}
          </p>
        )}
        <div className="lobby-actions">
          {(["logout", "logoutAll"] as const).map((value) => (
            <button
              className="button secondary"
              key={value}
              disabled={busy}
              onClick={async () => {
                if (await action({ action: value }))
                  window.location.replace(
                    new URL("/", window.location.origin).href,
                  );
              }}
            >
              {value === "logout" ? "Выйти" : "Выйти на всех устройствах"}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
